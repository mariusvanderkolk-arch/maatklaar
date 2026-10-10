/**
 * Prijslaag van Maatklaar.
 *
 * LET OP: er zijn géén live prijzen gekoppeld. De tabel hieronder bevat
 * richtprijzen als VOORBEELD, zodat de werking van de app te zien is.
 *
 * Echte prijzen koppelen: maak een eigen `PrijsBron` (bijvoorbeeld een bron die
 * een JSON-bestand of een eigen API uitleest) en geef die door aan
 * `maakInkooplijst`. De rest van de app hoeft daarvoor niet te veranderen.
 */
import type { ProductId } from './calc'

export type WinkelId = 'gamma' | 'praxis' | 'hornbach' | 'karwei'

export interface Winkel {
  id: WinkelId
  naam: string
}

export const WINKELS: Winkel[] = [
  { id: 'gamma', naam: 'Gamma' },
  { id: 'praxis', naam: 'Praxis' },
  { id: 'hornbach', naam: 'Hornbach' },
  { id: 'karwei', naam: 'Karwei' },
]

export const winkelNaam = (id: WinkelId) => WINKELS.find((w) => w.id === id)?.naam ?? id

export interface PrijsAanbod {
  winkel: WinkelId
  /** prijs in euro incl. btw per prijseenheid (m² bij tegels/matten, anders per verpakking/stuk) */
  prijs: number
  /** herkomst van de prijs; ontbreekt = volgt uit `PrijsBron.isVoorbeeld` */
  bron?: 'eigen' | 'voorbeeld'
  /** afwijkende inhoud per verpakking bij deze winkel (in de eenheid van het artikel) */
  inhoud?: number
  productNaam?: string
  link?: string
  /** ISO-datum waarop de prijs is bijgewerkt */
  bijgewerkt?: string
}

export interface PrijsBron {
  id: string
  naam: string
  /** true = voorbeeldprijzen, geen actuele winkelprijzen */
  isVoorbeeld: boolean
  /** datum waarop de prijzen zijn vastgesteld (ISO) */
  peildatum: string
  aanbiedingen(product: ProductId): PrijsAanbod[]
}

/**
 * Voorbeeld-richtprijzen (incl. btw) per winkel. `null` = niet in (voorbeeld)assortiment.
 * Volgorde per regel: Gamma, Praxis, Hornbach, Karwei.
 */
export const VOORBEELD_PRIJSTABEL: Record<ProductId, [number | null, number | null, number | null, number | null]> = {
  wandtegel: [24.95, 23.99, 21.95, 25.99],
  vloertegel: [32.95, 34.99, 29.95, 33.99],
  tegellijm: [22.99, 21.49, 19.95, 23.49],
  voegmiddel: [12.49, 11.99, 12.95, 12.99],
  tegelkruisjes: [4.99, 4.49, 3.95, 5.29],
  primer: [19.99, 18.49, 17.95, 20.99],
  egaliseer: [24.99, 23.99, 21.95, 25.49],
  waterdicht: [69.99, 64.99, 62.95, 71.99],
  afdichtband: [18.99, 17.99, 19.95, 18.49],
  afdichtmanchet: [14.99, 13.99, 12.95, null],
  'vv-mat': [44.95, 42.99, 39.95, 46.99],
  'vv-thermostaat': [89.99, 84.99, 94.95, 89.99],
  isolatieplaat: [6.99, 6.49, 5.95, 7.29],
  kit: [8.49, 7.99, 8.95, 8.29],
  profiel: [11.99, 12.49, 10.95, 12.99],
  pleister: [18.99, 17.99, 16.95, 19.49],
  verf: [39.99, 37.99, 41.95, 38.99],
  glaswand: [249.0, 269.0, 229.0, 259.0],
  douchegoot: [119.0, 109.0, 114.95, 124.0],
  regendouche: [189.0, 199.0, 179.0, 194.0],
  inbouwreservoir: [219.0, 209.0, 199.0, 229.0],
  hangtoilet: [179.0, 169.0, 184.0, 189.0],
  bedieningsplaat: [39.99, 34.99, 36.95, 42.99],
  wastafelmeubel: [399.0, 379.0, 389.0, 419.0],
  wastafelkraan: [69.99, 74.99, 64.95, 72.99],
  spiegel: [89.99, 94.99, 84.95, 99.99],
  sifon: [19.99, 21.99, 18.95, 19.49],
  bigbag: [12.99, 11.99, 10.95, null],
  afdekset: [24.99, 22.99, null, 26.99],
  fontein: [119.0, 109.0, 99.95, 124.0],
  laminaat: [17.99, 16.49, 14.95, 18.49],
  pvc: [29.99, 31.99, 27.95, 32.49],
  ondervloer: [24.99, 22.99, 21.95, 25.99],
  plint: [5.99, 5.49, 4.95, 6.29],
  montagekit: [7.49, 6.99, 6.95, 7.99],
}

export const VOORBEELD_PEILDATUM = '2026-09-01'

export const voorbeeldPrijsBron: PrijsBron = {
  id: 'voorbeeld',
  naam: 'Richtprijzen (voorbeeld)',
  isVoorbeeld: true,
  peildatum: VOORBEELD_PEILDATUM,
  aanbiedingen(product) {
    const rij = VOORBEELD_PRIJSTABEL[product]
    if (!rij) return []
    return WINKELS.flatMap((w, i) =>
      rij[i] == null ? [] : [{ winkel: w.id, prijs: rij[i] as number, bron: 'voorbeeld' as const, bijgewerkt: VOORBEELD_PEILDATUM }],
    )
  },
}

/** Producten die per m² geprijsd worden (overige per verpakking/stuk). */
const PER_M2: ProductId[] = ['wandtegel', 'vloertegel', 'vv-mat', 'laminaat', 'pvc']
export const prijsEenheid = (id: ProductId) => (PER_M2.includes(id) ? 'm²' : 'st.')
