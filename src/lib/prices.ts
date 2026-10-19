/**
 * Prijslaag van Maatklaar: één eigen prijslijst per aannemer (één prijs per artikel).
 *
 * LET OP: er zijn géén live prijzen gekoppeld. De voorbeeldprijzen hieronder zijn richtprijzen
 * (incl. btw) om de werking te tonen. Eigen prijzen (Prijzen beheren) gaan altijd voor.
 */
import type { BasisId, ProductId } from './calc'
import { DETAIL_ARTIKELEN } from './artikelen'

export interface PrijsAanbod {
  /** prijs in euro incl. btw per prijseenheid (m² bij tegels/matten, anders per verpakking/stuk) */
  prijs: number
  bron: 'eigen' | 'voorbeeld'
  /** afwijkende inhoud per verpakking (in de eenheid van het artikel) */
  inhoud?: number
  /** leverancier (vrije tekst), bijv. "Bouwvoordeel Barneveld" */
  leverancier?: string
  productNaam?: string
  link?: string
  /** ISO-datum waarop de prijs is bijgewerkt */
  bijgewerkt?: string
}

export interface PrijsBron {
  id: string
  naam: string
  /** true = alleen voorbeeldprijzen */
  isVoorbeeld: boolean
  peildatum: string
  aanbod(product: ProductId): PrijsAanbod | undefined
}

/** Voorbeeld-richtprijzen (incl. btw), één per artikel. */
const BASIS_PRIJZEN: Record<BasisId, number> = {
  // sloop & afvoer
  bigbag: 11.99,
  afdekset: 24.99,
  'container-3': 225,
  container: 275,
  'container-10': 335,
  'container-15': 395,
  afvalverwerking: 85,
  'stort-puin': 30,
  'stort-hout': 45,
  'stort-grond': 35,
  // ondergrond
  primer: 18.99,
  egaliseer: 23.99,
  dekvloer: 6.49,
  // leidingwerk
  waterleiding: 3.25,
  afvoerbuis: 6.99,
  afvoerbuis110: 14.99,
  koppelingen: 59,
  // elektra, verlichting & ventilatie
  aardlekgroep: 49.95,
  inbouwspot: 24.95,
  stopcontact: 12.99,
  installatiemateriaal: 45,
  ventilator: 89,
  ventilatiekanaal: 24.95,
  // waterdicht
  waterdicht: 66.99,
  afdichtband: 18.49,
  afdichtmanchet: 13.99,
  // verwarming
  'vv-mat': 43.99,
  'vv-thermostaat': 89.99,
  isolatieplaat: 6.49,
  designradiator: 329,
  radiatoraansluitset: 39.95,
  // tegels & vloer
  wandtegel: 45,
  vloertegel: 49.95,
  laminaat: 16.99,
  pvc: 29.99,
  ondervloer: 23.99,
  plint: 5.49,
  montagekit: 7.29,
  // lijm, voeg & toebehoren
  tegellijm: 21.99,
  voegmiddel: 12.49,
  tegelkruisjes: 4.49,
  // kit, profielen & afwerking
  kit: 8.29,
  profiel: 11.99,
  pleister: 17.99,
  verf: 39.49,
  // sanitair
  glaswand: 299,
  douchegoot: 199,
  regendouche: 389,
  ligbad: 299,
  badkraan: 149,
  badafvoer: 34.95,
  inbouwreservoir: 229,
  hangtoilet: 365,
  bedieningsplaat: 65,
  wastafelmeubel: 549,
  wastafelkraan: 115,
  spiegel: 139,
  sifon: 19.99,
  fontein: 109,
  // deur, dorpel & plafond
  binnendeur: 119,
  dorpel: 24.95,
  deurbeslag: 39.95,
  'pvc-plafond': 19.95,
  plafondprofielen: 34.95,
}

export const VOORBEELD_PRIJZEN: Partial<Record<ProductId, number>> = {
  ...BASIS_PRIJZEN,
  ...Object.fromEntries(DETAIL_ARTIKELEN.map(([id, , , , prijs]) => [id, prijs])),
}

export const VOORBEELD_PEILDATUM = '2026-10-19'

export const voorbeeldPrijsBron: PrijsBron = {
  id: 'voorbeeld',
  naam: 'Richtprijzen (voorbeeld)',
  isVoorbeeld: true,
  peildatum: VOORBEELD_PEILDATUM,
  aanbod(product) {
    const prijs = VOORBEELD_PRIJZEN[product]
    return prijs == null ? undefined : { prijs, bron: 'voorbeeld', bijgewerkt: VOORBEELD_PEILDATUM }
  },
}

/** Producten die per m² geprijsd worden (overige per verpakking/stuk/m). */
const PER_M2: ProductId[] = ['wandtegel', 'vloertegel', 'vv-mat', 'laminaat', 'pvc', 'pvc-plafond']
export const prijsEenheid = (id: ProductId) => (PER_M2.includes(id) ? 'm²' : id === 'waterleiding' ? 'm' : id === 'afvalverwerking' || id.startsWith('stort-') ? 'm³' : 'st.')

/**
 * Winkels uit het oude prijsmodel (tot versie 1.2 kon je per winkel prijzen invullen).
 * Alleen nog gebruikt om oude gegevens en bestanden om te zetten.
 */
export const OUDE_WINKELS = [
  { id: 'gamma', naam: 'Gamma' },
  { id: 'praxis', naam: 'Praxis' },
  { id: 'hornbach', naam: 'Hornbach' },
  { id: 'karwei', naam: 'Karwei' },
] as const
export type OudeWinkelId = (typeof OUDE_WINKELS)[number]['id']
export const oudeWinkelNaam = (id: string) => OUDE_WINKELS.find((w) => w.id === id)?.naam ?? id
