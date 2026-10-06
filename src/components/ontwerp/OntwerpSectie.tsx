/** Ontwerp-blok op de offerte (afdruk én klantlink): plattegrond, optioneel 3D-beeld en (in de klantlink) zelf in 3D kijken. */
import { Suspense, useMemo, useState } from 'react'
import { Box } from 'lucide-react'
import { formaatVan, kleurVan, uitCompact, type CompactOntwerp } from '../../lib/ontwerp/model'
import { webglBeschikbaar } from '../../lib/ontwerp/webgl'
import { laadLater } from '../../lib/lazy'
import { OntwerpPlan } from './OntwerpPlan'

const Ontwerp3D = laadLater(() => import('./Ontwerp3D').then((m) => m.Ontwerp3D))

export function OntwerpSectie({ ow, beeld3d, interactief3d }: { ow: CompactOntwerp; beeld3d?: string | null; interactief3d?: boolean }) {
  const data = useMemo(() => uitCompact(ow), [ow])
  const [open3d, setOpen3d] = useState(false)
  const kan3d = useMemo(() => interactief3d && webglBeschikbaar(), [interactief3d])
  if (!data) return null
  const { ontwerp, kamer } = data
  const vloer = `${kleurVan(ontwerp.vloer.kleur).naam}, ${formaatVan(ontwerp.vloer.formaat).naam} cm`
  const wand = `${kleurVan(ontwerp.wand.kleur).naam}, ${formaatVan(ontwerp.wand.formaat).naam} cm`
  return (
    <section className="avoid-break mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-[1.35rem] font-semibold">Ontwerp</h2>
        <p className="text-[0.78rem] text-ink-muted">
          {kamer.L} × {kamer.B} cm · indicatief ontwerp
        </p>
      </div>
      <div className={`mt-3 grid gap-3 ${beeld3d ? 'sm:grid-cols-2 print:grid-cols-2' : ''}`}>
        <figure className="overflow-hidden rounded-xl bg-[#FBF8F2] ring-1 ring-sand-200">
          <OntwerpPlan kamer={kamer} ontwerp={ontwerp} className="block h-auto w-full" titel={`Plattegrond ${kamer.L} × ${kamer.B} cm`} />
          <figcaption className="sr-only">Plattegrond (bovenaanzicht)</figcaption>
        </figure>
        {beeld3d && (
          <figure className="overflow-hidden rounded-xl ring-1 ring-sand-200">
            <img src={beeld3d} alt="3D-impressie van het ontwerp" className="block h-full w-full object-cover" />
          </figure>
        )}
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-[0.8rem] sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-ink-muted">Vloertegel</dt>
          <dd className="font-medium">{vloer}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-muted">{kamer.tegelH > 0 ? 'Wandtegel' : kamer.type === 'keuken' ? 'Spatwand' : 'Wand'}</dt>
          <dd className="font-medium">{wand}</dd>
        </div>
      </dl>
      {kan3d && (
        <div className="no-print mt-3">
          {open3d ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-sand-300">
              <Suspense fallback={<div className="grid h-[340px] place-items-center text-sm text-ink-muted">3D laden…</div>}>
                <Ontwerp3D kamer={kamer} ontwerp={ontwerp} className="h-[360px] sm:h-[440px]" onFout={() => setOpen3d(false)} />
              </Suspense>
              <p className="bg-sand-50 px-3 py-1.5 text-[0.72rem] text-ink-muted">Sleep om te draaien · knijp om te zoomen</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen3d(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-paper px-4 text-sm font-medium ring-1 ring-sand-400/80 ring-inset hover:ring-gold-400"
            >
              <Box className="h-4 w-4" /> Bekijk in 3D
            </button>
          )}
        </div>
      )}
    </section>
  )
}
