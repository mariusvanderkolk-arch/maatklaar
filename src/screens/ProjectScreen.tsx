import { ArrowLeft, ArrowRight, Calculator, CalendarDays, Camera, FileText, MapPin, Pencil, ShoppingCart, SquareDashedMousePointer } from 'lucide-react'
import { Badge, Button } from '../components/ui'
import { OpslagIndicator } from '../components/Opslag'
import { ga, type Stap } from '../lib/router'
import { useProject } from '../lib/store'
import { ruimteLabel } from '../lib/ruimtes'
import { NietGevonden } from './ProjectForm'
import { Suspense } from 'react'
import { Measure } from './Measure'
import { laadLater } from '../lib/lazy'

const Calculation = laadLater(() => import('./Calculation').then((m) => m.Calculation))
const Shopping = laadLater(() => import('./Shopping').then((m) => m.Shopping))
const Quote = laadLater(() => import('./Quote').then((m) => m.Quote))
const OntwerpScherm = laadLater(() => import('./Ontwerp').then((m) => m.OntwerpScherm))
const PlanningScherm = laadLater(() => import('./Planning').then((m) => m.PlanningScherm))

export const STAPPEN: { id: Stap; label: string; kort: string; icon: typeof Camera }[] = [
  { id: 'opmeten', label: 'Opmeten', kort: 'Opmeten', icon: Camera },
  { id: 'ontwerp', label: 'Ontwerp', kort: 'Ontwerp', icon: SquareDashedMousePointer },
  { id: 'berekening', label: 'Berekening', kort: 'Bereken', icon: Calculator },
  { id: 'inkoop', label: 'Inkooplijst', kort: 'Inkoop', icon: ShoppingCart },
  { id: 'offerte', label: 'Offerte', kort: 'Offerte', icon: FileText },
  { id: 'planning', label: 'Planning & uren', kort: 'Planning', icon: CalendarDays },
]

export function ProjectScreen({ id, stap }: { id: string; stap: Stap }) {
  const p = useProject(id)
  if (!p) return <NietGevonden />
  const index = STAPPEN.findIndex((s) => s.id === stap)
  const vorige = STAPPEN[index - 1]
  const volgende = STAPPEN[index + 1]

  return (
    <div className="pb-28">
      <div className="no-print border-b border-sand-300/60 bg-grain">
        <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-7">
          <div className="flex items-center justify-between gap-3">
            <a href="#/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Projecten
            </a>
            <div className="flex items-center gap-3">
              <OpslagIndicator sinds={p.updatedAt} />
              <Button variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => ga(`/project/${p.id}/bewerken`)}>
                Bewerken
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="gold">{ruimteLabel(p.type)}</Badge>
            {p.voorbeeld && <Badge>Voorbeeldproject</Badge>}
          </div>
          <h1 className="mt-2 text-[2.1rem] leading-[1.05] font-semibold sm:text-[2.7rem]">{p.naam}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
            <span>{p.klant || 'Geen klant'}</span>
            {p.adres && (
              <>
                <span className="text-sand-400">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {p.adres}
                </span>
              </>
            )}
          </p>
          <nav className="-mx-2 mt-6 sm:mx-0" aria-label="Stappen">
            <ol className="grid grid-cols-6 sm:flex sm:gap-2">
              {STAPPEN.map((s, i) => {
                const actief = s.id === stap
                const klaar = i < index
                return (
                  <li key={s.id}>
                    <a
                      href={`#/project/${p.id}/${s.id}`}
                      aria-current={actief ? 'step' : undefined}
                      className={`relative flex flex-col items-center justify-center gap-1 px-0.5 pt-2 pb-3 text-[0.72rem] font-medium transition sm:flex-row sm:justify-start sm:gap-2 sm:px-3.5 sm:pb-3.5 sm:text-sm ${
                        actief ? 'text-ink' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-full text-[0.72rem] font-semibold ring-1 transition ${
                          actief
                            ? 'bg-ink text-sand-50 ring-ink'
                            : klaar
                              ? 'bg-gold-100 text-gold-700 ring-gold-300'
                              : 'bg-paper text-ink-muted ring-sand-300'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="sm:hidden">{s.kort}</span>
                      <span className="hidden sm:inline">{s.label}</span>
                      {actief && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold-500" />}
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-sand-200/70" aria-busy="true" aria-label="Laden" />}>
        {stap === 'opmeten' && <Measure p={p} />}
        {stap === 'ontwerp' && <OntwerpScherm p={p} />}
        {stap === 'berekening' && <Calculation p={p} />}
        {stap === 'inkoop' && <Shopping p={p} />}
        {stap === 'offerte' && <Quote p={p} />}
        {stap === 'planning' && <PlanningScherm p={p} />}
        </Suspense>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-sand-300/70 bg-sand-100/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          {vorige ? (
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => ga(`/project/${p.id}/${vorige.id}`)}>
              <span className="hidden sm:inline">{vorige.label}</span>
              <span className="sm:hidden">Terug</span>
            </Button>
          ) : (
            <span className="hidden text-sm text-ink-muted sm:block">Stap 1 van {STAPPEN.length} · wijzigingen worden automatisch bewaard</span>
          )}
          {volgende ? (
            <Button className={vorige ? '' : 'w-full sm:w-auto'} onClick={() => ga(`/project/${p.id}/${volgende.id}`)}>
              Naar {volgende.label.toLowerCase()} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button icon={<FileText className="h-4 w-4" />} onClick={() => window.print()}>
              Afdrukken / PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
