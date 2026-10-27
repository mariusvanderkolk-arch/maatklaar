/**
 * Sanitair-uiterlijk in het ontwerp: kraankleur, kraanstijlen en frontkleur van badmeubels,
 * plus de leidingombouw achter een hangtoilet. Puur, zonder DOM.
 */
import { ITEMS, halveMaat, type Kamer, type OntwerpItem } from './model'

export type KraanKleur = 'chroom' | 'mat-zwart' | 'messing' | 'goud' | 'antraciet' | 'rvs'
export const KRAAN_KLEUREN: { id: KraanKleur; naam: string; kleur: string; ruw: number; metaal: number }[] = [
  { id: 'chroom', naam: 'Chroom', kleur: '#E4E7EA', ruw: 0.1, metaal: 1 },
  { id: 'mat-zwart', naam: 'Mat zwart', kleur: '#1F1E1D', ruw: 0.55, metaal: 0.3 },
  { id: 'messing', naam: 'Geborsteld messing', kleur: '#C9A25E', ruw: 0.32, metaal: 1 },
  { id: 'goud', naam: 'Goud glans', kleur: '#D9B45C', ruw: 0.12, metaal: 1 },
  { id: 'antraciet', naam: 'Gunmetal / antraciet', kleur: '#4A4744', ruw: 0.35, metaal: 0.9 },
  { id: 'rvs', naam: 'Geborsteld RVS', kleur: '#B9BDC0', ruw: 0.34, metaal: 1 },
]

export type DoucheKraan = 'regen' | 'thermostaat' | 'inbouw'
export const DOUCHE_KRANEN: { id: DoucheKraan; naam: string }[] = [
  { id: 'regen', naam: 'Regendouche-set (opbouw)' },
  { id: 'thermostaat', naam: 'Thermostaat + glijstang' },
  { id: 'inbouw', naam: 'Inbouw (plafondarm)' },
]
export type BadKraan = 'rand' | 'wand' | 'vloer'
export const BAD_KRANEN: { id: BadKraan; naam: string }[] = [
  { id: 'rand', naam: 'Badrandkraan' },
  { id: 'wand', naam: 'Wandkraan (inbouw)' },
  { id: 'vloer', naam: 'Vrijstaande vloerkraan' },
]
export type WastafelKraan = 'opbouw' | 'hoog' | 'wand'
export const WASTAFEL_KRANEN: { id: WastafelKraan; naam: string }[] = [
  { id: 'opbouw', naam: 'Opbouwkraan' },
  { id: 'hoog', naam: 'Hoge kraan' },
  { id: 'wand', naam: 'Wandkraan (inbouw)' },
]
export type FrontKleur = 'eiken' | 'noten' | 'wit' | 'greige' | 'salie' | 'antraciet' | 'zwart'
export const FRONT_KLEUREN: { id: FrontKleur; naam: string; kleur: string; hout?: boolean }[] = [
  { id: 'eiken', naam: 'Eiken', kleur: '#C49A6C', hout: true },
  { id: 'noten', naam: 'Noten', kleur: '#7E5A3E', hout: true },
  { id: 'wit', naam: 'Mat wit', kleur: '#F1EEE8' },
  { id: 'greige', naam: 'Greige', kleur: '#BDB2A3' },
  { id: 'salie', naam: 'Saliegroen', kleur: '#9AA690' },
  { id: 'antraciet', naam: 'Antraciet', kleur: '#3F3C3A' },
  { id: 'zwart', naam: 'Mat zwart', kleur: '#232120' },
]

export interface Sanitair {
  kraan: KraanKleur
  douche: DoucheKraan
  bad: BadKraan
  wastafel: WastafelKraan
  front: FrontKleur
}
export const STANDAARD_SANITAIR: Sanitair = { kraan: 'messing', douche: 'regen', bad: 'rand', wastafel: 'opbouw', front: 'eiken' }

const kies = <T extends string>(lijst: { id: T }[], x: unknown, std: T): T => (lijst.some((l) => l.id === x) ? (x as T) : std)

export function normSanitair(x: unknown): Sanitair | undefined {
  if (!x || typeof x !== 'object') return undefined
  const o = x as Record<string, unknown>
  return {
    kraan: kies(KRAAN_KLEUREN, o.kraan, STANDAARD_SANITAIR.kraan),
    douche: kies(DOUCHE_KRANEN, o.douche, STANDAARD_SANITAIR.douche),
    bad: kies(BAD_KRANEN, o.bad, STANDAARD_SANITAIR.bad),
    wastafel: kies(WASTAFEL_KRANEN, o.wastafel, STANDAARD_SANITAIR.wastafel),
    front: kies(FRONT_KLEUREN, o.front, STANDAARD_SANITAIR.front),
  }
}
export const sanitairVan = (s?: Sanitair): Sanitair => s ?? STANDAARD_SANITAIR
export const kraanKleurVan = (id: KraanKleur) => KRAAN_KLEUREN.find((k) => k.id === id) ?? KRAAN_KLEUREN[2]
export const frontKleurVan = (id: FrontKleur) => FRONT_KLEUREN.find((k) => k.id === id) ?? FRONT_KLEUREN[0]

/** Compact voor de offerte-link: [kraan, douche, bad, wastafel, front] */
export type CompactSanitair = [KraanKleur, DoucheKraan, BadKraan, WastafelKraan, FrontKleur]
export const sanitairTuple = (s: Sanitair): CompactSanitair => [s.kraan, s.douche, s.bad, s.wastafel, s.front]
export const uitSanitairTuple = (t: unknown): Sanitair | undefined =>
  Array.isArray(t) ? normSanitair({ kraan: t[0], douche: t[1], bad: t[2], wastafel: t[3], front: t[4] }) : undefined

// ——— leidingombouw achter een hangtoilet ———————————————————————————

export const OMBOUW_DIEPTE = 20
const rond = (n: number) => Math.round(n * 10) / 10

/** Richting van de wand de kamer in, per rotatie. */
const normaal = (rot: number): [number, number] => {
  const r = ((Math.round(rot) % 360) + 360) % 360
  return r === 90 ? [-1, 0] : r === 180 ? [0, -1] : r === 270 ? [1, 0] : [0, 1]
}

/** Staat er al een leidingombouw direct achter dit toilet? */
export function heeftOmbouw(toilet: OntwerpItem, items: OntwerpItem[]): boolean {
  const [nx, ny] = normaal(toilet.rot)
  const { hx, hy } = halveMaat(toilet)
  const achterX = toilet.x - nx * hx
  const achterY = toilet.y - ny * hy
  return items.some((o) => {
    if (o.type !== 'ombouw' || o.rot !== toilet.rot) return false
    const h = halveMaat(o)
    const voorX = o.x + nx * h.hx
    const voorY = o.y + ny * h.hy
    const langs = nx !== 0 ? Math.abs(o.y - toilet.y) < h.hy : Math.abs(o.x - toilet.x) < h.hx
    return langs && Math.abs(nx !== 0 ? voorX - achterX : voorY - achterY) <= 3
  })
}

/**
 * Plaatst een leidingombouw (voorzetwand) tegen de wand achter een hangtoilet en schuift het toilet ervoor.
 * Alleen als het toilet tegen een wand staat (achterkant op de wand) en er nog geen ombouw achter zit.
 */
export function metOmbouw(toilet: OntwerpItem, k: Kamer, items: OntwerpItem[], id: string): { toilet: OntwerpItem; ombouw: OntwerpItem } | null {
  if (toilet.type !== 'toilet-hangend' || heeftOmbouw(toilet, items)) return null
  const [nx, ny] = normaal(toilet.rot)
  const { hx, hy } = halveMaat(toilet)
  const achterX = toilet.x - nx * hx
  const achterY = toilet.y - ny * hy
  const opWand = nx === 1 ? achterX <= 2 : nx === -1 ? achterX >= k.L - 2 : ny === 1 ? achterY <= 2 : achterY >= k.B - 2
  if (!opWand) return null
  const wandLengte = nx !== 0 ? k.B : k.L
  const def = ITEMS.ombouw
  const w = Math.min(wandLengte, Math.max(def.min[0], Math.min(120, toilet.w + 60)))
  const langs = nx !== 0 ? toilet.y : toilet.x
  const midden = Math.min(wandLengte - w / 2, Math.max(w / 2, langs))
  const d = OMBOUW_DIEPTE
  const ombouw: OntwerpItem = {
    id,
    type: 'ombouw',
    w,
    d,
    rot: toilet.rot,
    x: rond(nx !== 0 ? achterX + (nx * d) / 2 : midden),
    y: rond(ny !== 0 ? achterY + (ny * d) / 2 : midden),
  }
  return { ombouw, toilet: { ...toilet, x: rond(toilet.x + nx * d), y: rond(toilet.y + ny * d) } }
}

/** Voegt achter elk hangtoilet zonder ombouw er één toe. */
export function ombouwAchterHangtoiletten(items: OntwerpItem[], k: Kamer, maakId: () => string): OntwerpItem[] {
  let uit = items
  for (const t of items.filter((i) => i.type === 'toilet-hangend')) {
    const r = metOmbouw(t, k, uit, maakId())
    if (r) uit = [r.ombouw, ...uit.map((i) => (i.id === t.id ? r.toilet : i))]
  }
  return uit
}
