import { Verhuiskaart } from '../components/Verhuiskaart'
import { ArrowRight, Calculator, Camera, ChevronRight, ClipboardList, FolderOpen, MapPin, Plus, ShoppingCart, Sparkles, Tags } from 'lucide-react'
import { Plattegrond } from '../components/Plattegrond'
import { Badge, Button, Eyebrow, Notice } from '../components/ui'
import { APP_VERSIE_KORT } from '../lib/versie'
import { backupHerinnering } from '../lib/backup'
import { backupStatus } from '../lib/backupActies'
import { euro, getal, kortDatum } from '../lib/format'
import { ga } from '../lib/router'
import { useProjecten } from '../lib/store'
import { useBerekening } from '../lib/useCalc'
import { standaardAfmetingen, standaardScope } from '../lib/defaults'
import { actieveScope, ruimteLabel } from '../lib/ruimtes'
import type { Project } from '../lib/types'

const STAPPEN = [
  { icon: ClipboardList, titel: 'Project', tekst: 'Klant en werkzaamheden vastleggen' },
  { icon: Camera, titel: 'Opmeten', tekst: "Foto's en maten van de ruimte" },
  { icon: Calculator, titel: 'Berekening', tekst: 'Oppervlakken en materialen' },
  { icon: ShoppingCart, titel: 'Inkooplijst', tekst: 'Met je eigen prijslijst' },
]

const heroAfm = { ...standaardAfmetingen(), lengte: 2.8, breedte: 2.2, openingen: [
  { id: 'd', type: 'deur' as const, breedte: 0.83, hoogte: 2.11, vanafVloer: 0 },
  { id: 'r', type: 'raam' as const, breedte: 0.6, hoogte: 0.8, vanafVloer: 1.4 },
] }

export function Home() {
  const projecten = useProjecten()
  const gesorteerd = [...projecten].sort((a, b) => b.updatedAt - a.updatedAt)
  const bk = backupStatus.use()
  const herinner = backupHerinnering({ projecten, laatsteBackup: bk.laatste, gesnoozed: bk.later })
  return (
    <div className="bg-grain">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <Verhuiskaart />
        {/* Hero */}
        <section className="card relative overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_1fr]">
            <div className="relative z-10 self-center px-6 pt-8 pb-8 sm:px-10 sm:pt-12 lg:pb-12">
              <div className="flex flex-wrap items-center gap-2">
                <Eyebrow>Badkamer · toilet · keuken · vloer</Eyebrow>
                <Badge tone="gold">Versie {APP_VERSIE_KORT} · nu gratis</Badge>
              </div>
              <h1 className="mt-3 text-[2.5rem] leading-[1.02] font-semibold text-ink sm:text-[3.4rem]">
                Van opmeten tot offerte, <span className="text-gold-600 italic">helder</span> op de bouw.
              </h1>
              <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-ink-soft">
                Voor aannemers: meet de ruimte in, reken materialen en uren uit, vul je eigen inkoopprijzen in en stuur
                de klant een nette offerte — alles op je telefoon, zonder abonnement.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Button size="lg" className="w-full sm:w-auto" icon={<Plus className="h-4.5 w-4.5" />} onClick={() => ga('/nieuw')}>
                  Nieuw project
                </Button>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto" icon={<Tags className="h-4.5 w-4.5" />} onClick={() => ga('/prijzen')}>
                  Prijzen beheren
                </Button>
              </div>
              {gesorteerd[0] && (
                <button type="button" onClick={() => ga(`/project/${gesorteerd[0].id}/berekening`)} className="mt-3 text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink">
                  Of bekijk eerst een voorbeeldproject
                </button>
              )}
            </div>
            <div className="relative hidden h-full min-h-[360px] items-center justify-center border-l border-sand-200 bg-sand-50/80 px-8 py-8 lg:flex">
              <div className="absolute top-5 left-6 flex items-center gap-2">
                <Badge tone="gold">Plattegrond</Badge>
                <span className="text-xs text-ink-muted">wordt live getekend</span>
              </div>
              <Plattegrond afmetingen={heroAfm} scope={standaardScope()} className="w-full max-w-[400px]" bg="#F8F4ED" />
            </div>
          </div>
          <ol className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-sand-200 px-6 py-6 sm:px-10 md:grid-cols-4">
            {STAPPEN.map((s, i) => (
              <li key={s.titel} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700 ring-1 ring-gold-200">
                  <s.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    <span className="mr-1 text-gold-600">{i + 1}.</span>
                    {s.titel}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-muted">{s.tekst}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Nieuw in deze versie */}
        <section className="mt-10">
          <div className="card overflow-hidden">
            <div className="flex flex-col gap-4 bg-gradient-to-br from-gold-100/50 via-sand-50 to-paper px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-200/80 text-gold-700 ring-1 ring-gold-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-gold-700">Nieuw in versie {APP_VERSIE_KORT}</p>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">
                  Slimmer Wonen heet nu <strong className="font-semibold text-ink">Maatklaar</strong>: je projecten, prijzen en account blijven gewoon staan.
                  Plus Ontwerp: teken de ruimte als plattegrond met douche, toilet, meubel en tegels, bekijk hem in 3D en zet het ontwerp op de
                  offerte en in de klantlink. Werkt met je vinger op de telefoon. Nog steeds gratis; gegevens blijven op dit apparaat.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 self-start sm:self-center"
                onClick={() => {
                  const vb = projecten.find((x) => x.voorbeeld && x.type === 'badkamer')
                  ga(vb ? `/project/${vb.id}/ontwerp` : '/over')
                }}
              >
                Bekijk het voorbeeld
              </Button>
            </div>
          </div>
        </section>

        {/* Projecten */}
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Overzicht</Eyebrow>
              <h2 className="mt-1.5 text-[2rem] leading-none font-semibold">Je projecten</h2>
            </div>
            {projecten.length > 0 && <p className="pb-1 text-sm text-ink-muted">{projecten.length} {projecten.length === 1 ? 'project' : 'projecten'}</p>}
          </div>
          {herinner && (
            <Notice
              className="mb-5"
              title={bk.laatste ? 'Tijd voor een nieuwe back-up' : 'Maak een back-up van je projecten'}
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => backupStatus.set({ ...bk, later: Date.now() + 7 * 24 * 3600e3 })}>
                    Later
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => ga('/instellingen/backup')}>
                    Back-up maken
                  </Button>
                </div>
              }
            >
              Je projecten staan alleen in deze browser. Met een back-upbestand raak je niets kwijt als je browsergegevens wist of van toestel wisselt.
            </Notice>
          )}
          {gesorteerd.length === 0 ? (
            <LeegOverzicht />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {gesorteerd.map((p) => (
                <ProjectKaart key={p.id} p={p} />
              ))}
              <button
                type="button"
                onClick={() => ga('/nieuw')}
                className="group flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sand-400/80 text-ink-muted transition hover:border-gold-400 hover:bg-paper/60 hover:text-ink"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-paper ring-1 ring-sand-300 transition group-hover:ring-gold-300">
                  <Plus className="h-5 w-5 text-gold-600" />
                </span>
                <span className="text-sm font-medium">Nieuw project starten</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ProjectKaart({ p }: { p: Project }) {
  const { oppervlakken: o, inkoop } = useBerekening(p)
  const aantal = actieveScope(p.type, p.scope).length
  return (
    <button
      type="button"
      onClick={() => ga(`/project/${p.id}/opmeten`)}
      className="card group flex min-w-0 flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-lift sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge tone="gold">{ruimteLabel(p.type)}</Badge>
            {p.voorbeeld && <Badge>Voorbeeld</Badge>}
          </div>
          <h3 className="truncate text-[1.6rem] leading-tight font-semibold text-ink">{p.naam || 'Naamloos project'}</h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-ink-muted">
            {p.klant || 'Geen klant'}
            {p.adres && (
              <>
                <span className="text-sand-400">·</span>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{p.adres}</span>
              </>
            )}
          </p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand-100 text-ink-soft transition group-hover:bg-ink group-hover:text-sand-50">
          <ChevronRight className="h-4.5 w-4.5" />
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-sand-50 px-4 py-3.5 ring-1 ring-sand-200">
        <div>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-muted">Vloer</dt>
          <dd className="tabnum mt-0.5 text-[0.95rem] font-semibold">{getal(o.vloer, 1)} m²</dd>
        </div>
        <div>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-muted">{p.type === 'vloer' ? 'Plinten' : p.type === 'keuken' ? 'Spatwand' : 'Wand'}</dt>
          <dd className="tabnum mt-0.5 text-[0.95rem] font-semibold">{p.type === 'vloer' ? `${getal(o.plintLengte, 1)} m` : `${getal(o.wandNetto, 1)} m²`}</dd>
        </div>
        <div>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-muted">Richtprijs</dt>
          <dd className="tabnum mt-0.5 text-[0.95rem] font-semibold">{euro(Math.round(inkoop.totaal))}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
        <span>
          {aantal} werkzaamheden · {p.fotos.length} foto{p.fotos.length === 1 ? '' : "'s"}
        </span>
        <span>Bijgewerkt {kortDatum(p.updatedAt)}</span>
      </div>
    </button>
  )
}

function LeegOverzicht() {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold-100 text-gold-600 ring-1 ring-gold-200">
        <FolderOpen className="h-7 w-7" />
      </span>
      <h3 className="mt-5 text-[1.7rem] font-semibold">Nog geen projecten</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
        Start je eerste project: badkamer, toilet, keuken of vloer. Binnen een paar minuten heb je oppervlakken, materialen en een inkooplijst.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => ga('/nieuw')}>
          Nieuw project
        </Button>
        <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />} onClick={() => ga('/over')}>
          Hoe werkt het?
        </Button>
      </div>
    </div>
  )
}
