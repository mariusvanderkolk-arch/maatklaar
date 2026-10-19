import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Button, Card, Dialog } from './ui'
import { toast } from './Toast'
import { track } from '../lib/analytics'
import { haalReviews, MAX_TEKST, reviewDialoog, samenvatting, verstuurReview, type Review } from '../lib/reviews'

function Sterren({ waarde, onChange, grootte = 'h-8 w-8' }: { waarde: number; onChange?: (n: number) => void; grootte?: string }) {
  if (!onChange)
    return (
      <span className="inline-flex gap-0.5" aria-label={`${waarde} van 5 sterren`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`${grootte} ${n <= Math.round(waarde) ? 'fill-gold-500 text-gold-500' : 'text-sand-300'}`} />
        ))}
      </span>
    )
  return (
    <div role="radiogroup" aria-label="Aantal sterren" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={waarde === n} aria-label={`${n} ster${n > 1 ? 'ren' : ''}`} onClick={() => onChange(n)} className="rounded-lg p-1 transition hover:scale-110">
          <Star className={`${grootte} ${n <= waarde ? 'fill-gold-500 text-gold-500' : 'text-sand-400'}`} />
        </button>
      ))}
    </div>
  )
}

/** Globale dialoog 'Beoordeel Maatklaar'; open met reviewDialoog.open(). */
export function BeoordeelDialoog() {
  const [open, setOpen] = useState(false)
  const [sterren, setSterren] = useState(0)
  const [tekst, setTekst] = useState('')
  const [naam, setNaam] = useState('')
  const [bedrijf, setBedrijf] = useState('')
  const [toestemming, setToestemming] = useState(false)
  const [bezig, setBezig] = useState(false)
  useEffect(() => reviewDialoog.abonneer(setOpen), [])
  const veld = 'h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3.5 text-[0.92rem] placeholder:text-ink-muted/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none'
  const verstuur = async () => {
    setBezig(true)
    const r = await verstuurReview({ stars: sterren, text: tekst, name: naam, company: bedrijf, consent: toestemming })
    setBezig(false)
    if (r === 'ok') {
      track('review_submitted')
      toast('Bedankt voor je beoordeling!')
      setOpen(false)
      setSterren(0)
      setTekst('')
    } else toast(r === 'geen-tabel' ? 'Beoordelen kan nog niet; probeer het later nog eens.' : 'Versturen lukte niet. Controleer je verbinding.', 'fout')
  }
  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="Beoordeel Maatklaar"
      sub="Hoe bevalt de app? Je beoordeling helpt ons de app beter te maken."
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button disabled={!sterren || bezig} onClick={verstuur}>
            {bezig ? 'Versturen…' : 'Versturen'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Sterren waarde={sterren} onChange={setSterren} />
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Wat vind je ervan? (optioneel)</span>
          <textarea
            rows={3}
            maxLength={MAX_TEKST}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="Bijv. wat werkt goed, wat mis je?"
            className="w-full rounded-xl border border-sand-300 bg-white/90 px-3.5 py-2.5 text-[0.92rem] placeholder:text-ink-muted/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
          />
          <span className="mt-1 block text-right text-xs text-ink-muted">
            {tekst.length}/{MAX_TEKST}
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={veld} aria-label="Naam (optioneel)" placeholder="Naam (optioneel)" maxLength={60} value={naam} onChange={(e) => setNaam(e.target.value)} />
          <input className={veld} aria-label="Bedrijf (optioneel)" placeholder="Bedrijf (optioneel)" maxLength={80} value={bedrijf} onChange={(e) => setBedrijf(e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-gold-600" checked={toestemming} onChange={(e) => setToestemming(e.target.checked)} />
          <span>Mijn beoordeling (met naam/bedrijf als ingevuld) mag openbaar op de site worden getoond, na controle door het Maatklaar-team.</span>
        </label>
        <p className="text-xs text-ink-muted">Zonder vinkje is je beoordeling alleen zichtbaar voor het Maatklaar-team. Er wordt niets anders van je opgeslagen.</p>
      </div>
    </Dialog>
  )
}

/** Gemiddelde + een paar citaten; toont niets zolang er geen goedgekeurde beoordelingen zijn. */
export function ReviewsBlok({ className = '' }: { className?: string }) {
  const [rs, setRs] = useState<Review[]>([])
  useEffect(() => {
    let weg = false
    haalReviews().then((r) => !weg && setRs(r))
    return () => {
      weg = true
    }
  }, [])
  const s = samenvatting(rs)
  if (!s) return null
  return (
    <section className={className} aria-label="Beoordelingen">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="tabnum font-display text-[2.2rem] leading-none font-semibold">{s.gemiddelde.toLocaleString('nl-NL')}</span>
          <div>
            <Sterren waarde={s.gemiddelde} grootte="h-4 w-4" />
            <p className="text-xs text-ink-muted">
              {s.aantal} beoordeling{s.aantal === 1 ? '' : 'en'} van vakmensen
            </p>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={reviewDialoog.open}>
            Beoordeel zelf
          </Button>
        </div>
        {s.quotes.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {s.quotes.map((q) => (
              <li key={q.id} className="rounded-xl bg-sand-50 p-3.5 text-sm ring-1 ring-sand-200">
                <Sterren waarde={q.stars} grootte="h-3.5 w-3.5" />
                <p className="mt-1.5 leading-relaxed text-ink-soft">“{q.text}”</p>
                {(q.name || q.company) && <p className="mt-1.5 text-xs font-medium text-ink-muted">— {[q.name, q.company].filter(Boolean).join(', ')}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
