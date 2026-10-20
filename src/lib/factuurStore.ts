import { track } from './analytics'
/** Opslag van facturen (lokaal) en het aanmaken van een factuur met een nieuw nummer. */
import { maakLokaleStore } from './lokaal'
import { bedrijfStore } from './bedrijf'
import { uid } from './defaults'
import { maakFactuur, maakTermijnen, normaliseerFactuur, volgendFactuurnummer, type Factuur, type FactuurRegel } from './factuur'
import type { OfferteData } from './offerte'
import { vandaag } from './planning'
import { sleutel } from './modus'

export const factuurStore = maakLokaleStore<Factuur[]>(sleutel('facturen:v1'), () => [], (ruw) =>
  Array.isArray(ruw) ? ruw.map(normaliseerFactuur).filter((f): f is Factuur => f != null) : [],
)
export const useFacturen = () => factuurStore.use()

/**
 * Maakt in één keer een conceptfactuur van een offerte, of meerdere termijnfacturen (bijv. 30/60/10%).
 * Nummers lopen door in de gewone factuurnummering. Geeft de eerste factuur terug (of null bij opslagfout).
 */
/** extra: regels (bijv. goedgekeurd meer-/minderwerk) die op de laatste (eind)factuur komen. */
export function factuurVanOfferte(d: OfferteData, projectId: string, termijnen: number[] = [100], extra: FactuurRegel[] = []): Factuur | null {
  const b = bedrijfStore.get()
  const datum = vandaag()
  const jaar = Number(datum.slice(0, 4))
  const prefix = b.factuurPrefix || 'F-'
  const bestaand = factuurStore.get().map((f) => f.nummer)
  const nummers: string[] = []
  let teller = b.factuurVolgnummer
  for (let i = 0; i < termijnen.length; i++) {
    const r = volgendFactuurnummer(prefix, teller, [...bestaand, ...nummers], jaar)
    nummers.push(r.nummer)
    teller = r.volgendeTeller
  }
  const basis = maakFactuur(d, { id: uid(), nummer: nummers[0], projectId, datum, betaalDagen: b.betaalDagen || 14, nu: Date.now(), uid })
  const lijst = maakTermijnen(basis, termijnen, nummers, uid)
  if (extra.length) {
    const l = lijst.length - 1
    lijst[l] = { ...lijst[l], regels: [...lijst[l].regels, ...extra], notitie: `${lijst[l].notitie}${lijst[l].notitie ? ' ' : ''}Inclusief goedgekeurd meer-/minderwerk.` }
  }
  if (!factuurStore.set([...lijst, ...factuurStore.get()])) return null
  bedrijfStore.set({ ...bedrijfStore.get(), factuurVolgnummer: teller })
  track('factuur_created', { detail: termijnen.length > 1 ? `termijnen_${termijnen.length}` : undefined })
  return lijst[0]
}

export const werkFactuurBij = (id: string, wijzig: (f: Factuur) => Factuur) => factuurStore.update((l) => l.map((f) => (f.id === id ? wijzig(f) : f)))
