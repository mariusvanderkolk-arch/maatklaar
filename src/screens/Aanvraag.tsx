import { useMemo, useState } from 'react'
import { Check, MessageCircle, ShieldCheck } from 'lucide-react'
import { Button, Card, TextField } from '../components/ui'
import { aanvraagTekst, aanvraagWaUrl, leesProfiel, projectVanAanvraagLink, TYPE_LABEL, VRAGEN, WANNEER, type Aanvraag, type AanvraagType } from '../lib/aanvraag'

const TYPES = Object.keys(TYPE_LABEL) as AanvraagType[]

/** Openbaar aanvraagformulier van een aannemer (#/aanvraag/<code>). Verstuurt niets zelf: opent WhatsApp bij de klant. */
export function KlantAanvraag({ code }: { code: string }) {
  const profiel = useMemo(() => leesProfiel(code), [code])
  const [a, setA] = useState<Aanvraag>({ type: 'badkamer', keuzes: [], m2: '', wanneer: '', plaats: '', wensen: '', naam: '', telefoon: '' })
  const [klaar, setKlaar] = useState(false)
  const zet = (patch: Partial<Aanvraag>) => setA((x) => ({ ...x, ...patch }))

  if (!profiel) {
    return (
      <div className="flex min-h-dvh flex-col bg-grain">
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold">Deze aanvraaglink werkt niet</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">De link is niet compleet. Vraag de vakman om de link opnieuw te sturen.</p>
        </div>
      </div>
    )
  }

  const v = VRAGEN[a.type]
  const bedrijf = profiel.n || 'de vakman'
  const kanVersturen = a.naam.trim().length > 1
  const verstuur = () => {
    if (!kanVersturen) return
    const tekst = aanvraagTekst(a, profiel.n, projectVanAanvraagLink(a))
    setKlaar(true)
    window.location.href = aanvraagWaUrl(profiel.t, tekst)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-grain">
      <header className="border-b border-sand-300/60 bg-sand-100/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4 sm:px-6">
          <p className="truncate font-display text-[1.35rem] font-semibold">{bedrijf}</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.78rem] text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-gold-600" /> Via je eigen WhatsApp
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-gold-600">Offerte aanvragen</p>
          <h1 className="mt-1 text-[2rem] leading-tight font-semibold sm:text-[2.4rem]">Vertel kort wat je wilt laten doen</h1>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-muted">Duurt ongeveer een minuut. Daarna opent WhatsApp met je aanvraag voor {bedrijf}, en kun je er meteen foto's bij sturen.</p>
        </div>

        <Card className="p-5 sm:p-6">
          <h2 className="text-[1rem] font-semibold">1. Wat voor klus is het?</h2>
          <div role="radiogroup" aria-label="Soort klus" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={a.type === t}
                onClick={() => zet({ type: t, keuzes: [], m2: '' })}
                className={`h-12 rounded-xl px-3 text-[0.9rem] font-medium ring-1 ring-inset transition ${a.type === t ? 'bg-ink text-sand-50 ring-ink' : 'bg-paper text-ink-soft ring-sand-300 hover:ring-gold-400'}`}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Card>

        {(v.keuzes.length > 0 || v.m2) && (
          <Card className="p-5 sm:p-6">
            <h2 className="text-[1rem] font-semibold">2. Wat hoort erbij?</h2>
            <p className="mt-0.5 text-[0.82rem] text-ink-muted">Vink aan wat van toepassing is. Weet je het niet zeker, sla het dan over.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {v.keuzes.map((k) => {
                const aan = a.keuzes.includes(k)
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={aan}
                    onClick={() => zet({ keuzes: aan ? a.keuzes.filter((x) => x !== k) : [...a.keuzes, k] })}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-[0.88rem] font-medium ring-1 ring-inset transition ${aan ? 'bg-gold-100 text-ink ring-gold-400' : 'bg-paper text-ink-soft ring-sand-300 hover:ring-gold-400'}`}
                  >
                    {aan && <Check className="h-3.5 w-3.5 text-gold-700" />}
                    {k}
                  </button>
                )
              })}
            </div>
            {v.m2 && (
              <div className="mt-4 max-w-xs">
                <TextField label={`${v.m2}, als je het weet`} value={a.m2} onChange={(m2) => zet({ m2: m2.replace(/[^\d.,]/g, '').slice(0, 8) })} inputMode="decimal" placeholder="Bijv. 6" />
              </div>
            )}
          </Card>
        )}

        <Card className="p-5 sm:p-6">
          <h2 className="text-[1rem] font-semibold">{v.keuzes.length ? '3' : '2'}. Wanneer en waar?</h2>
          <div role="radiogroup" aria-label="Wanneer" className="mt-3 grid gap-2 sm:grid-cols-2">
            {WANNEER.map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={a.wanneer === w}
                onClick={() => zet({ wanneer: a.wanneer === w ? '' : w })}
                className={`h-11 rounded-xl px-3 text-left text-[0.88rem] font-medium ring-1 ring-inset transition ${a.wanneer === w ? 'bg-gold-100 text-ink ring-gold-400' : 'bg-paper text-ink-soft ring-sand-300 hover:ring-gold-400'}`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-4">
            <TextField label="Adres of plaats" value={a.plaats} onChange={(plaats) => zet({ plaats })} placeholder="Bijv. Dorpsstraat 1, Zwolle" autoComplete="street-address" />
            <div>
              <label htmlFor="aanvraag-wensen" className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Toelichting (optioneel)</label>
              <textarea
                id="aanvraag-wensen"
                className="min-h-24 w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-[0.95rem] outline-none focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50"
                value={a.wensen}
                maxLength={1000}
                placeholder="Wat is er nu, wat wil je anders? Alles wat helpt."
                onChange={(e) => zet({ wensen: e.target.value })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-[1rem] font-semibold">{v.keuzes.length ? '4' : '3'}. Je gegevens</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <TextField label="Naam" value={a.naam} onChange={(naam) => zet({ naam })} placeholder="Voor- en achternaam" autoComplete="name" />
            <TextField label="Telefoon (optioneel)" value={a.telefoon} onChange={(telefoon) => zet({ telefoon })} type="tel" inputMode="tel" placeholder="06 12345678" autoComplete="tel" />
          </div>
          <Button size="lg" className="mt-5 w-full" icon={<MessageCircle className="h-4 w-4" />} disabled={!kanVersturen} onClick={verstuur} data-testid="aanvraag-versturen">
            Verder in WhatsApp
          </Button>
          <p className="mt-2.5 text-center text-[0.78rem] leading-snug text-ink-muted">
            {kanVersturen ? `WhatsApp opent met je bericht aan ${bedrijf}. Je verstuurt het zelf.` : 'Vul je naam in om verder te gaan.'} Deze pagina bewaart niets.
          </p>
          {klaar && (
            <p className="mt-3 rounded-xl bg-[#eef3ea] px-3.5 py-2.5 text-center text-[0.85rem] text-ink-soft ring-1 ring-[#d3dfcd]" role="status">
              Opent WhatsApp niet vanzelf? Controleer of WhatsApp op dit apparaat staat.
            </p>
          )}
        </Card>

        <p className="pt-2 text-center text-[0.75rem] text-ink-muted">
          Aanvraagformulier gemaakt met <a href="#/" className="underline underline-offset-2 hover:text-ink">Maatklaar</a>, gratis voor vakmensen.
        </p>
      </main>
    </div>
  )
}
