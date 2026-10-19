import { HuisIllustratie } from '../components/HuisIllustratie'
import { useEffect, useRef, useState } from 'react'
import { ReviewsBlok } from '../components/Beoordeel'
import { reviewDialoog, reviewStatus } from '../lib/reviews'
import { Verhuiskaart } from '../components/Verhuiskaart'
import { ArrowRight, Calculator, Camera, ChevronRight, ClipboardList, MapPin, Plus, ShoppingCart, Sparkles, Tags } from 'lucide-react'
import { Badge, Button, Eyebrow, Notice } from '../components/ui'
import { APP_VERSIE_KORT } from '../lib/versie'
import { backupHerinnering } from '../lib/backup'
import { backupStatus } from '../lib/backupActies'
import { euro, getal, kortDatum } from '../lib/format'
import { ga } from '../lib/router'
import { useProjecten } from '../lib/store'
import { useBerekening } from '../lib/useCalc'
import { actieveScope, ruimteLabel } from '../lib/ruimtes'
import type { Project } from '../lib/types'

const STAPPEN = [
  { icon: ClipboardList, titel: 'Project', tekst: 'Klant en werkzaamheden vastleggen' },
  { icon: Camera, titel: 'Opmeten', tekst: "Foto's en maten van de ruimte" },
  { icon: Calculator, titel: 'Berekening', tekst: 'Oppervlakken en materialen' },
  { icon: ShoppingCart, titel: 'Inkooplijst', tekst: 'Met je eigen prijslijst' },
]


function useGrootScherm() {
  const [groot, zet] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 1024px)').matches)
  useEffect(() => {
    const m = window.matchMedia?.('(min-width: 1024px)')
    if (!m) return
    const h = () => zet(m.matches)
    m.addEventListener?.('change', h)
    return () => m.removeEventListener?.('change', h)
  }, [])
  return groot
}

export function Home() {
  const projecten = useProjecten()
  const groot = useGrootScherm()
  const heroVideo = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    // Op telefoons: eerst de poster, de video pas starten als de pagina geladen en rustig is.
    const v = heroVideo.current
    if (!v || groot || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let klaar = false
    const start = () => { if (klaar) return; klaar = true; v.preload = 'auto'; v.play().catch(() => {}) }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    const naLaden = () => (w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 1200))
    if (document.readyState === 'complete') naLaden()
    else window.addEventListener('load', naLaden, { once: true })
    return () => window.removeEventListener('load', naLaden)
  }, [groot])
  const gesorteerd = [...projecten].sort((a, b) => b.updatedAt - a.updatedAt)
  const bk = backupStatus.use()
  const [vraagReview, setVraagReview] = useState(() => reviewStatus.moetVragen())
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
                <Badge tone="gold">Versie {APP_VERSIE_KORT} · gratis</Badge>
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
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.13] lg:pointer-events-auto lg:relative lg:inset-auto lg:min-h-[360px] lg:border-l lg:border-sand-200 lg:opacity-100">
              <img src={`${import.meta.env.BASE_URL}hero-loop-poster.webp`} alt="" width={600} height={634} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-contain object-[center_80%] lg:object-cover" />
              <video
                ref={heroVideo}
                className="absolute inset-0 h-full w-full object-contain object-[center_80%] motion-reduce:hidden lg:object-cover"
                autoPlay={groot}
                muted
                loop
                playsInline
                preload={groot ? 'metadata' : 'none'}
                poster={`${import.meta.env.BASE_URL}hero-loop-poster.webp`}
              >
                <source src={`${import.meta.env.BASE_URL}hero-loop.webm`} type="video/webm" />
                <source src={`${import.meta.env.BASE_URL}hero-loop.mp4`} type="video/mp4" />
              </video>
              <div className="absolute inset-x-0 top-[22%] px-3 lg:hidden" data-woordmerk>
                <svg viewBox="0 0 1000 230" className="block w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
                  <text x="500" y="182" textAnchor="middle" textLength="980" lengthAdjust="spacingAndGlyphs" fill="#2b2620" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="600" fontSize="250">
                    Maatklaar
                  </text>
                </svg>
              </div>
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

        {/* Privacybelofte */}
        <section className="mt-8" data-vertrouwen>
          <div className="flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/40 px-5 py-4 sm:px-6">
            <span aria-hidden className="mt-0.5 text-lg">🔒</span>
            <div className="min-w-0 text-sm leading-relaxed">
              <p className="font-semibold text-ink">Jouw projecten blijven op jouw eigen apparaat. Wij zien je klanten en prijzen niet.</p>
              <p className="mt-1 text-ink-soft">
                Deel je een offerte, dan staat die veilig en afgeschermd in een versleutelde EU-database en verloopt de link vanzelf.{' '}
                <a href="#/privacy" className="font-medium text-gold-700 underline underline-offset-2 hover:text-ink">Lees de privacyverklaring</a>
              </p>
            </div>
          </div>
        </section>

        {/* Uitlegvideo */}
        <section className="mt-10" aria-labelledby="zo-werkt-titel" data-uitlegvideo>
          <div className="card overflow-hidden">
            <div className="px-5 pt-5 sm:px-8 sm:pt-6">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-gold-700">Uitleg in 76 seconden</p>
              <h2 id="zo-werkt-titel" className="mt-1 text-xl font-semibold text-ink">Zo werkt Maatklaar</h2>
              <p className="mt-1 text-sm text-ink-soft">Van project aanmaken en opmeten tot offerte met je eigen logo, laten tekenen en factuur.</p>
            </div>
            <div className="p-3 sm:p-5">
              <video
                className="aspect-video w-full rounded-xl bg-sand-100 ring-1 ring-sand-200"
                controls
                playsInline
                preload="none"
                poster={`${import.meta.env.BASE_URL}uitleg-poster-960.jpg`}
              >
                <source src={`${import.meta.env.BASE_URL}uitleg.mp4`} type="video/mp4" />
                Je browser kan deze video niet afspelen.
              </video>
            </div>
          </div>
        </section>

        {/* Nieuw in deze versie */}
        <section className="mt-10">
          <div className="card overflow-hidden">
            <div className="flex flex-col gap-4 bg-gradient-to-br from-gold-100/50 via-sand-50 to-paper px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:py-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-200/80 text-gold-700 ring-1 ring-gold-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-gold-700">Nieuw in versie {APP_VERSIE_KORT}</p>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">
                  <strong className="font-semibold text-ink">Inspreken</strong>: tik op de microfoon, zeg bijvoorbeeld “badkamer 2 bij 3 meter, tegels tot plafond,
                  inloopdouche, container 6 kuub” en Maatklaar vult ruimte, maten en onderdelen in. Je controleert alles eerst. Bekijk ook het voorbeeldproject
                  met alle onderdelen, van sloop en container tot afwerking.
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

        <ReviewsBlok className="mt-10" />

        {/* Projecten */}
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Overzicht</Eyebrow>
              <h2 className="mt-1.5 text-[2rem] leading-none font-semibold">Je projecten</h2>
            </div>
            {projecten.length > 0 && <p className="pb-1 text-sm text-ink-muted">{projecten.length} {projecten.length === 1 ? 'project' : 'projecten'}</p>}
          </div>
          {vraagReview && (
            <Notice
              className="mb-5"
              title="Bevalt Maatklaar?"
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { reviewStatus.later(); setVraagReview(false) }}>
                    Later
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => { reviewStatus.later(); setVraagReview(false); reviewDialoog.open() }}>
                    Beoordeel Maatklaar
                  </Button>
                </div>
              }
            >
              Je hebt al een paar offertes gemaakt. Wil je de app kort beoordelen? Dat kost een halve minuut.
            </Notice>
          )}
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
                {gesorteerd.every((p) => p.voorbeeld) ? (
                  <>
                    <HuisIllustratie className="h-auto w-full max-w-[260px]" />
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Plus className="h-4 w-4 text-gold-600" /> Start je eerste eigen project</span>
                  </>
                ) : (
                  <>
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-paper ring-1 ring-sand-300 transition group-hover:ring-gold-300">
                      <Plus className="h-5 w-5 text-gold-600" />
                    </span>
                    <span className="text-sm font-medium">Nieuw project starten</span>
                  </>
                )}
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
          <dt className="text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted">Vloer</dt>
          <dd className="tabnum mt-0.5 text-[0.95rem] font-semibold">{getal(o.vloer, 1)} m²</dd>
        </div>
        <div>
          <dt className="text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted">{p.type === 'vloer' ? 'Plinten' : p.type === 'keuken' ? 'Spatwand' : 'Wand'}</dt>
          <dd className="tabnum mt-0.5 text-[0.95rem] font-semibold">{p.type === 'vloer' ? `${getal(o.plintLengte, 1)} m` : `${getal(o.wandNetto, 1)} m²`}</dd>
        </div>
        <div>
          <dt className="text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted">Richtprijs</dt>
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
      <HuisIllustratie className="h-auto w-full max-w-[320px]" />
      <h3 className="mt-4 text-[1.7rem] font-semibold">Nog geen projecten</h3>
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
