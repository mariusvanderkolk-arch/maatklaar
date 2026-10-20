import { MargeKaart } from '../components/MargeKaart'
import { Calculator, ChevronDown, Ruler, ListChecks } from 'lucide-react'
import { Card, CardHeader, Stat, LeegStaat, Button } from '../components/ui'
import { ga } from '../lib/router'
import { GROEP_ICONS } from '../components/groepIcons'
import { GROEPEN, REGELS, effectieveScope } from '../lib/calc'
import { getal } from '../lib/format'
import { useBerekening } from '../lib/useCalc'
import type { Project } from '../lib/types'

export function Calculation({ p }: { p: Project }) {
  const ber = useBerekening(p)
  const { oppervlakken: o, materialen } = ber
  const groepen = GROEPEN.map((g) => ({ ...g, regels: materialen.filter((m) => m.groep === g.id) })).filter((g) => g.regels.length)
  const sc = effectieveScope(p)
  const type = p.type
  const rijen: [string, string, boolean?][] = type === 'vloer'
    ? [
        ['Omtrek vloer', `${getal(o.omtrek)} m`],
        ['Af: deuren', `− ${getal(o.deurBreedte)} m`],
        ['Plinten (netto)', `${getal(o.plintLengte)} m`, true],
        ['Vloer', `${getal(o.vloer)} m²`, true],
      ]
    : type === 'keuken'
      ? [
          ['Omtrek vloer', `${getal(o.omtrek)} m`],
          [`Spatwand (${getal(p.afmetingen.spatwand.lengte)} × ${getal(p.afmetingen.spatwand.hoogte)} m)`, `${getal(o.spatwand)} m²`, true],
          ['Vloer', `${getal(o.vloer)} m²`, true],
        ]
      : [
    ['Omtrek vloer', `${getal(o.omtrek)} m`],
    [`Wand tot tegelhoogte (${getal(o.tegelhoogte)} m)`, `${getal(o.wandBruto)} m²`],
    ['Af: deuren en ramen in tegelzone', `− ${getal(o.openingenAftrek)} m²`],
    ['Te betegelen wand', `${getal(o.wandNetto)} m²`, true],
    ['Vloer', `${getal(o.vloer)} m²`, true],
    ['Plafond', `${getal(o.plafond)} m²`],
    ['Wand boven de tegels', `${getal(o.wandBovenTegels)} m²`],
    ...(sc.waterdicht ? ([['Waterdicht te maken (vloer + douchewand)', `${getal(o.waterdichtOppervlak)} m²`]] as [string, string][]) : []),
  ]

  return (
    <div className="space-y-5">
      <Card className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
          {type === 'vloer' ? (
            <Stat label="Plinten" value={<>{getal(o.plintLengte, 1)}<span className="ml-1 font-sans text-[0.8rem] font-medium text-ink-muted">m</span></>} sub={`omtrek ${getal(o.omtrek, 1)} m`} />
          ) : (
            <Stat label={type === 'keuken' ? 'Spatwand' : 'Wand netto'} value={<>{getal(o.wandNetto, 1)}<span className="ml-1 font-sans text-[0.8rem] font-medium text-ink-muted">m²</span></>} sub={type === 'keuken' ? 'achter het aanrecht' : `bruto ${getal(o.wandBruto, 1)} m²`} />
          )}
          <Stat label="Vloer" value={<>{getal(o.vloer, 1)}<span className="ml-1 font-sans text-[0.8rem] font-medium text-ink-muted">m²</span></>} sub={`${getal(p.afmetingen.lengte)} × ${getal(p.afmetingen.breedte)} m`} />
          <Stat label="Snijverlies" value={<>{getal(p.snijverlies, 1)}<span className="ml-1 font-sans text-[0.8rem] font-medium text-ink-muted">%</span></>} sub="instelbaar bij Opmeten" />
          <Stat label="Materialen" value={materialen.length} sub={`in ${groepen.length} groepen`} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5 lg:sticky lg:top-24">
          <Card>
            <CardHeader icon={<Ruler className="h-5 w-5" />} title="Oppervlakken" sub="Afgeleid van je ingevoerde maten" />
            <dl className="px-5 py-2 sm:px-6">
              {rijen.map(([k, v, nadruk]) => (
                <div key={k} className={`flex items-baseline justify-between gap-4 border-b border-sand-200 py-2.5 last:border-0 ${nadruk ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
                  <dt className="text-[0.85rem]">{k}</dt>
                  <dd className="tabnum text-[0.9rem] whitespace-nowrap">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <MargeKaart p={p} b={ber} />
          <details className="card group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-[0.98rem] font-semibold">Rekenregels</span>
                <span className="block text-[0.82rem] text-ink-muted">Vuistregels uit de praktijk</span>
              </span>
              <ChevronDown className="h-4.5 w-4.5 text-ink-muted transition group-open:rotate-180" />
            </summary>
            <ul className="space-y-2 border-t border-sand-200 px-5 py-4 text-[0.8rem] leading-relaxed text-ink-soft sm:px-6">
              <li>Tegellijm: 3,5 kg/m² (≤ 30 cm), 4,5 kg/m² (≤ 60 cm), 5,5 kg/m² (groter), zakken van {REGELS.lijmZakKg} kg.</li>
              <li>Voegmiddel: (A + B) / (A × B) × voegbreedte × tegeldikte × 1,6 kg/m², + 10% reserve.</li>
              <li>Primer: {getal(REGELS.primerLPerM2)} L/m² op alle te betegelen en te stucen vlakken.</li>
              <li>Waterdichting: {getal(REGELS.waterdichtKgPerM2, 1)} kg/m² (2 lagen) op de hele vloer en de douchewanden tot 2,10 m.</li>
              <li>Egaliseren: {getal(REGELS.egaliseerKgPerM2PerMm, 1)} kg per m² per mm laagdikte.</li>
              <li>Kit: ca. {REGELS.kitMeterPerKoker} m voeg per koker van 310 ml.</li>
              <li>Vloerverwarming: mat op ca. 70% van de vloer (vrij van douche, toilet en meubel).</li>
              <li>Keuken: spatwand = lengte werkblad × hoogte; kit langs werkblad en beide zijkanten.</li>
              <li>Laminaat/PVC: vloer + snijverlies, afgerond op hele pakken. Ondervloer: + 5% overlap, rol à {REGELS.ondervloerRolM2} m².</li>
              <li>Plinten: omtrek − deuren + 10% zaagverlies, lengtes van {getal(REGELS.plintLengteM, 1)} m; montagekit ca. {REGELS.montagekitMPerKoker} m per koker.</li>
            </ul>
          </details>
        </div>

        <Card>
          <CardHeader icon={<Calculator className="h-5 w-5" />} title="Benodigde materialen" sub="Inclusief snijverlies, afgerond op hele verpakkingen" />
          {groepen.length === 0 ? (
            <LeegStaat
              icon={<Calculator className="h-5 w-5" />}
              titel="Nog niets te berekenen"
              tekst="Kies eerst welke werkzaamheden je doet en vul bij Opmeten de maten in. Dan verschijnen hier alle materialen."
              actie={
                <Button variant="secondary" icon={<ListChecks className="h-4 w-4" />} onClick={() => ga(`/project/${p.id}/bewerken`)}>
                  Werkzaamheden kiezen
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-sand-200">
              {groepen.map((g) => {
                const Icon = GROEP_ICONS[g.id]
                return (
                  <section key={g.id} className="px-5 py-4 sm:px-6">
                    <h3 className="mb-2 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-gold-700">
                      <Icon className="h-3.5 w-3.5" /> {g.naam}
                    </h3>
                    <ul>
                      {g.regels.map((r) => (
                        <li key={r.id} className="flex items-start justify-between gap-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-[0.92rem] font-medium text-ink">
                              {r.naam}
                              {r.spec && <span className="ml-1.5 font-normal text-ink-muted">· {r.spec}</span>}
                            </p>
                            <p className="mt-0.5 text-[0.78rem] leading-snug text-ink-muted">{r.toelichting}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="tabnum text-[1.05rem] font-semibold text-ink">{r.aantal}×</p>
                            <p className="text-[0.75rem] whitespace-nowrap text-ink-muted">{r.verpakking}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
