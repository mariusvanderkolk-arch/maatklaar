import { codeerOfferte, type OfferteData } from './offerte'

/** Schermformaten voor het klant-voorbeeld (CSS-pixels). */
export const APPARATEN = [
  { id: 'desktop', label: 'Desktop', breedte: 1280, hoogte: 800 },
  { id: 'tablet', label: 'Tablet', breedte: 820, hoogte: 1180 },
  { id: 'mobiel', label: 'Mobiel', breedte: 390, hoogte: 844 },
] as const
export type Apparaat = (typeof APPARATEN)[number]['id']

/** Markering in de hash: dit is een voorbeeld voor de aannemer, geen echte klantweergave. */
export const VOORBEELD_VLAG = 'voorbeeld=1'
export const isVoorbeeld = (hash: string) => hash.includes(`?${VOORBEELD_VLAG}`)

/** Zelfde klantpagina als de gedeelde link, maar zonder telling als "bekeken". */
export const voorbeeldUrl = (d: OfferteData, basis = location.pathname) => `${basis}#/offerte-bekijken/${codeerOfferte(d)}?${VOORBEELD_VLAG}`

/** Schaal waarmee een apparaatbreedte in de beschikbare ruimte past (nooit groter dan 1). */
export const schaalVoor = (breedte: number, ruimte: number) => (ruimte > 0 ? Math.min(1, ruimte / breedte) : 1)
