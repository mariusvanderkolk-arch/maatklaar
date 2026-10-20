import { inVreemdFrame } from '../lib/veiligeUrl'
import { useEffect, useMemo, useState } from 'react'
import { HandtekeningVeld } from '../components/Handtekening'
import { FOUT_TEKST, haalTekenStatus, meldBekeken, teken, type Fout, type TekenStatus } from '../lib/ondertekenen'
import { ArrowLeft, CircleCheck, Copy, FileWarning, Mail, MessageCircle, Printer, ShieldCheck } from 'lucide-react'
import { OfferteDocument } from '../components/OfferteDocument'
import { Button, Card, Checkbox, Notice, TextField } from '../components/ui'
import { toast } from '../components/Toast'
import { euro } from '../lib/format'
import { akkoordBericht, datumNl, decodeerOfferte, mailtoLink, whatsappLink, type OfferteData } from '../lib/offerte'
import { vandaag } from '../lib/planning'
import { kopieer } from '../lib/share'
import { sleutel as opslagSleutel } from '../lib/modus'
import { opslag } from '../lib/veiligeOpslag'

interface Akkoord {
  naam: string
  opmerking: string
  datum: string
}
const sleutel = (nr: string) => opslagSleutel(`akkoord:${nr}`)

/** Alleen-lezen offerte voor de klant, met akkoord via een vooraf ingevuld bericht. */
export function KlantOfferte({ code }: { code: string }) {
  const resultaat = useMemo(() => {
    try {
      return { d: decodeerOfferte(code) }
    } catch (e) {
      return { fout: (e as Error).message }
    }
  }, [code])

  if (!resultaat.d) {
    return (
      <Kader>
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-100 text-gold-700 ring-1 ring-gold-200">
            <FileWarning className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold">Offerte niet te openen</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{resultaat.fout}</p>
        </div>
      </Kader>
    )
  }
  return <Weergave d={resultaat.d} />
}

function Kader({ children, bedrijf }: { children: React.ReactNode; bedrijf?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-grain">
      <header className="no-print border-b border-sand-300/60 bg-sand-100/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <p className="truncate font-display text-[1.35rem] font-semibold">{bedrijf || 'Offerte'}</p>
          <span className="inline-flex items-center gap-1.5 text-[0.78rem] text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-gold-600" /> Alleen-lezen
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}

function Weergave({ d }: { d: OfferteData }) {
  const [akkoord, setAkkoord] = useState<Akkoord | null>(() => {
    try {
      return JSON.parse(opslag.getItem(sleutel(d.nr)) ?? 'null')
    } catch {
      return null
    }
  })
  const [bevestigen, setBevestigen] = useState(false)
  const verlopen = d.geldigTot && d.geldigTot < vandaag()

  if (akkoord && bevestigen) return <Bevestiging d={d} a={akkoord} terug={() => setBevestigen(false)} />

  return (
    <Kader bedrijf={d.bedrijf.naam}>
      <div className="mx-auto grid max-w-5xl gap-5 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:pb-16">
        <div className="space-y-4">
          {verlopen && (
            <Notice title="Deze offerte is verlopen">
              De offerte was geldig tot {datumNl(d.geldigTot)}. Neem contact op met {d.bedrijf.naam || 'de aannemer'} voor een actuele offerte.
            </Notice>
          )}
          <OfferteDocument d={d} interactief3d />
        </div>
        <aside id="akkoord" className="no-print scroll-mt-6 space-y-4 lg:sticky lg:top-6">
          {akkoord ? (
            <Card className="p-5">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <CircleCheck className="h-5 w-5 text-sage" /> Je hebt akkoord gegeven
              </p>
              <p className="mt-1 text-[0.84rem] text-ink-muted">
                Op {datumNl(akkoord.datum)} als {akkoord.naam}. Heb je het bericht nog niet verstuurd? Doe dat dan alsnog.
              </p>
              <Button className="mt-4 w-full" onClick={() => setBevestigen(true)}>
                Akkoordbericht versturen
              </Button>
            </Card>
          ) : (
            <AkkoordFormulier
              d={d}
              onAkkoord={(a) => {
                setAkkoord(a)
                setBevestigen(true)
                try {
                  opslag.setItem(sleutel(d.nr), JSON.stringify(a))
                } catch {
                  /* niet erg: alleen geheugensteun */
                }
                window.scrollTo({ top: 0 })
              }}
            />
          )}
          <Button variant="secondary" className="w-full" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            Afdrukken / PDF
          </Button>
        </aside>
      </div>
      {!akkoord && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-sand-300/70 bg-sand-100/90 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">Totaal incl. btw</p>
              <p className="tabnum font-display text-[1.5rem] leading-none font-semibold">{euro(d.totaal)}</p>
            </div>
            <Button onClick={() => document.getElementById('akkoord')?.scrollIntoView({ behavior: 'smooth' })}>Akkoord geven</Button>
          </div>
        </div>
      )}
    </Kader>
  )
}

function AkkoordFormulier({ d, onAkkoord }: { d: OfferteData; onAkkoord: (a: Akkoord) => void }) {
  const [naam, setNaam] = useState('')
  const [opmerking, setOpmerking] = useState('')
  const [eens, setEens] = useState(false)
  const klaar = naam.trim().length >= 2 && eens
  return (
    <Card className="p-5">
      <p className="text-[1.05rem] font-semibold">Akkoord geven</p>
      <p className="mt-1 text-[0.82rem] leading-snug text-ink-muted">
        Offerte <span className="tabnum font-medium text-ink-soft">{d.nr}</span>
        <br />
        Totaal <span className="tabnum font-medium text-ink-soft">{euro(d.totaal)}</span> incl. btw
      </p>
      <form
        className="mt-4 space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (klaar) onAkkoord({ naam: naam.trim(), opmerking: opmerking.trim(), datum: vandaag() })
        }}
      >
        <TextField label="Je naam" value={naam} onChange={setNaam} placeholder="Voor- en achternaam" />
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Opmerking (optioneel)</span>
          <textarea
            rows={2}
            value={opmerking}
            onChange={(e) => setOpmerking(e.target.value)}
            className="w-full resize-none rounded-xl border border-sand-300 bg-white/80 px-3.5 py-2.5 text-sm focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
            placeholder="Bijv. gewenste startdatum"
          />
        </label>
        <button type="button" role="checkbox" aria-checked={eens} onClick={() => setEens(!eens)} className="flex w-full items-start gap-3 rounded-xl bg-sand-50 px-3.5 py-3 text-left ring-1 ring-sand-200">
          <Checkbox checked={eens} className="mt-0.5" />
          <span className="text-[0.82rem] leading-snug text-ink-soft">Ik ga akkoord met deze offerte en de voorwaarden.</span>
        </button>
        <Button type="submit" className="w-full" disabled={!klaar}>
          Akkoord geven
        </Button>
        <p className="text-[0.74rem] leading-relaxed text-ink-muted">
          Er wordt niets automatisch verstuurd. Na het akkoord maak je een bericht aan {d.bedrijf.naam || 'de aannemer'} dat je zelf verstuurt via
          WhatsApp, e-mail of kopiëren.
        </p>
      </form>
    </Card>
  )
}

function Bevestiging({ d, a, terug }: { d: OfferteData; a: Akkoord; terug: () => void }) {
  const bericht = akkoordBericht(d, a.naam, a.opmerking, a.datum)
  const onderwerp = `Akkoord offerte ${d.nr}`
  return (
    <Kader bedrijf={d.bedrijf.naam}>
      <div className="mx-auto max-w-xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e8eee4] text-sage ring-1 ring-[#d3dfcd]">
            <CircleCheck className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-[2.2rem] leading-tight font-semibold">Nog één stap: verstuur je akkoord</h1>
          <p className="mx-auto mt-2 max-w-md text-[0.92rem] leading-relaxed text-ink-soft">
            Je akkoord is nog <strong className="font-semibold text-ink">niet</strong> verzonden. Kies hieronder hoe je het bericht naar{' '}
            {d.bedrijf.naam || 'de aannemer'} stuurt.
          </p>
        </div>
        <Card className="mt-7 overflow-hidden">
          <div className="border-b border-sand-200 px-5 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-gold-700">Je bericht</div>
          <pre className="px-5 py-4 font-sans text-[0.86rem] leading-relaxed whitespace-pre-wrap text-ink-soft">{bericht}</pre>
        </Card>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          <a
            href={whatsappLink(d.bedrijf.telefoon ?? '', bericht)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-[#0b3d1f] shadow-sm transition hover:brightness-95"
          >
            <MessageCircle className="h-4.5 w-4.5" /> WhatsApp
          </a>
          <a
            href={mailtoLink(d.bedrijf.email ?? '', onderwerp, bericht)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-sand-50 shadow-sm transition hover:bg-[#3a332b]"
          >
            <Mail className="h-4.5 w-4.5" /> E-mail
          </a>
          <Button variant="secondary" size="lg" className="!h-12" icon={<Copy className="h-4.5 w-4.5" />} onClick={async () => toast((await kopieer(bericht)) === 'gekopieerd' ? 'Bericht gekopieerd' : 'Kopiëren mislukt')}>
            Kopiëren
          </Button>
        </div>
        {!d.bedrijf.telefoon && !d.bedrijf.email && (
          <p className="mt-3 text-center text-[0.78rem] text-ink-muted">Er staan geen contactgegevens in de offerte: kies zelf de ontvanger.</p>
        )}
        <div className="mt-8 text-center">
          <button type="button" onClick={terug} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Terug naar de offerte
          </button>
        </div>
      </div>
    </Kader>
  )
}

/** Staat dit token in een project op dit apparaat? Dan is het de aannemer zelf. */
function eigenLink(token: string): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      if (k.endsWith(':projecten:v1') && (localStorage.getItem(k) ?? '').includes(token)) return true
    }
  } catch {
    /* geen opslag: dan is het niet de aannemer */
  }
  return false
}

/** Offerte via een tekenlink: de klant leest, vult naam in, tekent en geeft akkoord (vastgelegd op de server). */
export function KlantTekenen({ token }: { token: string }) {
  const [status, setStatus] = useState<{ laden: true } | { fout: Fout } | { data: TekenStatus }>({ laden: true })
  const [naam, setNaam] = useState('')
  const [png, setPng] = useState<string | null>(null)
  const [eens, setEens] = useState(false)
  const [bezig, setBezig] = useState(false)
  useEffect(() => {
    let weg = false
    haalTekenStatus(token).then((r) => {
      if (weg) return
      setStatus(r.ok ? { data: r.data } : { fout: r.fout })
      // "Bekeken" voor de aannemer vastleggen — niet als de aannemer zijn eigen link op dit apparaat opent
      if (r.ok && !r.data.signed_at && !eigenLink(token)) void meldBekeken(token)
    })
    return () => {
      weg = true
    }
  }, [token])

  if (inVreemdFrame())
    return (
      <Kader>
        <div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-ink-muted">
          Deze offerte kan om veiligheidsredenen niet binnen een andere website worden getekend.{' '}
          <a className="font-medium text-ink underline" href={location.href} target="_blank" rel="noopener noreferrer">
            Open de offerte rechtstreeks
          </a>
          .
        </div>
      </Kader>
    )
  if ('laden' in status) return <Kader><div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-ink-muted">Offerte laden…</div></Kader>
  if ('fout' in status)
    return (
      <Kader>
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-100 text-gold-700 ring-1 ring-gold-200">
            <FileWarning className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold">{status.fout === 'ingetrokken' ? 'Deze link is niet meer geldig' : 'Offerte niet te openen'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted" data-testid="klant-fout">{FOUT_TEKST[status.fout]}</p>
        </div>
      </Kader>
    )
  const s = status.data
  const d = s.snapshot
  const getekend = s.signed_at && s.signer_name && s.signature ? { naam: s.signer_name, op: s.signed_at, handtekening: s.signature, hash: s.hash } : null
  const verlopen = d.geldigTot && d.geldigTot < vandaag()
  const klaar = naam.trim().length >= 2 && !!png && eens && !bezig

  const verstuur = async () => {
    setBezig(true)
    const r = await teken(token, naam, png!, s.hash)
    setBezig(false)
    if (r.ok) {
      setStatus({ data: { ...s, signed_at: r.data.signed_at, signer_name: r.data.signer_name, signature: png } })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      toast('Offerte getekend')
    } else toast(FOUT_TEKST[r.fout], 'fout')
  }

  return (
    <Kader bedrijf={d.bedrijf.naam}>
      <div className="mx-auto grid max-w-5xl gap-5 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-4">
          {getekend && (
            <Notice tone="sage" title="Deze offerte is getekend">
              Getekend door {getekend.naam} op {new Date(getekend.op).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Amsterdam' })}. {d.bedrijf.naam || 'De aannemer'} ziet dit direct in de app.
            </Notice>
          )}
          {verlopen && !getekend && (
            <Notice title="Deze offerte is verlopen">
              De offerte was geldig tot {datumNl(d.geldigTot)}. Neem contact op met {d.bedrijf.naam || 'de aannemer'} voor een actuele offerte.
            </Notice>
          )}
          <OfferteDocument d={d} interactief3d ondertekening={getekend} />
        </div>
        <aside className="no-print space-y-4 lg:sticky lg:top-6">
          {!getekend && (
            <Card className="p-5">
              <p className="text-[1.05rem] font-semibold">Offerte tekenen</p>
              <p className="mt-1 text-[0.82rem] leading-snug text-ink-muted">
                Offerte <span className="tabnum font-medium text-ink-soft">{d.nr}</span> · totaal <span className="tabnum font-medium text-ink-soft">{euro(d.totaal)}</span> incl. btw
              </p>
              <div className="mt-4 space-y-3.5">
                <TextField label="Je naam" value={naam} onChange={setNaam} placeholder="Voor- en achternaam" autoComplete="name" />
                <div>
                  <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Handtekening</span>
                  <HandtekeningVeld onChange={setPng} />
                </div>
                <button type="button" role="checkbox" aria-checked={eens} onClick={() => setEens(!eens)} className="flex w-full items-start gap-3 rounded-xl bg-sand-50 px-3.5 py-3 text-left ring-1 ring-sand-200">
                  <Checkbox checked={eens} className="mt-0.5" />
                  <span className="text-[0.82rem] leading-snug text-ink-soft">Akkoord: ik ga akkoord met deze offerte en de voorwaarden.</span>
                </button>
                <Button className="w-full" disabled={!klaar} onClick={verstuur}>
                  {bezig ? 'Bezig…' : 'Tekenen en akkoord geven'}
                </Button>
                <p className="text-[0.74rem] leading-relaxed text-ink-muted">
                  Je naam, handtekening en het tijdstip worden vastgelegd bij deze versie van de offerte en zijn zichtbaar voor {d.bedrijf.naam || 'de aannemer'}. Tekenen kan één keer.
                </p>
              </div>
            </Card>
          )}
          <Button variant="secondary" className="w-full" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            Afdrukken / PDF
          </Button>
        </aside>
      </div>
    </Kader>
  )
}
