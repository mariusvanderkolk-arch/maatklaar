/**
 * Onderlegger: een eigen tekening (PNG/JPG, of pagina 1 van een PDF als afbeelding) onder de plattegrond.
 * Puur rekenwerk + validatie; de afbeelding zelf staat alleen op dit apparaat (IndexedDB), niet in de cloud
 * en niet in de offerte-link. Coördinaten in cm, zoals de rest van het ontwerp.
 */

export interface Onderlegger {
  /** afbeeldingsgrootte in pixels */
  pxB: number
  pxH: number
  /** pixels per cm (na kalibratie) */
  schaal: number
  /** middelpunt van de afbeelding in plan-cm */
  x: number
  y: number
  /** draaiing in graden (met de klok mee) om het middelpunt */
  rot: number
  /** 0.1 – 1 */
  opacity: number
  zichtbaar: boolean
  /** bestandsnaam, ter herkenning */
  naam: string
  /** bron was een PDF (pagina 1) */
  pdf?: boolean
  /** al gekalibreerd met twee punten */
  gekalibreerd?: boolean
}

export const MAX_BESTAND_MB = 15
export const MAX_BESTAND = MAX_BESTAND_MB * 1024 * 1024
/** grootste zijde van de opgeslagen afbeelding (px) */
export const MAX_PX = 3000

export type BestandSoort = 'png' | 'jpg' | 'pdf'

/**
 * Bepaalt het soort bestand op basis van de eerste bytes (niet op naam of MIME-type).
 * SVG en al het andere wordt geweigerd.
 */
export function herkenBestand(kop: Uint8Array): BestandSoort | null {
  const b = (i: number) => kop[i]
  if (kop.length >= 8 && b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 && b(4) === 0x0d && b(5) === 0x0a && b(6) === 0x1a && b(7) === 0x0a) return 'png'
  if (kop.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'jpg'
  if (kop.length >= 5 && b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46 && b(4) === 0x2d) return 'pdf'
  return null
}

export function controleerBestand(grootte: number, kop: Uint8Array): { soort: BestandSoort } | { fout: string } {
  if (grootte <= 0) return { fout: 'Het bestand is leeg.' }
  if (grootte > MAX_BESTAND) return { fout: `Het bestand is groter dan ${MAX_BESTAND_MB} MB.` }
  const soort = herkenBestand(kop)
  if (!soort) return { fout: 'Alleen PNG, JPG of PDF. SVG en andere bestanden worden niet geaccepteerd.' }
  return { soort }
}

const klem = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

/** Eerste plaatsing: afbeelding zo breed als de kamer, gecentreerd. */
export function nieuweOnderlegger(pxB: number, pxH: number, kamer: { L: number; B: number }, naam: string, pdf = false): Onderlegger {
  const schaal = pxB / Math.max(1, kamer.L)
  return { pxB, pxH, schaal, x: kamer.L / 2, y: kamer.B / 2, rot: 0, opacity: 0.5, zichtbaar: true, naam: naam.slice(0, 120), ...(pdf ? { pdf: true } : {}) }
}

/** Grootte van de afbeelding in plan-cm. */
export const formaatCm = (o: Pick<Onderlegger, 'pxB' | 'pxH' | 'schaal'>) => ({ w: o.pxB / o.schaal, h: o.pxH / o.schaal })

/**
 * Kalibreren met twee punten (in plan-cm, zoals nu getekend) en de echte afstand daartussen (cm).
 * Schaalt de afbeelding om punt 1, zodat punt 1 op zijn plek blijft liggen.
 */
export function kalibreer(o: Onderlegger, p1: { x: number; y: number }, p2: { x: number; y: number }, echtCm: number): Onderlegger | null {
  const getekend = Math.hypot(p2.x - p1.x, p2.y - p1.y)
  if (!(getekend > 0.5) || !(echtCm > 0)) return null
  const k = echtCm / getekend
  const schaal = o.schaal / k
  if (!(schaal > 1e-4 && schaal < 1e4)) return null
  return { ...o, schaal, x: p1.x + (o.x - p1.x) * k, y: p1.y + (o.y - p1.y) * k, gekalibreerd: true }
}

export function normaliseerOnderlegger(x: unknown): Onderlegger | undefined {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return undefined
  const o = x as Record<string, unknown>
  if (![o.pxB, o.pxH, o.schaal, o.x, o.y].every(isNum)) return undefined
  if ((o.pxB as number) <= 0 || (o.pxH as number) <= 0 || (o.schaal as number) <= 0) return undefined
  return {
    pxB: Math.min(20000, o.pxB as number),
    pxH: Math.min(20000, o.pxH as number),
    schaal: klem(o.schaal as number, 1e-4, 1e4),
    x: klem(o.x as number, -1e5, 1e5),
    y: klem(o.y as number, -1e5, 1e5),
    rot: isNum(o.rot) ? ((o.rot % 360) + 360) % 360 : 0,
    opacity: isNum(o.opacity) ? klem(o.opacity, 0.1, 1) : 0.5,
    zichtbaar: o.zichtbaar !== false,
    naam: typeof o.naam === 'string' ? o.naam.slice(0, 120) : 'Tekening',
    ...(o.pdf === true ? { pdf: true } : {}),
    ...(o.gekalibreerd === true ? { gekalibreerd: true } : {}),
  }
}
