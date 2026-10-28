/**
 * Snelstart: "Eerste offerte in 1 minuut".
 * Aannemer typt of spreekt één zin in → concept-project met voorbeeldprijzen (fictief) → direct naar de offerte.
 * Hergebruikt de bestaande inspraak-herkenning: ingelogd via de Edge Function (zoals Inspreken), anders alleen op het toestel.
 * Er wordt niets opgeslagen of verstuurd behalve het project in je eigen browser/account; analytics alleen anoniem.
 */
import { useEffect, useRef, useState } from 'react'
import { Info, Mic, MicOff, Sparkles, Zap } from 'lucide-react'
import { Button, Dialog } from './ui'
import { track } from '../lib/analytics'
import { verwerkInspraak, pasInspraakToe, type Inspraak } from '../lib/inspraak'
import { nieuwProject } from '../lib/defaults'
import { standaardMarge } from '../lib/bedrijf'
import { ruimte } from '../lib/ruimtes'
import { projectStore } from '../lib/store'
import { useProjectToegang } from '../lib/billing/store'
import { ga } from '../lib/router'
import { plakVast, transcriptUit } from '../lib/spraak'
import { VOORBEELD_ZIN } from './Inspreken'
import type { Project } from '../lib/types'

type SR = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null }
const spraakKlasse = () => (typeof window !== 'undefined' ? ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => SR) | undefined : undefined)

/** Pure functie: inspraak → nieuw concept-project (testbaar). Geen herkende maten → standaardmaten van het ruimtetype. */
export function snelstartProject(r: Inspraak, nu = Date.now()): Project {
  const type = r.type ?? 'badkamer'
  const basis = nieuwProject({ type })
  const m = standaardMarge()
  const p = pasInspraakToe({ ...basis, ...(m > 0 ? { marge: m } : {}) }, r)
  const maat = r.lengte && r.breedte ? ` ${r.lengte.toLocaleString('nl-NL')}×${r.breedte.toLocaleString('nl-NL')} m` : ''
  return { ...p, naam: p.naam || `Snelle offerte ${ruimte(p.type).label.toLowerCase()}${maat}`, createdAt: nu, updatedAt: nu }
}

export function SnelstartKnop({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        size="lg"
        className={className}
        icon={<Zap className="h-4.5 w-4.5" />}
        data-testid="snelstart-knop"
        onClick={() => {
          track('snelstart_gestart')
          setOpen(true)
        }}
      >
        Eerste offerte in 1 minuut
      </Button>
      {open && <SnelstartDialoog onClose={() => setOpen(false)} />}
    </>
  )
}

function SnelstartDialoog({ onClose }: { onClose: () => void }) {
  const [tekst, setTekst] = useState('')
  const [bezig, setBezig] = useState(false)
  const [luistert, setLuistert] = useState(false)
  const [fout, setFout] = useState('')
  const sr = useRef<SR | null>(null)
  const vast = useRef('')
  const Klasse = spraakKlasse()
  const toegang = useProjectToegang()
  useEffect(() => () => sr.current?.stop(), [])

  const start = () => {
    if (!Klasse) return
    setFout('')
    const r = new Klasse()
    r.lang = 'nl-NL'
    r.continuous = false
    r.interimResults = true
    vast.current = tekst.trim()
    r.onresult = (e) => {
      const { definitief, tussen } = transcriptUit(e.results)
      setTekst(plakVast(plakVast(vast.current, definitief), tussen).slice(0, 600))
    }
    r.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') setFout('Spraak lukte niet. Typ je klus hieronder.')
    }
    r.onend = () => setLuistert(false)
    sr.current = r
    try {
      r.start()
      setLuistert(true)
    } catch {
      setFout('Spraak is niet beschikbaar. Typ je klus hieronder.')
    }
  }
  const stop = () => {
    sr.current?.stop()
    setLuistert(false)
  }

  const maak = async () => {
    stop()
    if (!toegang.mag) {
      onClose()
      ga('/nieuw') // toont de bestaande betaalmuur
      return
    }
    setBezig(true)
    const { r, bron } = await verwerkInspraak(tekst)
    const p = snelstartProject(r)
    projectStore.voegToe(p)
    track('project_created')
    track('snelstart_offerte_klaar', { detail: bron })
    setBezig(false)
    onClose()
    ga(`/project/${p.id}/offerte`)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Eerste offerte in 1 minuut"
      sub="Beschrijf de klus in één zin. Je krijgt meteen een concept-offerte; opmeten kan daarna."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button icon={<Sparkles className="h-4 w-4" />} disabled={!tekst.trim() || bezig} onClick={maak} data-testid="snelstart-maak">
            {bezig ? 'Bezig…' : 'Maak concept-offerte'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {Klasse && (
          <button
            type="button"
            onClick={luistert ? stop : start}
            aria-pressed={luistert}
            className={`flex w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 text-[0.95rem] font-semibold ring-1 transition ${luistert ? 'animate-pulse bg-rust/10 text-rust ring-rust/30' : 'bg-gold-100 text-gold-800 ring-gold-300 hover:bg-gold-200/70'}`}
          >
            {luistert ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {luistert ? 'Stoppen' : 'Tik en spreek in'}
          </button>
        )}
        {fout && <p className="text-[0.8rem] text-rust">{fout}</p>}
        <textarea
          rows={3}
          aria-label="Klusomschrijving"
          data-testid="snelstart-tekst"
          value={tekst}
          onChange={(e) => setTekst(e.target.value.slice(0, 600))}
          placeholder={VOORBEELD_ZIN}
          className="w-full rounded-xl border border-sand-300 bg-white/90 px-3.5 py-2.5 text-[0.92rem] placeholder:text-ink-muted/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
        />
        <div className="rounded-xl bg-sand-50 px-3.5 py-3 text-[0.78rem] leading-relaxed text-ink-soft ring-1 ring-sand-200">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <Info className="h-3.5 w-3.5 text-gold-600" /> Goed om te weten
          </p>
          <p className="mt-1">
            De offerte gebruikt <strong>voorbeeldprijzen (fictief, indicatief)</strong> tot je je eigen prijzen invult. Controleer maten en prijzen altijd voordat je hem naar een klant stuurt.
          </p>
          <p className="mt-1.5">Noem liever geen klantnaam of adres; die vul je later zelf in. Ben je ingelogd, dan wordt de tekst begrepen via onze server (Gemini), anders op je eigen toestel. Er wordt geen geluid of tekst bewaard.</p>
        </div>
      </div>
    </Dialog>
  )
}
