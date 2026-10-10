import { track } from './analytics'
/** Opslag van facturen (lokaal) en het aanmaken van een factuur met een nieuw nummer. */
import { maakLokaleStore } from './lokaal'
import { bedrijfStore } from './bedrijf'
import { uid } from './defaults'
import { maakFactuur, normaliseerFactuur, volgendFactuurnummer, type Factuur } from './factuur'
import type { OfferteData } from './offerte'
import { vandaag } from './planning'
import { sleutel } from './modus'

export const factuurStore = maakLokaleStore<Factuur[]>(sleutel('facturen:v1'), () => [], (ruw) =>
  Array.isArray(ruw) ? ruw.map(normaliseerFactuur).filter((f): f is Factuur => f != null) : [],
)
export const useFacturen = () => factuurStore.use()

/** Maakt in één keer een conceptfactuur van een offerte. Geeft de nieuwe factuur terug (of null bij opslagfout). */
export function factuurVanOfferte(d: OfferteData, projectId: string): Factuur | null {
  const b = bedrijfStore.get()
  const datum = vandaag()
  const { nummer, volgendeTeller } = volgendFactuurnummer(b.factuurPrefix || 'F-', b.factuurVolgnummer, factuurStore.get().map((f) => f.nummer), Number(datum.slice(0, 4)))
  const f = maakFactuur(d, { id: uid(), nummer, projectId, datum, betaalDagen: b.betaalDagen || 14, nu: Date.now(), uid })
  if (!factuurStore.set([f, ...factuurStore.get()])) return null
  bedrijfStore.set({ ...bedrijfStore.get(), factuurVolgnummer: volgendeTeller })
  track('factuur_created')
  return f
}

export const werkFactuurBij = (id: string, wijzig: (f: Factuur) => Factuur) => factuurStore.update((l) => l.map((f) => (f.id === id ? wijzig(f) : f)))
