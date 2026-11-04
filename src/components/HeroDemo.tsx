import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Minus, Plus } from 'lucide-react'
import { Plattegrond } from './Plattegrond'
import { Button } from './ui'
import { ga } from '../lib/router'
import { getal } from '../lib/format'
import { HERO_MAX, HERO_MIN, HERO_ONDERDELEN, heroAfmetingen, oppervlakken, projectUitDemo, startStaat, verstel, wissel, type HeroDemoStaat } from '../lib/heroDemo'
import { track } from '../lib/analytics'
import { projectStore } from '../lib/store'
import { useProjectToegang } from '../lib/billing/store'
import { standaardMarge } from '../lib/bedrijf'

/** Tikbare voorbeeld-badkamer in de hero. Alleen in het geheugen, nooit opgeslagen. */
export function HeroDemo({ compact = false }: { compact?: boolean }) {
  const [s, zetRuw] = useState(startStaat)
  const toegang = useProjectToegang()
  const ref = useRef<HTMLDivElement>(null)
  const geteld = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const o = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        track('demo_bekeken')
        o.disconnect()
      }
    }, { threshold: 0.5 })
    o.observe(el)
    return () => o.disconnect()
  }, [])
  const zet = (n: HeroDemoStaat, soort: 'maat' | 'onderdeel' = 'maat') => {
    if (!geteld.current) {
      geteld.current = true
      track('demo_interactie', { detail: soort })
    }
    zetRuw(n)
  }
  const maakVanKlus = () => {
    track('demo_cta')
    if (!toegang.mag) return ga('/nieuw') // bestaande betaalmuur/inlog
    const m = standaardMarge()
    const p = projectUitDemo(s, m > 0 ? { marge: m } : {})
    projectStore.voegToe(p)
    track('project_created')
    ga(`/project/${p.id}/opmeten`)
  }
  const opp = oppervlakken(s)
  const maat = (k: 'lengte' | 'breedte', label: string) => (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-2.5 py-1.5 ring-1 ring-sand-200">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <span className="flex items-center gap-1.5">
        <button type="button" aria-label={`${label} 10 cm kleiner`} disabled={s[k] <= HERO_MIN} onClick={() => zet({ ...s, [k]: verstel(s[k], -1) })} className="grid h-9 w-9 place-items-center rounded-lg bg-sand-100 text-ink transition-colors hover:bg-sand-200 focus-visible:outline-2 focus-visible:outline-gold-500 disabled:opacity-40 motion-reduce:transition-none"><Minus className="h-4 w-4" /></button>
        <output aria-live="polite" className="w-14 text-center text-sm font-semibold tabular-nums text-ink">{getal(s[k], 1)} m</output>
        <button type="button" aria-label={`${label} 10 cm groter`} disabled={s[k] >= HERO_MAX} onClick={() => zet({ ...s, [k]: verstel(s[k], 1) })} className="grid h-9 w-9 place-items-center rounded-lg bg-sand-100 text-ink transition-colors hover:bg-sand-200 focus-visible:outline-2 focus-visible:outline-gold-500 disabled:opacity-40 motion-reduce:transition-none"><Plus className="h-4 w-4" /></button>
      </span>
    </div>
  )
  return (
    <div className={`flex h-full flex-col gap-3 ${compact ? '' : 'p-6 sm:p-8'}`} ref={ref} data-testid="hero-demo" role="group" aria-label="Probeer het: voorbeeld-badkamer">
      <p className="text-sm font-semibold text-ink">Probeer het maar: <span className="font-normal text-ink-soft">verschuif de maten van deze badkamer.</span></p>
      <div className="rounded-2xl bg-[#FFFDF9] p-2 ring-1 ring-sand-200">
        <Plattegrond afmetingen={heroAfmetingen(s)} scope={s.aan} type="badkamer" className={compact ? 'mx-auto max-h-56 w-full' : 'mx-auto max-h-72 w-full'} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {maat('lengte', 'Lengte')}
        {maat('breedte', 'Breedte')}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Onderdelen">
        {HERO_ONDERDELEN.map((o) => (
          <button key={o.id} type="button" aria-pressed={s.aan[o.id]} onClick={() => zet(wissel(s, o.id), 'onderdeel')}
            className={`h-9 rounded-full px-3.5 text-xs font-medium ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-gold-500 motion-reduce:transition-none ${s.aan[o.id] ? 'bg-gold-100 text-gold-700 ring-gold-300' : 'bg-white/70 text-ink-muted ring-sand-200'}`}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-soft" aria-live="polite">
        Vloer <strong className="text-ink">{getal(opp.vloer, 2)} m²</strong> · tegelwand ca. <strong className="text-ink">{getal(opp.wand, 1)} m²</strong> — dit rekent Maatklaar meteen voor je uit.
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <Button size="lg" icon={<ArrowRight className="h-4.5 w-4.5" />} onClick={maakVanKlus} data-testid="hero-demo-start">Maak dit van jouw klus</Button>
        <span className="text-xs text-ink-muted">Probeer het gratis · maten en sanitair gaan mee</span>
      </div>
    </div>
  )
}
