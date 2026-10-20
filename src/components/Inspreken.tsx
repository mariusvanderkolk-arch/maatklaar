import { useEffect, useRef, useState } from 'react'
import { Check, Info, Mic, MicOff, Sparkles } from 'lucide-react'
import { Button, Dialog } from './ui'
import { useCloud } from '../lib/cloud/sync'
import { ga } from '../lib/router'
import { AFVAL_SOORTEN } from '../lib/calc'
import { isAndroid, plakVast, transcriptUit } from '../lib/spraak'
import { verwerkInspraak, type Inspraak } from '../lib/inspraak'
import { ruimte, SCOPE_BASIS } from '../lib/ruimtes'
import type { ProjectType } from '../lib/types'

export const VOORBEELD_ZIN = 'Badkamer 2 bij 3 meter, tegels tot plafond, inloopdouche, toilet vervangen, container 6 kuub.'

type SR = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null }
const spraakKlasse = () => (typeof window !== 'undefined' ? ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => SR) | undefined : undefined)

const nl = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 2 })

/** Leesbare samenvatting van wat er herkend is. */
export function samenvattingInspraak(r: Inspraak, type: ProjectType): string[] {
  const t = r.type ?? type
  const naam = (k: keyof typeof SCOPE_BASIS) => ruimte(t).teksten?.[k]?.label ?? SCOPE_BASIS[k].label
  const regels: string[] = []
  if (r.type) regels.push(`Ruimte: ${ruimte(r.type).label}`)
  if (r.lengte || r.breedte) regels.push(`Maten: ${r.lengte ? nl(r.lengte) : '?'} × ${r.breedte ? nl(r.breedte) : '?'} m`)
  if (r.hoogte) regels.push(`Plafondhoogte: ${nl(r.hoogte)} m`)
  if (r.tegelhoogte) regels.push(`Tegels tot: ${r.tegelhoogte === 'plafond' ? 'plafond' : `${nl(r.tegelhoogte)} m`}`)
  const toegestaan = new Set(ruimte(t).werk)
  const aan = r.aan.filter((k) => toegestaan.has(k))
  if (aan.length) regels.push(`Aan: ${aan.map(naam).join(', ')}`)
  const uit = r.uit.filter((k) => toegestaan.has(k))
  if (uit.length) regels.push(`Uit: ${uit.map(naam).join(', ')}`)
  const genegeerd = [...r.aan, ...r.uit].filter((k) => !toegestaan.has(k))
  if (genegeerd.length) regels.push(`Niet van toepassing bij ${ruimte(t).label.toLowerCase()}: ${genegeerd.map((k) => SCOPE_BASIS[k].label).join(', ')}`)
  if (r.wandtegel) regels.push(`Wandtegels: ${nl(r.wandtegel.breedte)} × ${nl(r.wandtegel.lengte)} cm`)
  if (r.vloertegel) regels.push(`Vloertegels: ${nl(r.vloertegel.breedte)} × ${nl(r.vloertegel.lengte)} cm`)
  if (r.container) regels.push(`Container: ${r.container.maat ? `${r.container.maat} m³` : 'maat automatisch'}${r.container.soort ? `, ${AFVAL_SOORTEN[r.container.soort].naam.toLowerCase()}` : ''}`)
  if (r.klant) regels.push(`Klant: ${r.klant}`)
  if (r.notitie) regels.push(`Notitie: ${r.notitie}`)
  return regels
}

export function InsprekenKnop({ type, onToepassen, className = '' }: { type: ProjectType; onToepassen: (r: Inspraak) => void; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" size="sm" className={className} icon={<Mic className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Inspreken
      </Button>
      {open && <InsprekenDialoog type={type} onClose={() => setOpen(false)} onToepassen={(r) => (onToepassen(r), setOpen(false))} />}
    </>
  )
}

function InsprekenDialoog({ type, onClose, onToepassen }: { type: ProjectType; onClose: () => void; onToepassen: (r: Inspraak) => void }) {
  const [tekst, setTekst] = useState('')
  const cloud = useCloud()
  const [luistert, setLuistert] = useState(false)
  const [micFout, setMicFout] = useState('')
  const [bezig, setBezig] = useState(false)
  const [uitkomst, setUitkomst] = useState<{ r: Inspraak; bron: 'ai' | 'regels' } | null>(null)
  const sr = useRef<SR | null>(null)
  const Klasse = spraakKlasse()
  useEffect(() => () => ((gewenst.current = false), sr.current?.stop()), [])

  // vast = tekst van eerdere sessies/typen; sessie = definitieve tekst van de lopende sessie
  const vast = useRef('')
  const sessie = useRef('')
  const gewenst = useRef(false)
  const android = isAndroid()

  const sessieStarten = (r: SR) => {
    sessie.current = ''
    try {
      r.start()
      return true
    } catch {
      return false
    }
  }
  const start = () => {
    if (!Klasse) return
    setMicFout('')
    const r = new Klasse()
    r.lang = 'nl-NL'
    // Android herhaalt resultaten bij continuous; daar per zin een korte sessie en automatisch herstarten.
    r.continuous = !android
    r.interimResults = true
    vast.current = tekst.trim()
    r.onresult = (e) => {
      const { definitief, tussen } = transcriptUit(e.results)
      sessie.current = definitief
      setTekst(plakVast(plakVast(vast.current, definitief), tussen).slice(0, 600))
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      gewenst.current = false
      setMicFout(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Geen toegang tot de microfoon. Typ je omschrijving hieronder, of open Maatklaar in Chrome/Safari.' : 'Spraakherkenning lukte niet. Typ je omschrijving hieronder.')
    }
    r.onend = () => {
      // sessietekst één keer vastleggen; daarna niet opnieuw toevoegen
      vast.current = plakVast(vast.current, sessie.current)
      sessie.current = ''
      setTekst(vast.current.slice(0, 600))
      if (gewenst.current && sr.current === r && sessieStarten(r)) return
      gewenst.current = false
      setLuistert(false)
    }
    sr.current = r
    gewenst.current = true
    if (sessieStarten(r)) setLuistert(true)
    else {
      gewenst.current = false
      setMicFout('Spraakherkenning is niet beschikbaar. Typ je omschrijving hieronder.')
    }
  }
  const stop = () => {
    gewenst.current = false
    sr.current?.stop()
    setLuistert(false)
  }
  const verwerk = async () => {
    stop()
    setBezig(true)
    setUitkomst(await verwerkInspraak(tekst))
    setBezig(false)
  }

  if (uitkomst) {
    const regels = samenvattingInspraak(uitkomst.r, type)
    return (
      <Dialog
        open
        onClose={onClose}
        title="Klopt dit?"
        sub={uitkomst.bron === 'ai' ? 'Herkend met slimme herkenning (Gemini). Controleer en pas daarna zo nodig aan.' : 'Herkend met de eenvoudige herkenning op je toestel. Controleer en pas daarna zo nodig aan.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setUitkomst(null)}>
              Terug
            </Button>
            <Button icon={<Check className="h-4 w-4" />} disabled={!regels.length} onClick={() => onToepassen(uitkomst.r)}>
              Toepassen
            </Button>
          </>
        }
      >
        <p className="mb-3 rounded-xl bg-sand-50 px-3.5 py-2.5 text-[0.84rem] italic text-ink-soft ring-1 ring-sand-200">“{tekst.trim()}”</p>
        {regels.length ? (
          <ul className="space-y-1.5 text-[0.9rem]" data-testid="inspraak-uitkomst">
            {regels.map((r) => (
              <li key={r} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Er is niets herkend. Ga terug en probeer het met ruimte, maten en onderdelen, bijvoorbeeld: “{VOORBEELD_ZIN}”</p>
        )}
        <p className="mt-3 text-xs text-ink-muted">Bij toepassen worden alleen deze punten aangepast; de rest van je project blijft staan.</p>
      </Dialog>
    )
  }

  if (!cloud.gebruiker) {
    return (
      <Dialog
        open
        onClose={onClose}
        title="Inspreken"
        sub="Vertel wat er moet gebeuren; Maatklaar vult de ruimte, maten en onderdelen voor je in."
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Later
            </Button>
            <Button
              icon={<Mic className="h-4 w-4" />}
              onClick={() => {
                onClose()
                ga('/account')
              }}
            >
              Inloggen
            </Button>
          </>
        }
      >
        <div data-testid="inspraak-inloggen" className="rounded-2xl bg-gold-100/60 px-4 py-4 text-[0.92rem] leading-relaxed text-ink ring-1 ring-gold-300">
          <p className="font-semibold">Log in (gratis) om in te spreken</p>
          <p className="mt-1 text-ink-soft">
            Inspreken gebruikt slimme herkenning op onze server. Met een gratis account werkt het direct.{' '}
            <a href="#/account" onClick={onClose} className="font-medium text-ink underline underline-offset-4">
              Inloggen of account maken
            </a>
          </p>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Inspreken"
      sub="Vertel wat er moet gebeuren; Maatklaar vult de ruimte, maten en onderdelen voor je in."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button icon={<Sparkles className="h-4 w-4" />} disabled={!tekst.trim() || bezig} onClick={verwerk}>
            {bezig ? 'Bezig…' : 'Verwerken'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {Klasse ? (
          <button
            type="button"
            onClick={luistert ? stop : start}
            aria-pressed={luistert}
            className={`flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-[0.95rem] font-semibold ring-1 transition ${luistert ? 'animate-pulse bg-rust/10 text-rust ring-rust/30' : 'bg-gold-100 text-gold-800 ring-gold-300 hover:bg-gold-200/70'}`}
          >
            {luistert ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {luistert ? 'Stoppen met luisteren' : 'Tik en spreek in'}
          </button>
        ) : (
          <p className="rounded-xl bg-sand-50 px-3.5 py-2.5 text-[0.8rem] text-ink-soft ring-1 ring-sand-200">
            Inspreken werkt niet in deze browser (vaak in de WhatsApp- of Facebook-browser). Typ hieronder, of gebruik de microfoonknop van je toetsenbord.
          </p>
        )}
        {micFout && <p className="text-[0.8rem] text-rust">{micFout}</p>}
        <textarea
          rows={4}
          aria-label="Omschrijving van het project"
          value={tekst}
          onChange={(e) => setTekst(e.target.value.slice(0, 600))}
          placeholder={VOORBEELD_ZIN}
          className="w-full rounded-xl border border-sand-300 bg-white/90 px-3.5 py-2.5 text-[0.92rem] placeholder:text-ink-muted/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
        />
        <div className="rounded-xl bg-sand-50 px-3.5 py-3 text-[0.78rem] leading-relaxed text-ink-soft ring-1 ring-sand-200">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <Info className="h-3.5 w-3.5 text-gold-600" /> Zo werkt het
          </p>
          <p className="mt-1">
            Noem de ruimte, de maten (“2 bij 3 meter”), wat er moet gebeuren en eventueel de container. Bijvoorbeeld: <em>“{VOORBEELD_ZIN}”</em> Daarna zie je eerst wat er herkend is.
          </p>
          <p className="mt-1.5">
            Privacy: er wordt geen geluid opgeslagen. Je browser zet de spraak om in tekst (in Chrome gebeurt dat via Google). Die tekst gaat naar Google Gemini om hem te begrijpen; Maatklaar bewaart hem niet. Werkt dat niet, dan herkent Maatklaar de tekst zelf op je toestel.
          </p>
        </div>
      </div>
    </Dialog>
  )
}
