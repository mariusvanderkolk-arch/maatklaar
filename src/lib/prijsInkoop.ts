/** Prijs van een inkoopregel zetten op de eigen prijslijst of een eigen artikel. */
import { CATALOGUS } from './catalogus'
import type { ProductId } from './calc'
import { eigenArtikelStore } from './eigenArtikelen'
import { prijsStore } from './prijsStore'

export type PrijsDoel = 'catalogus' | 'eigen-artikel' | 'onbekend'

export function prijsDoel(id: string): PrijsDoel {
  if (CATALOGUS.some((c) => c.id === id)) return 'catalogus'
  if (id.startsWith('eigen-') && eigenArtikelStore.alle().some((a) => a.id === id)) return 'eigen-artikel'
  return 'onbekend'
}

/** Slaat een inkoopprijs (incl. btw) op. Geldt daarna voor alle projecten. */
export function zetInkoopPrijs(id: string, prijs: number): PrijsDoel {
  const doel = prijsDoel(id)
  const bedrag = Math.round(Math.max(0, prijs) * 100) / 100
  if (doel === 'catalogus') prijsStore.zet(id as ProductId, { prijs: bedrag })
  else if (doel === 'eigen-artikel') eigenArtikelStore.werkBij(id, { prijs: bedrag })
  return doel
}
