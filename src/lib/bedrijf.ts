/** Bedrijfsprofiel en offerte-instellingen (lokaal op dit apparaat). */
import { maakLokaleStore } from './lokaal'
import { sleutel } from './modus'

export interface Bedrijf {
  /** standaard marge op materiaal (%) voor nieuwe projecten; 0 = uit */
  margeMateriaal?: number
  naam: string
  contactpersoon: string
  telefoon: string
  email: string
  adres: string
  website: string
  kvk: string
  btw: string
  iban: string
  /** logo als data-URL (verkleind) */
  logo?: string
  /** voorvoegsel offertenummer, bijv. "OF-" */
  nummerPrefix: string
  /** volgend volgnummer */
  volgnummer: number
  /** geldigheid van een offerte in dagen */
  geldigheidDagen: number
  betaaltermijn: string
  /** factuurnummering, los van offertes */
  factuurPrefix: string
  factuurVolgnummer: number
  /** betaaltermijn factuur in dagen */
  betaalDagen: number
  /** eigen Google-reviewlink (voor het reviewverzoek na tekenen) */
  googleReviewUrl?: string
}

export const standaardBedrijf = (): Bedrijf => ({
  naam: '',
  contactpersoon: '',
  telefoon: '',
  email: '',
  adres: '',
  website: '',
  kvk: '',
  btw: '',
  iban: '',
  nummerPrefix: 'OF-',
  volgnummer: 1,
  geldigheidDagen: 30,
  betaaltermijn: 'Betaling binnen 14 dagen na oplevering.',
  factuurPrefix: 'F-',
  factuurVolgnummer: 1,
  betaalDagen: 14,
  margeMateriaal: 0,
})

export const bedrijfStore = maakLokaleStore<Bedrijf>(sleutel('bedrijf:v1'), standaardBedrijf)
export const useBedrijf = bedrijfStore.use

/** Nieuw offertenummer, bijv. "OF-2026-007", en hoog de teller op. */
export function nieuwOffertenummer(jaar = new Date().getFullYear()): string {
  const b = bedrijfStore.get()
  const nr = `${b.nummerPrefix}${jaar}-${String(Math.max(1, Math.floor(b.volgnummer))).padStart(3, '0')}`
  bedrijfStore.set({ ...b, volgnummer: Math.max(1, Math.floor(b.volgnummer)) + 1 })
  return nr
}

/** Verkleint een logo naar max. 320 px (PNG behoudt transparantie). */
export async function verkleinLogo(file: File, max = 320): Promise<string> {
  const bmp = await createImageBitmap(file)
  const schaal = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * schaal)
  c.height = Math.round(bmp.height * schaal)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  const png = c.toDataURL('image/png')
  // grote foto-achtige logo's als JPEG (kleiner)
  return png.length > 120_000 ? c.toDataURL('image/jpeg', 0.85) : png
}

/** IBAN-controle (lengte + mod-97). Leeg = geldig (optioneel veld). */
export function ibanGeldig(iban: string): boolean {
  const s = iban.replace(/\s/g, '').toUpperCase()
  if (!s) return true
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false
  if (s.startsWith('NL') && s.length !== 18) return false
  const omgezet = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
  let rest = 0
  for (const c of omgezet) rest = (rest * 10 + Number(c)) % 97
  return rest === 1
}

export const emailGeldig = (e: string) => !e.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())
export const kvkGeldig = (k: string) => !k.trim() || /^\d{8}$/.test(k.replace(/\s/g, ''))
/** NL-btw-nummer: NL + 9 cijfers + B + 2 cijfers (bijv. NL123456789B01). */
export const btwGeldig = (b: string) => !b.trim() || /^NL\d{9}B\d{2}$/i.test(b.replace(/[\s.]/g, ''))

/** Standaardmarge voor nieuwe projecten (0 = uit). */
export const standaardMarge = (): number => {
  const m = bedrijfStore.get().margeMateriaal
  return typeof m === 'number' && Number.isFinite(m) ? Math.min(200, Math.max(0, m)) : 0
}
