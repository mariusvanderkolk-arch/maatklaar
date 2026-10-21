import { InsprekenKnop } from '../components/Inspreken'
import { pasInspraakToe } from '../lib/inspraak'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { AppWindow, ScanLine, CookingPot, DoorOpen, Layers, LayoutGrid, Plus, Ruler, Settings2, ShowerHead, Trash2 } from 'lucide-react'
import { Fotos } from '../components/Fotos'

const AiAnalyse = lazy(() => import('../components/AiAnalyse'))
const ArMeten = lazy(() => import('../components/ArMeten'))
import { Plattegrond } from '../components/Plattegrond'
import { toast } from '../components/Toast'
import { Button, Card, CardHeader, NumberField } from '../components/ui'
import { LEGVLOER_PAK, uid } from '../lib/defaults'
import { effectieveScope } from '../lib/calc'
import { APPARATEN, WERKBLADEN, keukenVan, type KeukenSpec } from '../lib/keuken'
import { getal } from '../lib/format'
import { projectStore } from '../lib/store'
import { useBerekening } from '../lib/useCalc'
import type { Afmetingen, LegvloerSpec, Opening, Project, TileSpec } from '../lib/types'

const WAND_PRESETS: (TileSpec & { label: string })[] = [
  { label: '20 × 20', lengte: 20, breedte: 20, m2PerDoos: 1.0, dikte: 8, voeg: 2 },
  { label: '30 × 60', lengte: 60, breedte: 30, m2PerDoos: 1.44, dikte: 9, voeg: 2 },
  { label: '7,5 × 30', lengte: 30, breedte: 7.5, m2PerDoos: 0.5, dikte: 8, voeg: 2 },
  { label: '60 × 120', lengte: 120, breedte: 60, m2PerDoos: 1.44, dikte: 9, voeg: 2 },
]
const VLOER_PRESETS: (TileSpec & { label: string })[] = [
  { label: '30 × 30', lengte: 30, breedte: 30, m2PerDoos: 1.08, dikte: 9, voeg: 3 },
  { label: '30 × 60', lengte: 60, breedte: 30, m2PerDoos: 1.44, dikte: 9, voeg: 3 },
  { label: '60 × 60', lengte: 60, breedte: 60, m2PerDoos: 1.44, dikte: 10, voeg: 3 },
  { label: '60 × 120', lengte: 120, breedte: 60, m2PerDoos: 1.44, dikte: 10, voeg: 3 },
]

function Chip({ actief, children, onClick }: { actief?: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={!!actief}
      onClick={onClick}
      className={`tabnum h-11 rounded-full px-3.5 sm:h-8 sm:px-3 text-[0.8rem] font-medium ring-1 ring-inset transition ${
        actief ? 'bg-ink text-sand-50 ring-ink' : 'bg-white/70 text-ink-soft ring-sand-300 hover:ring-gold-400'
      }`}
    >
      {children}
    </button>
  )
}

export function Measure({ p }: { p: Project }) {
  const { oppervlakken: o } = useBerekening(p)
  const a = p.afmetingen
  const upd = (f: (x: Project) => Project) => projectStore.werkBij(p.id, f)
  const setA = (patch: Partial<Afmetingen>) => upd((x) => ({ ...x, afmetingen: { ...x.afmetingen, ...patch } }))
  const setOpening = (id: string, patch: Partial<Opening>) =>
    setA({ openingen: a.openingen.map((op) => (op.id === id ? { ...op, ...patch } : op)) })
  const nieuweOpening = (type: Opening['type']) =>
    setA({
      openingen: [
        ...a.openingen,
        type === 'deur'
          ? { id: uid(), type, breedte: 0.83, hoogte: 2.11, vanafVloer: 0 }
          : { id: uid(), type, breedte: 0.6, hoogte: 0.6, vanafVloer: 1.4 },
      ],
    })
  const setTegel = (k: 'wandtegel' | 'vloertegel', patch: Partial<TileSpec>) => upd((x) => ({ ...x, [k]: { ...x[k], ...patch } }))
  const tegelhoogteVol = Math.abs(a.tegelhoogte - a.hoogte) < 0.005
  const type = p.type
  const s = effectieveScope(p)
  const setLegvloer = (patch: Partial<LegvloerSpec>) => upd((x) => ({ ...x, legvloer: { ...x.legvloer, ...patch } }))
  /** Vloertype voor vloer/woonkamer: laminaat, PVC of tegelvloer */
  const vloerKeuze = s.vloertegels && !s.legvloer ? 'tegel' : p.legvloer.soort
  const kiesVloer = (k: 'laminaat' | 'pvc' | 'tegel') =>
    upd((x) => ({
      ...x,
      scope: { ...x.scope, legvloer: k !== 'tegel', vloertegels: k === 'tegel', ondervloer: k === 'tegel' ? false : x.scope.ondervloer || !x.scope.legvloer },
      legvloer: k === 'tegel' ? x.legvloer : { soort: k, m2PerPak: x.legvloer.soort === k ? x.legvloer.m2PerPak : LEGVLOER_PAK[k] },
    }))
  const toonTegelhoogte = s.wandtegels && (type === 'badkamer' || type === 'toilet')
  const [ar, setAr] = useState<'dicht' | 'open' | null>(null)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-5">
        <Fotos p={p} />
        <Suspense fallback={<div className="card h-40 animate-pulse" aria-hidden="true" />}>
          <AiAnalyse p={p} />
        </Suspense>

        <Card>
          <CardHeader
            icon={<Ruler className="h-5 w-5" />}
            title="Afmetingen ruimte"
            sub={type === 'vloer' ? 'Binnenmaten van de vloer in meters, van wand tot wand.' : 'Binnenmaten in meters, gemeten van wand tot wand.'}
            action={
              <div className="flex flex-wrap justify-end gap-2">
              <InsprekenKnop type={type} onToepassen={(r) => (upd((x) => pasInspraakToe(x, r)), toast('Overgenomen uit je inspraak'))} />
              <Button size="sm" variant="secondary" icon={<ScanLine className="h-4 w-4" />} onClick={() => setAr('open')} title="Meten met de camera via WebXR (beta)">
                AR <span className="text-[0.75rem] font-semibold tracking-wide text-gold-700 uppercase">beta</span>
              </Button>
              </div>
            }
          />
          {ar && (
            <Suspense fallback={null}>
              <ArMeten
                open={ar === 'open'}
                onClose={() => setAr('dicht')}
                onGebruik={(veld, v) => {
                  if (veld === 'hoogte') setA({ hoogte: v, tegelhoogte: tegelhoogteVol ? v : Math.min(a.tegelhoogte, v) })
                  else setA({ [veld]: v })
                  setAr('dicht')
                  toast(`${veld[0].toUpperCase() + veld.slice(1)} ingevuld: ${getal(v)} m`)
                }}
              />
            </Suspense>
          )}
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 sm:p-6">
            <NumberField label="Lengte" unit="m" value={a.lengte} onChange={(v) => setA({ lengte: v })} />
            <NumberField label="Breedte" unit="m" value={a.breedte} onChange={(v) => setA({ breedte: v })} />
            <NumberField label="Hoogte" unit="m" value={a.hoogte} onChange={(v) => setA({ hoogte: v, tegelhoogte: tegelhoogteVol ? v : Math.min(a.tegelhoogte, v) })} />
            {toonTegelhoogte && <div className="col-span-2 sm:col-span-3">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <NumberField label="Tegelhoogte wand" tip="Tot welke hoogte de wanden worden betegeld. Boven de tegels valt de wand onder stucwerk (als je dat aanvinkt)." unit="m" value={a.tegelhoogte} onChange={(v) => setA({ tegelhoogte: v })} />
                <div className="col-span-1 flex flex-wrap items-end gap-2 pb-2 sm:col-span-2">
                  <Chip actief={tegelhoogteVol} onClick={() => setA({ tegelhoogte: a.hoogte })}>
                    Tot plafond
                  </Chip>
                  <Chip actief={Math.abs(a.tegelhoogte - 2.1) < 0.005} onClick={() => setA({ tegelhoogte: Math.min(2.1, a.hoogte) })}>
                    2,10 m
                  </Chip>
                  <Chip actief={Math.abs(a.tegelhoogte - 1.2) < 0.005} onClick={() => setA({ tegelhoogte: 1.2 })}>
                    Halfhoog
                  </Chip>
                </div>
              </div>
            </div>}
          </div>
        </Card>

        {type === 'keuken' && s.spatwand && (
          <Card>
            <CardHeader icon={<CookingPot className="h-5 w-5" />} title="Spatwand achter het aanrecht" sub="Het te betegelen stuk wand tussen werkblad en bovenkastjes of afzuigkap." />
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 sm:p-6">
              <NumberField label="Lengte werkblad" unit="m" value={a.spatwand.lengte} onChange={(v) => setA({ spatwand: { ...a.spatwand, lengte: v } })} hint="Inclusief een eventuele hoek." />
              <NumberField label="Hoogte spatwand" unit="m" value={a.spatwand.hoogte} onChange={(v) => setA({ spatwand: { ...a.spatwand, hoogte: v } })} />
              <div className="col-span-2 flex flex-wrap items-end gap-2 pb-2 sm:col-span-1">
                {[0.6, 0.65, 0.7].map((h) => (
                  <Chip key={h} actief={Math.abs(a.spatwand.hoogte - h) < 0.005} onClick={() => setA({ spatwand: { ...a.spatwand, hoogte: h } })}>
                    {getal(h * 100, 0)} cm
                  </Chip>
                ))}
              </div>
            </div>
          </Card>
        )}

        {type === 'keuken' && (s.keukenDemontage || s.keukenMontage || s.werkblad || s.uitsparingen || s.apparatuur) && (() => {
          const k = keukenVan(p)
          const setK = (patch: Partial<KeukenSpec>) => upd((x) => ({ ...x, keuken: { ...keukenVan(x), ...patch } }))
          return (
            <Card>
              <CardHeader icon={<CookingPot className="h-5 w-5" />} title="Keuken" sub="Strekkende meters kasten, het werkblad en welke apparatuur je inbouwt en aansluit." />
              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <NumberField label="Onderkasten" unit="m" value={k.onderkastM} onChange={(v) => setK({ onderkastM: v })} hint="Strekkende meter, ook de werkbladlengte." />
                  <NumberField label="Bovenkasten" unit="m" value={k.bovenkastM} onChange={(v) => setK({ bovenkastM: v })} hint="0 als er geen bovenkasten komen." />
                  {Math.abs(k.onderkastM - a.spatwand.lengte) > 0.005 && a.spatwand.lengte > 0 && (
                    <div className="col-span-2 flex items-end pb-2 sm:col-span-1">
                      <Chip onClick={() => setK({ onderkastM: a.spatwand.lengte })}>Gelijk aan werkblad ({getal(a.spatwand.lengte)} m)</Chip>
                    </div>
                  )}
                </div>
                {(s.werkblad || s.uitsparingen) && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-ink">Werkblad</p>
                    <div role="radiogroup" aria-label="Soort werkblad" className="grid grid-cols-3 gap-1 rounded-xl bg-sand-100 p-1 ring-1 ring-sand-200">
                      {WERKBLADEN.map((w) => (
                        <button key={w.id} type="button" role="radio" aria-checked={k.werkblad === w.id} onClick={() => setK({ werkblad: w.id })}
                          className={`h-11 rounded-lg text-sm font-medium transition ${k.werkblad === w.id ? 'bg-white text-ink shadow-sm ring-1 ring-sand-300' : 'text-ink-soft'}`}>
                          {w.naam}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">{k.werkblad === 'laminaat' ? 'Zelf op maat zagen, incl. uitsparingen.' : 'Op maat geleverd door de steenhouwer; uitsparingen worden per stuk gerekend.'}</p>
                  </div>
                )}
                {s.apparatuur && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-ink">Inbouwapparatuur aansluiten</p>
                    <div className="flex flex-wrap gap-2">
                      {APPARATEN.map((ap) => (
                        <Chip key={ap.id} actief={k.apparaten[ap.id]} onClick={() => setK({ apparaten: { ...k.apparaten, [ap.id]: !k.apparaten[ap.id] } })}>{ap.naam}</Chip>
                      ))}
                    </div>
                    {k.apparaten.afzuigkap && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip actief={k.afzuigBuiten} onClick={() => setK({ afzuigBuiten: true })}>Afvoer naar buiten</Chip>
                        <Chip actief={!k.afzuigBuiten} onClick={() => setK({ afzuigBuiten: false })}>Recirculatie</Chip>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )
        })()}

        {type === 'vloer' && (
          <Card>
            <CardHeader icon={<Layers className="h-5 w-5" />} title="Nieuwe vloer" sub="Kies het type vloer. Laminaat en PVC worden per pak gerekend, tegels per doos." />
            <div className="p-5 sm:p-6">
              <div role="radiogroup" aria-label="Type vloer" className="grid grid-cols-3 gap-1 rounded-xl bg-sand-100 p-1 ring-1 ring-sand-200">
                {(
                  [
                    ['laminaat', 'Laminaat'],
                    ['pvc', 'PVC'],
                    ['tegel', 'Tegelvloer'],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={vloerKeuze === k && (s.legvloer || s.vloertegels)}
                    onClick={() => kiesVloer(k)}
                    className={`h-10 rounded-lg text-sm font-medium transition ${
                      vloerKeuze === k && (s.legvloer || s.vloertegels) ? 'bg-paper text-ink shadow-sm ring-1 ring-sand-300' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {s.legvloer && (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <NumberField label="m² per pak" unit="m²" value={p.legvloer.m2PerPak} onChange={(v) => setLegvloer({ m2PerPak: v })} hint="Staat op de verpakking." />
                </div>
              )}
              {s.legvloer && s.vloertegels && (
                <p className="mt-3 text-[0.8rem] text-rust">Je hebt zowel een klikvloer als een tegelvloer gekozen; beide worden gerekend.</p>
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader
            icon={<DoorOpen className="h-5 w-5" />}
            title={type === 'vloer' || type === 'keuken' ? 'Deuren' : 'Deuren & ramen'}
            sub={
              type === 'vloer'
                ? 'Deurbreedtes gaan af van de plinten.'
                : type === 'keuken'
                  ? 'Deurbreedtes gaan af van de omtrek (plinten/naden).'
                  : 'Openingen worden van het wandoppervlak afgetrokken, voor zover ze in de tegelzone vallen.'
            }
          />
          <div className="p-5 sm:p-6">
            {a.openingen.length === 0 && <p className="mb-4 text-sm text-ink-muted">Geen openingen. Voeg een deur of raam toe.</p>}
            <ul className="space-y-3">
              {a.openingen.map((op, i) => (
                <li key={op.id} className="rounded-xl bg-sand-50 p-3.5 ring-1 ring-sand-200 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      {op.type === 'deur' ? <DoorOpen className="h-4 w-4 text-gold-600" /> : <AppWindow className="h-4 w-4 text-gold-600" />}
                      {op.type === 'deur' ? 'Deur' : 'Raam'} {a.openingen.filter((x, j) => x.type === op.type && j <= i).length}
                    </p>
                    <button
                      type="button"
                      aria-label="Opening verwijderen"
                      onClick={() => setA({ openingen: a.openingen.filter((x) => x.id !== op.id) })}
                      className="grid h-11 w-11 place-items-center rounded-lg text-ink-muted sm:h-8 sm:w-8 hover:bg-rust/10 hover:text-rust"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <NumberField compact label="Breedte" unit="m" value={op.breedte} onChange={(v) => setOpening(op.id, { breedte: v })} />
                    <NumberField compact label="Hoogte" unit="m" value={op.hoogte} onChange={(v) => setOpening(op.id, { hoogte: v })} />
                    {op.type === 'raam' ? (
                      <NumberField compact label="Vanaf vloer" unit="m" value={op.vanafVloer} onChange={(v) => setOpening(op.id, { vanafVloer: v })} />
                    ) : (
                      <div className="min-w-0">
                        <p className="mb-1.5 truncate text-[0.8rem] font-medium text-ink-soft">{type === 'vloer' || type === 'keuken' ? 'Omtrek' : 'Aftrek'}</p>
                        <p className="tabnum flex h-11 items-center text-sm text-ink-muted">
                          {type === 'vloer' || type === 'keuken' ? `− ${getal(op.breedte)} m` : `${getal(op.breedte * Math.min(op.hoogte, o.tegelhoogte))} m²`}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => nieuweOpening('deur')}>
                Deur
              </Button>
              {(type === 'badkamer' || type === 'toilet') && (
                <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => nieuweOpening('raam')}>
                  Raam
                </Button>
              )}
            </div>
          </div>
        </Card>

        {s.inloopdouche && (
          <Card>
            <CardHeader icon={<ShowerHead className="h-5 w-5" />} title="Douchezone" sub="Bepaalt de waterdichting op de wand, de kitvoegen en de lengte van de douchegoot." />
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 sm:p-6">
              <NumberField label="Breedte" unit="m" value={a.douche.breedte} onChange={(v) => setA({ douche: { ...a.douche, breedte: v } })} />
              <NumberField label="Diepte" unit="m" value={a.douche.diepte} onChange={(v) => setA({ douche: { ...a.douche, diepte: v } })} />
            </div>
          </Card>
        )}

        {(s.wandtegels || s.vloertegels || s.spatwand) && (
          <Card>
            <CardHeader icon={<LayoutGrid className="h-5 w-5" />} title="Tegels" sub="Formaat en verpakking bepalen het aantal dozen, de lijm en de voeg." />
            <div className="divide-y divide-sand-200">
              {(s.wandtegels || s.spatwand) && (
                <TegelVelden titel={type === 'keuken' ? 'Tegel spatwand' : 'Wandtegel'} tegel={p.wandtegel} presets={WAND_PRESETS} onChange={(t) => setTegel('wandtegel', t)} />
              )}
              {s.vloertegels && (
                <TegelVelden titel="Vloertegel" tegel={p.vloertegel} presets={VLOER_PRESETS} onChange={(t) => setTegel('vloertegel', t)} />
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader icon={<Settings2 className="h-5 w-5" />} title="Uitgangspunten" sub="Pas aan op de klus en je eigen werkwijze." />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <NumberField label={type === 'vloer' && s.legvloer ? 'Snijverlies vloer' : 'Snijverlies tegels'} tip="Extra materiaal voor zaagwerk en breuk. Wordt opgeteld bij de berekende m² voordat het aantal dozen of pakken wordt bepaald." unit="%" decimals={1} value={p.snijverlies} onChange={(v) => upd((x) => ({ ...x, snijverlies: Math.min(v, 50) }))} />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(type === 'vloer' && s.legvloer ? [5, 7, 10] : [5, 10, 15]).map((n) => (
                  <Chip key={n} actief={p.snijverlies === n} onClick={() => upd((x) => ({ ...x, snijverlies: n }))}>
                    {n}%
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-xs leading-snug text-ink-muted">
                {type === 'vloer' && s.legvloer
                  ? '5–7% bij recht leggen; 10% of meer bij visgraat of veel hoeken.'
                  : '10% is gangbaar; 15% bij diagonaal leggen of veel hoeken.'}
              </p>
            </div>
            {s.egaliseren && (
              <NumberField
                label="Laagdikte egaliseren"
                tip="Bepaalt het aantal zakken egaliseermiddel (ca. 1,6 kg per m² per mm)."
                unit="mm"
                decimals={1}
                value={a.egaliseerDikte}
                onChange={(v) => setA({ egaliseerDikte: v })}
                hint="Gemiddelde laagdikte over de hele vloer."
              />
            )}
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24">
        <Card className="overflow-hidden">
          <div className="border-b border-sand-200 px-5 py-4">
            <p className="text-[0.98rem] font-semibold">Plattegrond</p>
            <p className="text-[0.82rem] text-ink-muted">Schematisch, schaalt mee met je maten</p>
          </div>
          <div className="bg-sand-50/70 px-4 py-4">
            <Plattegrond type={type} afmetingen={a} scope={s} vloertegel={s.vloertegels ? p.vloertegel : undefined} bg="#FAF7F1" className="mx-auto w-full max-w-[320px]" />
          </div>
          <dl className="grid grid-cols-2 gap-px border-t border-sand-200 bg-sand-200">
            {(type === 'vloer'
              ? [
                  ['Vloer', `${getal(o.vloer)} m²`],
                  ['Omtrek', `${getal(o.omtrek)} m`],
                  ['Plinten', `${getal(o.plintLengte)} m`],
                  ['Deuren', `− ${getal(o.deurBreedte)} m`],
                ]
              : type === 'keuken'
                ? [
                    ['Vloer', `${getal(o.vloer)} m²`],
                    ['Spatwand', `${getal(o.spatwand)} m²`],
                    ['Omtrek', `${getal(o.omtrek)} m`],
                    ['Werkblad', `${getal(a.spatwand.lengte)} m`],
                  ]
                : [
                    ['Vloer', `${getal(o.vloer)} m²`],
                    ['Wand (netto)', `${getal(o.wandNetto)} m²`],
                    ['Omtrek', `${getal(o.omtrek)} m`],
                    ['Openingen', `− ${getal(o.openingenAftrek)} m²`],
                  ]
            ).map(([k, v]) => (
              <div key={k} className="bg-paper px-5 py-3.5">
                <dt className="text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted">{k}</dt>
                <dd className="tabnum mt-0.5 text-[1.05rem] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </aside>
    </div>
  )
}

function TegelVelden({
  titel,
  tegel,
  presets,
  onChange,
}: {
  titel: string
  tegel: TileSpec
  presets: (TileSpec & { label: string })[]
  onChange: (t: Partial<TileSpec>) => void
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{titel}</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((pr) => (
            <Chip
              key={pr.label}
              actief={pr.lengte === tegel.lengte && pr.breedte === tegel.breedte}
              onClick={() => onChange({ lengte: pr.lengte, breedte: pr.breedte, m2PerDoos: pr.m2PerDoos, dikte: pr.dikte })}
            >
              {pr.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <NumberField compact label="Lengte" unit="cm" decimals={1} value={tegel.lengte} onChange={(v) => onChange({ lengte: v })} />
        <NumberField compact label="Breedte" unit="cm" decimals={1} value={tegel.breedte} onChange={(v) => onChange({ breedte: v })} />
        <NumberField compact label="Per doos" tip="Hoeveel m² tegels er in één doos zitten. Staat op de doos of de productpagina." unit="m²" value={tegel.m2PerDoos} onChange={(v) => onChange({ m2PerDoos: v })} />
        <NumberField compact label="Dikte" tip="Tegeldikte in mm. Samen met formaat en voeg bepaalt dit hoeveel voegmiddel nodig is." unit="mm" decimals={1} value={tegel.dikte} onChange={(v) => onChange({ dikte: v })} />
        <NumberField compact label="Voeg" tip="Voegbreedte in mm. Gangbaar: 2–3 mm bij grote tegels, 3–5 mm bij kleine tegels." unit="mm" decimals={1} value={tegel.voeg} onChange={(v) => onChange({ voeg: v })} />
      </div>
    </div>
  )
}
