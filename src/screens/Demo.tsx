import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CircleCheck, FileText, PenLine, Plus, Printer, Ruler, ShieldCheck } from 'lucide-react'
import { Button, Card } from '../components/ui'
import { OfferteDocument } from '../components/OfferteDocument'
import { Plattegrond } from '../components/Plattegrond'
import { ga } from '../lib/router'
import { demoOfferte, demoProject } from '../lib/demo'
import { euro } from '../lib/format'

type Stap = 'maten' | 'offerte' | 'klant' | 'klaar'
const STAPPEN: { id: Exclude<Stap, 'klaar'>; titel: string; icon: typeof Ruler }[] = [
  { id: 'maten', titel: 'Maten', icon: Ruler },
  { id: 'offerte', titel: 'Offerte', icon: FileText },
  { id: 'klant', titel: 'Klant tekent', icon: PenLine },
]

/** Demo zonder account: alles in het geheugen, niets wordt opgeslagen, gesynchroniseerd of gedeeld. */
export function Demo({ stap }: { stap: Stap }) {
  const p = useMemo(() => demoProject(), [])
  const d = useMemo(() => demoOfferte(), [])
  const i = STAPPEN.findIndex((s) => s.id === stap)
  const eigen = () => ga('/nieuw')

  return (
    <div className="bg-grain min-h-[70dvh]">
      <div data-testid="demo-banner" className="no-print sticky top-0 z-30 border-b border-gold-300 bg-gold-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-[0.7rem] font-bold tracking-[0.14em] text-paper uppercase">Demo</span>
          <p className="min-w-0 flex-1 text-[0.8rem] leading-snug text-ink-soft">Fictief voorbeeld · er wordt niets opgeslagen of verstuurd</p>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={eigen} className="shrink-0">
            <span className="hidden sm:inline">Begin je eigen offerte</span>
            <span className="sm:hidden">Zelf beginnen</span>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-5 pb-28 sm:px-6 sm:pt-8">
        {stap !== 'klaar' && (
          <ol className="no-print mb-5 grid grid-cols-3 gap-2" aria-label="Stappen van de demo">
            {STAPPEN.map((s, n) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => ga(`/demo/${s.id}`)}
                  aria-current={n === i ? 'step' : undefined}
                  className={`flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[0.78rem] font-semibold ring-1 transition sm:flex-row sm:justify-center sm:gap-2 sm:text-sm ${n === i ? 'bg-ink text-paper ring-ink' : n < i ? 'bg-gold-100 text-gold-800 ring-gold-300' : 'bg-paper text-ink-muted ring-sand-300'}`}
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[0.72rem] ${n === i ? 'bg-gold-500 text-ink' : 'bg-sand-200 text-ink'}`}>{n + 1}</span>
                  {s.titel}
                </button>
              </li>
            ))}
          </ol>
        )}

        {stap === 'maten' && (
          <section aria-labelledby="demo-titel">
            <h1 id="demo-titel" className="text-[1.9rem] leading-tight font-semibold text-ink sm:text-[2.3rem]">Badkamer opgemeten</h1>
            <p className="mt-1.5 text-[0.95rem] text-ink-soft">Je vult de binnenmaten in; Maatklaar tekent de plattegrond en rekent alle oppervlakken uit.</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <Card className="p-4 sm:p-6">
                <Plattegrond afmetingen={p.afmetingen} scope={p.scope} vloertegel={p.vloertegel} type={p.type} className="mx-auto w-full max-w-md" />
              </Card>
              <Card className="p-5 sm:p-6">
                <p className="text-[0.75rem] font-semibold tracking-[0.16em] text-gold-700 uppercase">{d.ruimte}</p>
                <p className="mt-1 text-xl font-semibold text-ink">{d.maten}</p>
                <dl className="mt-4 divide-y divide-sand-200 text-[0.92rem]">
                  {d.opp.slice(0, 6).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2">
                      <dt className="text-ink-soft">{k}</dt>
                      <dd className="tabnum font-medium text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </div>
            <Volgende onClick={() => ga('/demo/offerte')}>Bekijk de offerte</Volgende>
          </section>
        )}

        {stap === 'offerte' && (
          <section aria-labelledby="demo-titel">
            <h1 id="demo-titel" className="no-print text-[1.9rem] leading-tight font-semibold text-ink sm:text-[2.3rem]">De offerte staat klaar</h1>
            <p className="no-print mt-1.5 text-[0.95rem] text-ink-soft">
              Materialen, arbeid en totaal ({euro(d.totaal)}) zijn automatisch berekend met voorbeeldprijzen. Jij past aan wat je wilt.
            </p>
            <div className="no-print mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
                Bekijk als PDF
              </Button>
            </div>
            <div className="mt-4">
              <OfferteDocument d={d} />
            </div>
            <Volgende onClick={() => ga('/demo/klant')} terug={() => ga('/demo/maten')}>
              Zo ziet je klant het
            </Volgende>
          </section>
        )}

        {stap === 'klant' && <KlantVoorbeeld d={d} />}

        {stap === 'klaar' && (
          <section aria-labelledby="demo-titel" className="mx-auto max-w-lg pt-6 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold-100 text-gold-700 ring-1 ring-gold-300">
              <CircleCheck className="h-8 w-8" />
            </span>
            <h1 id="demo-titel" className="mt-5 text-[2rem] leading-tight font-semibold text-ink">Zo snel gaat het</h1>
            <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-soft">Opmeten, offerte en akkoord van de klant, op je telefoon. Maak nu je eigen offerte, gratis.</p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button size="lg" icon={<Plus className="h-4.5 w-4.5" />} onClick={eigen}>
                Begin je eigen offerte
              </Button>
              <Button size="lg" variant="ghost" onClick={() => ga('/')}>
                Naar de startpagina
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Volgende({ children, onClick, terug }: { children: React.ReactNode; onClick: () => void; terug?: () => void }) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-sand-300/70 bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0">
      <div className="mx-auto flex max-w-5xl gap-2 sm:justify-end">
        {terug && <Button variant="ghost" aria-label="Vorige stap" icon={<ArrowLeft className="h-4 w-4" />} onClick={terug} />}
        <Button size="lg" className="flex-1 sm:flex-none" onClick={onClick}>
          {children} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/** Voorbeeld van de klantpagina: lokaal, geen echte link, geen opslag, geen database. */
function KlantVoorbeeld({ d }: { d: ReturnType<typeof demoOfferte> }) {
  const [naam, setNaam] = useState('')
  const [getekend, setGetekend] = useState(false)
  return (
    <section aria-labelledby="demo-titel">
      <h1 id="demo-titel" className="text-[1.9rem] leading-tight font-semibold text-ink sm:text-[2.3rem]">Je klant tekent online</h1>
      <p className="mt-1.5 text-[0.95rem] text-ink-soft">Je stuurt een link via WhatsApp of e-mail. Je klant bekijkt de offerte en geeft akkoord; jij ziet het direct in de app.</p>
      <div className="mt-5 overflow-hidden rounded-3xl bg-sand-100 shadow-card ring-1 ring-sand-300">
        <div className="flex items-center justify-between gap-3 border-b border-sand-300/60 bg-sand-50 px-4 py-3">
          <p className="truncate font-display text-[1.15rem] font-semibold">{d.bedrijf.naam}</p>
          <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-gold-600" /> Voorbeeld klantpagina
          </span>
        </div>
        <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="max-h-[52dvh] overflow-auto rounded-2xl lg:max-h-[70dvh]">
            <OfferteDocument d={d} />
          </div>
          <Card className="p-5">
            {getekend ? (
              <div data-testid="demo-getekend">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <CircleCheck className="h-5 w-5 text-sage" /> Getekend door {naam.trim()}
                </p>
                <p className="mt-1 text-[0.85rem] text-ink-muted">In het echt krijg jij nu een melding in de app. In de demo is er niets verstuurd.</p>
                <Button className="mt-4 w-full" onClick={() => ga('/demo/klaar')}>
                  Afronden <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (naam.trim()) setGetekend(true)
                }}
              >
                <p className="font-semibold text-ink">Akkoord geven</p>
                <p className="mt-1 text-[0.82rem] text-ink-muted">Totaal {euro(d.totaal)}</p>
                <label className="mt-3 block text-[0.82rem] font-medium text-ink-soft" htmlFor="demo-naam">
                  Naam (probeer maar)
                </label>
                <input
                  id="demo-naam"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value.slice(0, 60))}
                  placeholder="Bijv. J. de Boer"
                  autoComplete="off"
                  className="mt-1 w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-[0.95rem] focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
                />
                <Button type="submit" className="mt-3 w-full" disabled={!naam.trim()} icon={<PenLine className="h-4 w-4" />}>
                  Akkoord (demo)
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
      <div className="no-print mt-4 flex justify-start">
        <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => ga('/demo/offerte')}>
          Terug naar de offerte
        </Button>
      </div>
    </section>
  )
}
