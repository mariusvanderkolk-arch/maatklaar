/**
 * Keukenmontage: maten (strekkende meters), werkbladsoort en inbouwapparatuur.
 * Materiaal- en arbeidsregels voor de keukenwerkzaamheden. Puur; geen opslag.
 */
import type { Project } from './types'

export type WerkbladSoort = 'laminaat' | 'hout' | 'composiet' | 'graniet' | 'keramiek' | 'rvs' | 'beton' | 'marmer'
export type Apparaat = 'kookplaat' | 'oven' | 'vaatwasser' | 'koelkast' | 'afzuigkap'

export interface WerkbladInfo {
  id: WerkbladSoort
  naam: string
  /** diktes in mm met voorbeeldprijs per strekkende meter (60 cm diep) incl. btw */
  diktes: { mm: number; prijs: number }[]
  /** zelf zagen (laminaat/hout) of op maat geleverd door de leverancier */
  opMaat: boolean
  /** decors (alleen laminaat) */
  decors?: string[]
  /** uiterlijk in het 3D-ontwerp: kleur-id van de afwerking, glans en metaal */
  beeld: { kleur: string; ruw: number; metaal?: number }
  uitleg: string
}
/** Werkbladen met realistische middenklasse richtprijzen (per m¹, 60 cm diep, incl. btw, peildatum zie prices.ts). */
export const WERKBLADEN: WerkbladInfo[] = [
  { id: 'laminaat', naam: 'Laminaat', diktes: [{ mm: 28, prijs: 75 }, { mm: 38, prijs: 95 }], opMaat: false, decors: ['Eiken naturel', 'Betonlook', 'Wit mat', 'Antraciet', 'Marmerlook'], beeld: { kleur: 'eiken', ruw: 0.6 }, uitleg: 'Voordelig; zelf op maat zagen.' },
  { id: 'hout', naam: 'Massief eiken', diktes: [{ mm: 27, prijs: 210 }, { mm: 40, prijs: 260 }], opMaat: false, beeld: { kleur: 'eiken', ruw: 0.5 }, uitleg: 'Massief/verlijmd eiken, geolied; zelf zagen.' },
  { id: 'composiet', naam: 'Composiet / kwarts', diktes: [{ mm: 12, prijs: 420 }, { mm: 20, prijs: 450 }, { mm: 30, prijs: 520 }], opMaat: true, beeld: { kleur: 'kalk', ruw: 0.25 }, uitleg: 'Kwartscomposiet, op maat geleverd incl. inmeten.' },
  { id: 'graniet', naam: 'Graniet', diktes: [{ mm: 20, prijs: 500 }, { mm: 30, prijs: 575 }], opMaat: true, beeld: { kleur: 'antraciet', ruw: 0.2 }, uitleg: 'Natuursteen, gepolijst of gezoet.' },
  { id: 'keramiek', naam: 'Keramiek (Dekton-type)', diktes: [{ mm: 12, prijs: 650 }, { mm: 20, prijs: 750 }], opMaat: true, beeld: { kleur: 'beton', ruw: 0.35 }, uitleg: 'Krasvast en hittebestendig, dun profiel.' },
  { id: 'rvs', naam: 'RVS', diktes: [{ mm: 40, prijs: 750 }], opMaat: true, beeld: { kleur: 'kalk', ruw: 0.3, metaal: 0.9 }, uitleg: 'Geborsteld RVS met opstaande rand, op maat gezet.' },
  { id: 'beton', naam: 'Betonlook', diktes: [{ mm: 20, prijs: 400 }, { mm: 40, prijs: 480 }], opMaat: true, beeld: { kleur: 'beton', ruw: 0.55 }, uitleg: 'Composiet of microcement in betonlook.' },
  { id: 'marmer', naam: 'Marmer', diktes: [{ mm: 20, prijs: 650 }, { mm: 30, prijs: 750 }], opMaat: true, beeld: { kleur: 'marmer', ruw: 0.18 }, uitleg: 'Natuursteen marmer; gevoeliger voor zuren.' },
]
export const werkbladInfo = (id: WerkbladSoort | undefined) => WERKBLADEN.find((w) => w.id === id) ?? WERKBLADEN[0]
/** Prijs per m¹ voor soort + dikte (dichtstbijzijnde dikte). */
export function werkbladPrijs(k: Pick<KeukenSpec, 'werkblad' | 'dikte'>): { mm: number; prijs: number } {
  const w = werkbladInfo(k.werkblad)
  return w.diktes.find((d) => d.mm === k.dikte) ?? w.diktes[w.diktes.length - 1]
}
/** Decor-kleur in 3D voor laminaat. */
export const DECOR_KLEUR: Record<string, string> = { 'Eiken naturel': 'eiken', Betonlook: 'beton', 'Wit mat': 'kalk', Antraciet: 'antraciet', Marmerlook: 'marmer' }
export function werkbladBeeld(k: Pick<KeukenSpec, 'werkblad' | 'decor'>) {
  const w = werkbladInfo(k.werkblad)
  return { ...w.beeld, kleur: w.id === 'laminaat' && k.decor && DECOR_KLEUR[k.decor] ? DECOR_KLEUR[k.decor] : w.beeld.kleur }
}
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
  /** dikte werkblad in mm (ontbreekt = dikste standaard) */
  dikte?: number
  /** decor (laminaat) */
  decor?: string
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
    ...(typeof k.dikte === 'number' ? { dikte: k.dikte } : {}),
    ...(typeof k.decor === 'string' ? { decor: k.decor.slice(0, 40) } : {}),
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
  if (s.werkblad) r.push(['werkblad', `Werkblad ${werkbladInfo(k.werkblad).naam.toLowerCase()} plaatsen${!werkbladInfo(k.werkblad).opMaat ? ' en op maat zagen' : ''}`, k.onderkastM * (!werkbladInfo(k.werkblad).opMaat ? A.werkbladLaminaatPerM : A.werkbladSteenPerM) + A.werkbladVast])
  if (s.uitsparingen && !werkbladInfo(k.werkblad).opMaat) r.push(['uitsparingen', 'Uitsparingen spoelbak/kookplaat zagen', aantalUitsparingen(k) * A.uitsparingLaminaat])
  if (s.apparatuur) {
    const ap = k.apparaten
    const u = (ap.kookplaat ? A.kookplaat : 0) + (ap.oven ? A.oven : 0) + (ap.vaatwasser ? A.vaatwasser : 0) + (ap.koelkast ? A.koelkast : 0) + (ap.afzuigkap ? A.afzuigkap + (k.afzuigBuiten ? A.afzuigBuiten : 0) : 0)
    r.push(['apparatuur', 'Inbouwapparatuur plaatsen en aansluiten', u])
  }
  if (s.perilex) r.push(['perilex', 'Elektricien: perilex en extra groepen', A.perilex])
  return r
}

const nlm = (n: number) => `${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(n)} m`
