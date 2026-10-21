/**
 * Keukenmontage: maten (strekkende meters), werkbladsoort en inbouwapparatuur.
 * Materiaal- en arbeidsregels voor de keukenwerkzaamheden. Puur; geen opslag.
 */
import type { Project } from './types'

export type WerkbladSoort = 'laminaat' | 'composiet' | 'graniet'
export type Apparaat = 'kookplaat' | 'oven' | 'vaatwasser' | 'koelkast' | 'afzuigkap'

export const WERKBLADEN: { id: WerkbladSoort; naam: string }[] = [
  { id: 'laminaat', naam: 'Laminaat' },
  { id: 'composiet', naam: 'Composiet' },
  { id: 'graniet', naam: 'Graniet' },
]
export const APPARATEN: { id: Apparaat; naam: string }[] = [
  { id: 'kookplaat', naam: 'Kookplaat' },
  { id: 'oven', naam: 'Oven' },
  { id: 'vaatwasser', naam: 'Vaatwasser' },
  { id: 'koelkast', naam: 'Koelkast' },
  { id: 'afzuigkap', naam: 'Afzuigkap' },
]

export interface KeukenSpec {
  /** strekkende meter onderkasten */
  onderkastM: number
  /** strekkende meter bovenkasten (0 = geen) */
  bovenkastM: number
  werkblad: WerkbladSoort
  apparaten: Record<Apparaat, boolean>
  /** afzuigkap met afvoer naar buiten (kernboring + muurdoorvoer) i.p.v. recirculatie */
  afzuigBuiten: boolean
}

/** Standaard: onderkasten zo lang als het werkblad (spatwand), bovenkasten 60% daarvan. */
export function standaardKeuken(werkbladM = 3): KeukenSpec {
  const m = Math.max(0, Math.round(werkbladM * 10) / 10)
  return {
    onderkastM: m,
    bovenkastM: Math.round(m * 0.6 * 10) / 10,
    werkblad: 'laminaat',
    apparaten: { kookplaat: true, oven: true, vaatwasser: true, koelkast: true, afzuigkap: true },
    afzuigBuiten: true,
  }
}

/** Keukengegevens van een project (aangevuld met standaarden voor oudere projecten). */
export function keukenVan(p: Pick<Project, 'afmetingen'> & { keuken?: Partial<KeukenSpec> }): KeukenSpec {
  const basis = standaardKeuken(p.afmetingen?.spatwand?.lengte ?? 3)
  const k = p.keuken ?? {}
  const getal = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(x, 30) : d)
  return {
    onderkastM: getal(k.onderkastM, basis.onderkastM),
    bovenkastM: getal(k.bovenkastM, basis.bovenkastM),
    werkblad: WERKBLADEN.some((w) => w.id === k.werkblad) ? (k.werkblad as WerkbladSoort) : basis.werkblad,
    apparaten: { ...basis.apparaten, ...(k.apparaten ?? {}) },
    afzuigBuiten: typeof k.afzuigBuiten === 'boolean' ? k.afzuigBuiten : basis.afzuigBuiten,
  }
}

/** Aantal uitsparingen in het werkblad: spoelbak + kookplaat (als die erin komt). */
export const aantalUitsparingen = (k: KeukenSpec) => 1 + (k.apparaten.kookplaat ? 1 : 0)

/** Arbeidsnormen keuken (uren). */
export const KEUKEN_ARBEID = {
  demontagePerM: 0.6,
  demontageVast: 1.5,
  onderkastPerM: 1.5,
  bovenkastPerM: 1.0,
  montageVast: 1,
  werkbladLaminaatPerM: 1.0,
  werkbladSteenPerM: 0.5,
  werkbladVast: 1,
  uitsparingLaminaat: 0.75,
  kookplaat: 0.75,
  oven: 0.5,
  vaatwasser: 1.5,
  koelkast: 1.5,
  afzuigkap: 1.5,
  afzuigBuiten: 2.5,
  perilex: 4,
} as const

/** Arbeidsregels [scope, omschrijving, uren] voor de aangevinkte keukenwerkzaamheden. */
export function keukenArbeid(k: KeukenSpec, s: { keukenDemontage?: boolean; keukenMontage?: boolean; werkblad?: boolean; uitsparingen?: boolean; apparatuur?: boolean; perilex?: boolean }): [string, string, number][] {
  const r: [string, string, number][] = []
  const A = KEUKEN_ARBEID
  const kast = k.onderkastM + k.bovenkastM
  if (s.keukenDemontage) r.push(['keukenDemontage', 'Oude keuken demonteren en afvoeren', kast * A.demontagePerM + A.demontageVast])
  if (s.keukenMontage) r.push(['keukenMontage', `Keukenkasten monteren (${nlm(k.onderkastM)} onder, ${nlm(k.bovenkastM)} boven)`, k.onderkastM * A.onderkastPerM + k.bovenkastM * A.bovenkastPerM + A.montageVast])
  if (s.werkblad) r.push(['werkblad', `Werkblad ${k.werkblad} plaatsen${k.werkblad === 'laminaat' ? ' en op maat zagen' : ''}`, k.onderkastM * (k.werkblad === 'laminaat' ? A.werkbladLaminaatPerM : A.werkbladSteenPerM) + A.werkbladVast])
  if (s.uitsparingen && k.werkblad === 'laminaat') r.push(['uitsparingen', 'Uitsparingen spoelbak/kookplaat zagen', aantalUitsparingen(k) * A.uitsparingLaminaat])
  if (s.apparatuur) {
    const ap = k.apparaten
    const u = (ap.kookplaat ? A.kookplaat : 0) + (ap.oven ? A.oven : 0) + (ap.vaatwasser ? A.vaatwasser : 0) + (ap.koelkast ? A.koelkast : 0) + (ap.afzuigkap ? A.afzuigkap + (k.afzuigBuiten ? A.afzuigBuiten : 0) : 0)
    r.push(['apparatuur', 'Inbouwapparatuur plaatsen en aansluiten', u])
  }
  if (s.perilex) r.push(['perilex', 'Elektricien: perilex en extra groepen', A.perilex])
  return r
}

const nlm = (n: number) => `${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(n)} m`
