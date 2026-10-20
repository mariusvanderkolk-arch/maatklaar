import { ChevronDown, EyeOff, PiggyBank } from 'lucide-react'
import { Card, CardHeader, NumberField } from './ui'
import { euro } from '../lib/format'
import { margeOverzicht, margeRegels, projectMarge, begrens } from '../lib/marge'
import { projectStore } from '../lib/store'
import type { berekenAlles } from '../lib/useCalc'
import type { Project } from '../lib/types'

/** Intern overzicht voor de aannemer: inkoop, marge, verkoop en verdiensten. De klant ziet dit nooit. */
export function MargeKaart({ p, b }: { p: Project; b: Pick<ReturnType<typeof berekenAlles>, 'inkoop' | 'arbeidKosten'> }) {
  const regels = margeRegels(p, b.inkoop.regels)
  const arbeid = (p.offerte?.metArbeid ?? true) ? b.arbeidKosten : 0
  const o = margeOverzicht(regels, arbeid)
  const zetProject = (v: number) => projectStore.werkBij(p.id, (x) => ({ ...x, marge: begrens(v) }))
  const zetRegel = (k: string, v: number) =>
    projectStore.werkBij(p.id, (x) => ({ ...x, margeRegels: { ...(x.margeRegels ?? {}), [k]: begrens(v) } }))
  const wisRegel = (k: string) =>
    projectStore.werkBij(p.id, (x) => {
      const r = { ...(x.margeRegels ?? {}) }
      delete r[k]
      return { ...x, margeRegels: r }
    })
  const rij = (label: string, waarde: number, nadruk = false, sub?: string) => (
    <div className={`flex items-baseline justify-between gap-4 border-b border-sand-200 py-2.5 last:border-0 ${nadruk ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
      <dt className="text-[0.88rem]">
        {label}
        {sub && <span className="block text-[0.74rem] font-normal text-ink-muted">{sub}</span>}
      </dt>
      <dd className="tabnum text-[0.95rem] whitespace-nowrap">{euro(waarde)}</dd>
    </div>
  )
  return (
    <div data-testid="marge-kaart">
    <Card>
      <CardHeader icon={<PiggyBank className="h-5 w-5" />} title="Marge en verdiensten" sub="Alleen voor jou, niet zichtbaar voor de klant" />
      <div className="space-y-4 px-5 pt-1 pb-5 sm:px-6">
        <NumberField label="Marge op materiaal (%)" unit="%" decimals={1} min={0} value={projectMarge(p)} onChange={zetProject} hint="Wordt verwerkt in de materiaalprijzen op de offerte. 0 = uit." />
        <dl>
          {rij('Inkoop materiaal', o.inkoop)}
          {rij(`Marge materiaal`, o.marge)}
          {rij('Verkoop materiaal (op offerte)', o.verkoop, true)}
          {rij('Arbeid', o.arbeid)}
          {rij('Jouw verdiensten', o.verdiensten, true, `marge + arbeid · ${euro(o.exBtw.verdiensten)} excl. btw`)}
        </dl>
        <p className="flex items-start gap-2 rounded-xl bg-sand-50 px-3 py-2.5 text-[0.76rem] leading-relaxed text-ink-muted ring-1 ring-sand-200">
          <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Bedragen incl. 21% btw. De marge wordt over het bedrag excl. btw gerekend; de btw komt er daarna weer bij.
        </p>
        {regels.length > 0 && (
          <details className="group rounded-xl ring-1 ring-sand-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-[0.88rem] font-semibold [&::-webkit-details-marker]:hidden">
              Marge per materiaal
              <ChevronDown className="h-4 w-4 text-ink-muted transition group-open:rotate-180" />
            </summary>
            <ul className="divide-y divide-sand-200 border-t border-sand-200">
              {regels.map((r) => {
                const eigen = Boolean(p.margeRegels && r.sleutel in p.margeRegels)
                return (
                  <li key={r.sleutel} className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[0.84rem] text-ink">{r.naam}</p>
                      <p className="tabnum text-[0.74rem] text-ink-muted">
                        {euro(r.inkoop)} → {euro(r.verkoop)}
                        {eigen && (
                          <button type="button" onClick={() => wisRegel(r.sleutel)} className="ml-2 underline underline-offset-2 hover:text-ink">
                            standaard
                          </button>
                        )}
                      </p>
                    </div>
                    <NumberField label="Marge" compact unit="%" decimals={1} min={0} value={r.pct} onChange={(v) => zetRegel(r.sleutel, v)} />
                  </li>
                )
              })}
            </ul>
          </details>
        )}
      </div>
    </Card>
    </div>
  )
}
