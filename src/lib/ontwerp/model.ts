/**
 * Ruimte-ontwerp (2D/3D) per project. Puur: geen DOM, geen opslag, zodat het goed te testen is.
 * Coördinaten in centimeters; (0,0) = binnenhoek linksboven, x langs de lengte, y langs de breedte.
 * Een item heeft zijn middelpunt op (x, y); w = breedte (lokale x), d = diepte (lokale y).
 * De achterkant van een item ligt aan lokale -y. rot (graden, met de klok mee):
 * 0 = achterkant tegen de bovenwand, 90 = rechterwand, 180 = onderwand, 270 = linkerwand.
 */
import type { Project, ProjectType } from '../types'

export const WAND_DIKTE = 12

export type ItemType =
  | 'douche-inloop'
  | 'douche-cabine'
  | 'bad'
  | 'toilet-hangend'
  | 'toilet-staand'
  | 'wastafel'
  | 'badmeubel'
  | 'fontein'
  | 'spiegel'
  | 'handdoekradiator'
  | 'radiator'
  | 'deur'
  | 'raam'
  | 'onderkast'
  | 'aanrecht'
  | 'spoelbak'
  | 'kookplaat'
  | 'bovenkast'
  | 'koelkast'
  | 'kast'

export type Groep = 'sanitair' | 'meubel' | 'verwarming' | 'openingen' | 'keuken'
/** 'aan' = hoort tegen een wand, 'in' = zit in de wand (deur/raam), 'vrij' = overal */
export type Montage = 'aan' | 'in' | 'vrij'

export interface ItemDef {
  type: ItemType
  naam: string
  groep: Groep
  w: number
  d: number
  /** hoogte van het object in cm */
  h: number
  /** onderkant boven de vloer in cm */
  z: number
  montage: Montage
  ruimtes: ProjectType[]
  /** alternatieven om tussen te wisselen (bijv. hangend/staand toilet) */
  familie?: string
  min: [number, number]
  max: [number, number]
}

const ALLE: ProjectType[] = ['badkamer', 'toilet', 'keuken', 'vloer']
const NAT: ProjectType[] = ['badkamer', 'toilet']

export const ITEMS: Record<ItemType, ItemDef> = {
  'douche-inloop': { type: 'douche-inloop', naam: 'Inloopdouche', groep: 'sanitair', w: 100, d: 120, h: 200, z: 0, montage: 'aan', ruimtes: ['badkamer'], familie: 'douche', min: [70, 70], max: [200, 200] },
  'douche-cabine': { type: 'douche-cabine', naam: 'Douchecabine', groep: 'sanitair', w: 90, d: 90, h: 200, z: 0, montage: 'aan', ruimtes: ['badkamer'], familie: 'douche', min: [70, 70], max: [140, 140] },
  bad: { type: 'bad', naam: 'Bad', groep: 'sanitair', w: 170, d: 75, h: 58, z: 0, montage: 'aan', ruimtes: ['badkamer'], min: [120, 65], max: [200, 100] },
  'toilet-hangend': { type: 'toilet-hangend', naam: 'Hangtoilet', groep: 'sanitair', w: 37, d: 54, h: 40, z: 0, montage: 'aan', ruimtes: NAT, familie: 'toilet', min: [34, 45], max: [45, 70] },
  'toilet-staand': { type: 'toilet-staand', naam: 'Staand toilet', groep: 'sanitair', w: 37, d: 67, h: 78, z: 0, montage: 'aan', ruimtes: NAT, familie: 'toilet', min: [34, 55], max: [45, 80] },
  wastafel: { type: 'wastafel', naam: 'Wastafel', groep: 'sanitair', w: 60, d: 45, h: 15, z: 75, montage: 'aan', ruimtes: ['badkamer'], familie: 'wastafel', min: [40, 30], max: [120, 55] },
  badmeubel: { type: 'badmeubel', naam: 'Badmeubel', groep: 'sanitair', w: 80, d: 46, h: 55, z: 35, montage: 'aan', ruimtes: ['badkamer'], familie: 'wastafel', min: [50, 35], max: [200, 55] },
  fontein: { type: 'fontein', naam: 'Fontein', groep: 'sanitair', w: 36, d: 25, h: 12, z: 78, montage: 'aan', ruimtes: NAT, familie: 'wastafel', min: [25, 18], max: [50, 35] },
  spiegel: { type: 'spiegel', naam: 'Spiegel', groep: 'meubel', w: 80, d: 3, h: 70, z: 110, montage: 'aan', ruimtes: NAT, min: [30, 2], max: [200, 5] },
  handdoekradiator: { type: 'handdoekradiator', naam: 'Handdoekradiator', groep: 'verwarming', w: 50, d: 8, h: 120, z: 20, montage: 'aan', ruimtes: NAT, familie: 'radiator', min: [40, 5], max: [80, 12] },
  radiator: { type: 'radiator', naam: 'Radiator', groep: 'verwarming', w: 100, d: 10, h: 60, z: 15, montage: 'aan', ruimtes: ALLE, familie: 'radiator', min: [40, 6], max: [200, 20] },
  deur: { type: 'deur', naam: 'Deur', groep: 'openingen', w: 83, d: WAND_DIKTE, h: 211, z: 0, montage: 'in', ruimtes: ALLE, min: [60, WAND_DIKTE], max: [180, WAND_DIKTE] },
  raam: { type: 'raam', naam: 'Raam', groep: 'openingen', w: 100, d: WAND_DIKTE, h: 100, z: 100, montage: 'in', ruimtes: ALLE, min: [30, WAND_DIKTE], max: [300, WAND_DIKTE] },
  onderkast: { type: 'onderkast', naam: 'Onderkast', groep: 'keuken', w: 60, d: 60, h: 90, z: 0, montage: 'aan', ruimtes: ['keuken'], familie: 'kast-onder', min: [30, 50], max: [120, 70] },
  aanrecht: { type: 'aanrecht', naam: 'Aanrecht', groep: 'keuken', w: 180, d: 62, h: 90, z: 0, montage: 'aan', ruimtes: ['keuken'], familie: 'kast-onder', min: [60, 50], max: [400, 90] },
  spoelbak: { type: 'spoelbak', naam: 'Spoelbak', groep: 'keuken', w: 80, d: 62, h: 90, z: 0, montage: 'aan', ruimtes: ['keuken'], familie: 'kast-onder', min: [50, 50], max: [120, 90] },
  kookplaat: { type: 'kookplaat', naam: 'Kookplaat', groep: 'keuken', w: 80, d: 62, h: 90, z: 0, montage: 'aan', ruimtes: ['keuken'], familie: 'kast-onder', min: [60, 50], max: [120, 90] },
  bovenkast: { type: 'bovenkast', naam: 'Bovenkast', groep: 'keuken', w: 80, d: 35, h: 70, z: 145, montage: 'aan', ruimtes: ['keuken'], min: [30, 30], max: [300, 40] },
  koelkast: { type: 'koelkast', naam: 'Koelkast', groep: 'keuken', w: 60, d: 65, h: 200, z: 0, montage: 'aan', ruimtes: ['keuken'], familie: 'hoog', min: [55, 55], max: [90, 75] },
  kast: { type: 'kast', naam: 'Kast', groep: 'meubel', w: 60, d: 40, h: 200, z: 0, montage: 'aan', ruimtes: ALLE, familie: 'hoog', min: [30, 25], max: [240, 65] },
}

export const ITEM_TYPES = Object.keys(ITEMS) as ItemType[]

export interface OntwerpItem {
  id: string
  type: ItemType
  x: number
  y: number
  w: number
  d: number
  rot: number
}

// ——— afwerking (tegels) ————————————————————————————————————————————

export type Stijl = 'effen' | 'travertin' | 'marmer' | 'terrazzo' | 'beton' | 'hout' | 'zellige'
export interface Kleur {
  id: string
  naam: string
  basis: string
  voeg: string
  stijl: Stijl
  /** accentkleur voor aders/spikkels/nerf */
  accent?: string
}

export const KLEUREN: Kleur[] = [
  { id: 'travertin', naam: 'Travertin beige', basis: '#DCCBAE', voeg: '#BFAB87', stijl: 'travertin', accent: '#BFA785' },
  { id: 'kalk', naam: 'Kalkwit', basis: '#EEE8DD', voeg: '#D9D1C3', stijl: 'effen' },
  { id: 'marmer', naam: 'Marmer wit', basis: '#F1EEE9', voeg: '#DCD6CC', stijl: 'marmer', accent: '#B9B2A8' },
  { id: 'calacatta', naam: 'Calacatta goud', basis: '#F3EEE6', voeg: '#E0D6C6', stijl: 'marmer', accent: '#C9A86A' },
  { id: 'zand', naam: 'Zandsteen', basis: '#CDB894', voeg: '#B9A47F', stijl: 'beton', accent: '#BBA581' },
  { id: 'beton', naam: 'Betonlook grijs', basis: '#B3ADA5', voeg: '#9E978E', stijl: 'beton', accent: '#A39C93' },
  { id: 'antraciet', naam: 'Antraciet', basis: '#4D4945', voeg: '#3C3936', stijl: 'beton', accent: '#57524D' },
  { id: 'terrazzo', naam: 'Terrazzo', basis: '#E6DED2', voeg: '#D4CABB', stijl: 'terrazzo', accent: '#9C8F7E' },
  { id: 'salie', naam: 'Saliegroen', basis: '#A9B49E', voeg: '#E8E2D6', stijl: 'zellige' },
  { id: 'terracotta', naam: 'Terracotta', basis: '#C07A57', voeg: '#E5D9C8', stijl: 'zellige' },
  { id: 'eiken', naam: 'Eiken (houtlook)', basis: '#C49A6C', voeg: '#A87E52', stijl: 'hout', accent: '#A57A4D' },
]

export interface Formaat {
  id: string
  naam: string
  /** lengte × breedte in cm */
  l: number
  b: number
}

export const FORMATEN: Formaat[] = [
  { id: '60x60', naam: '60 × 60', l: 60, b: 60 },
  { id: '30x60', naam: '30 × 60', l: 60, b: 30 },
  { id: '60x120', naam: '60 × 120', l: 120, b: 60 },
  { id: '80x80', naam: '80 × 80', l: 80, b: 80 },
  { id: '30x30', naam: '30 × 30', l: 30, b: 30 },
  { id: '15x15', naam: '15 × 15', l: 15, b: 15 },
  { id: 'metro', naam: 'Metro 7,5 × 15', l: 15, b: 7.5 },
  { id: 'mozaiek', naam: 'Mozaïek 5 × 5', l: 5, b: 5 },
  { id: 'plank', naam: 'Plank 20 × 120', l: 120, b: 20 },
]

export type Verband = 'recht' | 'halfsteens'

export interface Afwerking {
  kleur: string
  formaat: string
  verband: Verband
}

export interface Ontwerp {
  v: 1
  items: OntwerpItem[]
  vloer: Afwerking
  wand: Afwerking
  /** ontwerp tonen op de offerte en in de klantlink */
  inOfferte: boolean
  bijgewerkt: number
}

export const kleurVan = (id: string): Kleur => KLEUREN.find((k) => k.id === id) ?? KLEUREN[0]
export const formaatVan = (id: string): Formaat => FORMATEN.find((f) => f.id === id) ?? FORMATEN[0]

export interface Kamer {
  /** binnenmaten in cm */
  L: number
  B: number
  H: number
  /** tot waar de wanden betegeld zijn (cm) */
  tegelH: number
  type: ProjectType
}

const r = (n: number) => Math.round(n) || 0

export function kamerVan(p: Pick<Project, 'afmetingen' | 'type'>): Kamer {
  const a = p.afmetingen
  const L = Math.max(80, r((a.lengte || 2) * 100))
  const B = Math.max(80, r((a.breedte || 2) * 100))
  const H = Math.max(180, r((a.hoogte || 2.6) * 100))
  const tegelH = p.type === 'badkamer' || p.type === 'toilet' ? Math.min(H, Math.max(0, r((a.tegelhoogte || 0) * 100))) : p.type === 'keuken' ? 0 : 0
  return { L, B, H, tegelH, type: p.type }
}

export function standaardAfwerking(type: ProjectType): { vloer: Afwerking; wand: Afwerking } {
  if (type === 'keuken') return { vloer: { kleur: 'beton', formaat: '60x60', verband: 'recht' }, wand: { kleur: 'kalk', formaat: 'metro', verband: 'halfsteens' } }
  if (type === 'vloer') return { vloer: { kleur: 'eiken', formaat: 'plank', verband: 'halfsteens' }, wand: { kleur: 'kalk', formaat: '30x60', verband: 'recht' } }
  return { vloer: { kleur: 'travertin', formaat: '60x60', verband: 'recht' }, wand: { kleur: 'kalk', formaat: '30x60', verband: 'halfsteens' } }
}

export function leegOntwerp(type: ProjectType): Ontwerp {
  return { v: 1, items: [], ...standaardAfwerking(type), inOfferte: true, bijgewerkt: 0 }
}

// ——— geometrie ——————————————————————————————————————————————————

const norm = (rot: number) => ((Math.round(rot) % 360) + 360) % 360

/** Halve breedte/diepte van de omhullende rechthoek (ook bij schuine rotatie). */
export function halveMaat(it: Pick<OntwerpItem, 'w' | 'd' | 'rot'>): { hx: number; hy: number } {
  const a = (norm(it.rot) * Math.PI) / 180
  const c = Math.abs(Math.cos(a))
  const s = Math.abs(Math.sin(a))
  return { hx: (it.w * c + it.d * s) / 2, hy: (it.w * s + it.d * c) / 2 }
}

export type Wand = 'boven' | 'rechts' | 'onder' | 'links'
export const WAND_ROT: Record<Wand, number> = { boven: 0, rechts: 90, onder: 180, links: 270 }

/** Tegen welke wand staat een item (achterkant), of null als het vrij staat. */
export function wandVan(it: OntwerpItem, k: Kamer, marge = 2): Wand | null {
  const { hx, hy } = halveMaat(it)
  const rot = norm(it.rot)
  const tegen: Record<Wand, boolean> = {
    boven: Math.abs(it.y - hy) <= marge || (ITEMS[it.type].montage === 'in' && it.y <= 0),
    onder: Math.abs(k.B - it.y - hy) <= marge || (ITEMS[it.type].montage === 'in' && it.y >= k.B),
    links: Math.abs(it.x - hx) <= marge || (ITEMS[it.type].montage === 'in' && it.x <= 0),
    rechts: Math.abs(k.L - it.x - hx) <= marge || (ITEMS[it.type].montage === 'in' && it.x >= k.L),
  }
  const voorkeur = (Object.keys(WAND_ROT) as Wand[]).find((w) => WAND_ROT[w] === rot && tegen[w])
  return voorkeur ?? null
}

const raster = (n: number, stap: number) => Math.round(n / stap) * stap

/**
 * Plaatst een item netjes: op een raster van 5 cm, binnen de ruimte, en (voor wandobjecten)
 * met de achterkant tegen de dichtstbijzijnde wand als die in de buurt is.
 */
export function snap(it: OntwerpItem, k: Kamer, opties: { raster?: number; wandAfstand?: number } = {}): OntwerpItem {
  const def = ITEMS[it.type]
  const stap = opties.raster ?? 5
  const bereik = opties.wandAfstand ?? 30
  let { x, y, rot } = it
  rot = norm(rot)

  if (def.montage === 'in') {
    // deur/raam: altijd in de dichtstbijzijnde wand
    const afst: [Wand, number][] = [
      ['boven', y],
      ['onder', k.B - y],
      ['links', x],
      ['rechts', k.L - x],
    ]
    afst.sort((a, b) => a[1] - b[1])
    const w = afst[0][0]
    const half = it.w / 2
    if (w === 'boven' || w === 'onder') {
      x = Math.min(k.L - half, Math.max(half, raster(x, stap)))
      y = w === 'boven' ? -WAND_DIKTE / 2 : k.B + WAND_DIKTE / 2
    } else {
      y = Math.min(k.B - half, Math.max(half, raster(y, stap)))
      x = w === 'links' ? -WAND_DIKTE / 2 : k.L + WAND_DIKTE / 2
    }
    return { ...it, x, y, rot: WAND_ROT[w], d: WAND_DIKTE }
  }

  if (def.montage === 'aan') {
    // achterkant tegen de dichtstbijzijnde wand als die binnen bereik is
    const ruw = { ...it, rot }
    const kandidaten = (Object.keys(WAND_ROT) as Wand[]).map((w) => {
      const h = halveMaat({ ...ruw, rot: WAND_ROT[w] })
      const afstand = w === 'boven' ? y - h.hy : w === 'onder' ? k.B - y - h.hy : w === 'links' ? x - h.hx : k.L - x - h.hx
      return { w, afstand: Math.abs(afstand), h }
    })
    kandidaten.sort((a, b) => a.afstand - b.afstand)
    const beste = kandidaten[0]
    // alleen 'aanzuigen' als de wand dichtbij is (of het item al op deze rotatie stond)
    if (beste.afstand <= bereik) {
      rot = WAND_ROT[beste.w]
      const h = beste.h
      if (beste.w === 'boven') y = h.hy
      if (beste.w === 'onder') y = k.B - h.hy
      if (beste.w === 'links') x = h.hx
      if (beste.w === 'rechts') x = k.L - h.hx
    }
  }

  const { hx, hy } = halveMaat({ ...it, rot })
  const vast = (v: number, h: number, max: number, isWand: boolean) => {
    if (isWand) return v
    let n = raster(v, stap)
    if (Math.abs(n - h) <= 8) n = h // tegen de wand
    if (Math.abs(max - h - n) <= 8) n = max - h
    return Math.min(max - h, Math.max(h, n))
  }
  const wandX = def.montage === 'aan' && (Math.abs(x - hx) < 0.5 || Math.abs(k.L - hx - x) < 0.5)
  const wandY = def.montage === 'aan' && (Math.abs(y - hy) < 0.5 || Math.abs(k.B - hy - y) < 0.5)
  x = vast(x, hx, k.L, wandX)
  y = vast(y, hy, k.B, wandY)
  // te groot voor de ruimte: centreren
  if (hx * 2 > k.L) x = k.L / 2
  if (hy * 2 > k.B) y = k.B / 2
  return { ...it, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, rot }
}

/** Afstanden (cm) van de omhullende rechthoek tot de vier wanden. */
export function afstanden(it: OntwerpItem, k: Kamer): Record<Wand, number> {
  const { hx, hy } = halveMaat(it)
  return { boven: r(it.y - hy), onder: r(k.B - it.y - hy), links: r(it.x - hx), rechts: r(k.L - it.x - hx) }
}

/** Overlappen twee items (omhullende rechthoeken, met een kleine marge)? Openingen tellen niet mee. */
export function overlapt(a: OntwerpItem, b: OntwerpItem, marge = 1): boolean {
  if (ITEMS[a.type].montage === 'in' || ITEMS[b.type].montage === 'in') return false
  // spiegel/bovenkast/radiator hangen boven andere objecten
  const hoog = (t: ItemType) => ITEMS[t].z >= 100 || t === 'spiegel' || t === 'handdoekradiator'
  if (hoog(a.type) !== hoog(b.type)) return false
  const ha = halveMaat(a)
  const hb = halveMaat(b)
  return Math.abs(a.x - b.x) < ha.hx + hb.hx - marge && Math.abs(a.y - b.y) < ha.hy + hb.hy - marge
}

export function nieuwItem(type: ItemType, k: Kamer, id: string, bij?: { x: number; y: number }): OntwerpItem {
  const def = ITEMS[type]
  const w = Math.min(def.w, Math.max(def.min[0], k.L - 4))
  const d = Math.min(def.d, def.montage === 'in' ? WAND_DIKTE : Math.max(def.min[1], k.B - 4))
  return snap({ id, type, x: bij?.x ?? k.L / 2, y: bij?.y ?? k.B / 2, w, d, rot: 0 }, k)
}

/** Wisselt een item van type binnen dezelfde familie (bijv. hangend ↔ staand toilet) met behoud van plek. */
export function wisselType(it: OntwerpItem, type: ItemType, k: Kamer): OntwerpItem {
  const def = ITEMS[type]
  return snap({ ...it, type, w: def.w, d: def.montage === 'in' ? WAND_DIKTE : def.d }, k, { wandAfstand: 40 })
}

export const familieVan = (type: ItemType): ItemType[] => {
  const f = ITEMS[type].familie
  return f ? ITEM_TYPES.filter((t) => ITEMS[t].familie === f) : [type]
}

// ——— voorstel-indeling ————————————————————————————————————————————

const plaats = (k: Kamer, type: ItemType, id: string, x: number, y: number, rot: number, w?: number, d?: number): OntwerpItem => {
  const def = ITEMS[type]
  return snap({ id, type, x, y, w: w ?? def.w, d: d ?? (def.montage === 'in' ? WAND_DIKTE : def.d), rot }, k, { wandAfstand: 60 })
}

/** Een nette startindeling op basis van ruimtetype, maten en openingen uit 'Opmeten'. */
export function voorstelIndeling(p: Pick<Project, 'afmetingen' | 'type' | 'scope'>, maakId: () => string): OntwerpItem[] {
  const k = kamerVan(p)
  const { L, B } = k
  const deurB = r((p.afmetingen.openingen.find((o) => o.type === 'deur')?.breedte ?? 0.83) * 100)
  const raam = p.afmetingen.openingen.find((o) => o.type === 'raam')
  const items: OntwerpItem[] = []
  const add = (it: OntwerpItem) => items.push(it)

  if (p.type === 'badkamer') {
    const dW = Math.min(r(p.afmetingen.douche.breedte * 100) || 100, L * 0.45)
    const dD = Math.min(r(p.afmetingen.douche.diepte * 100) || 120, B * 0.65)
    add(plaats(k, 'douche-inloop', maakId(), L - dW / 2, dD / 2, 0, dW, dD))
    const mW = L >= 240 ? 80 : 60
    add(plaats(k, 'badmeubel', maakId(), mW / 2 + 15, 23, 0, mW))
    add(plaats(k, 'spiegel', maakId(), mW / 2 + 15, 2, 0, mW))
    if (p.scope.toilet !== false) add(plaats(k, 'toilet-hangend', maakId(), 27, Math.max(dD, B * 0.55) + 10, 270))
    add(plaats(k, 'handdoekradiator', maakId(), L - 4, Math.min(B - 40, dD + 45), 90))
    add(plaats(k, 'deur', maakId(), Math.min(L - deurB / 2 - 10, L * 0.55), B, 180, deurB))
    if (raam) add(plaats(k, 'raam', maakId(), (mW + 30 + (L - dW)) / 2, 0, 0, r(raam.breedte * 100)))
  } else if (p.type === 'toilet') {
    add(plaats(k, 'toilet-hangend', maakId(), L / 2, 27, 0))
    add(plaats(k, 'fontein', maakId(), 4, B * 0.55, 270))
    add(plaats(k, 'deur', maakId(), L / 2, B, 180, Math.min(deurB, L - 10)))
    if (raam) add(plaats(k, 'raam', maakId(), L, B * 0.4, 90, Math.min(r(raam.breedte * 100), B - 20)))
  } else if (p.type === 'keuken') {
    const blok = Math.min(L - 70, 300)
    add(plaats(k, 'koelkast', maakId(), 30, 33, 0))
    add(plaats(k, 'aanrecht', maakId(), 60 + (blok - 160) / 2, 31, 0, Math.max(60, blok - 160)))
    add(plaats(k, 'spoelbak', maakId(), 60 + (blok - 160) + 40, 31, 0, 80))
    add(plaats(k, 'kookplaat', maakId(), 60 + blok - 40, 31, 0, 80))
    add(plaats(k, 'bovenkast', maakId(), 60 + blok / 2, 17.5, 0, blok))
    add(plaats(k, 'deur', maakId(), L - deurB / 2 - 20, B, 180, deurB))
    if (raam) add(plaats(k, 'raam', maakId(), L, B / 2, 90, Math.min(r(raam.breedte * 100), B - 20)))
  } else {
    add(plaats(k, 'deur', maakId(), deurB / 2 + 20, B, 180, deurB))
    add(plaats(k, 'radiator', maakId(), L / 2, 5, 0, Math.min(140, L - 40)))
    if (raam) add(plaats(k, 'raam', maakId(), L / 2, 0, 0, Math.min(r(raam.breedte * 100), L - 40)))
  }
  return items.filter((it) => it.w <= Math.max(L, B) + 1)
}

// ——— normaliseren, compact (voor de offerte-link) ———————————————————

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)

function normAfwerking(x: unknown, standaard: Afwerking): Afwerking {
  if (!isObj(x)) return standaard
  return {
    kleur: KLEUREN.some((k) => k.id === x.kleur) ? (x.kleur as string) : standaard.kleur,
    formaat: FORMATEN.some((f) => f.id === x.formaat) ? (x.formaat as string) : standaard.formaat,
    verband: x.verband === 'halfsteens' ? 'halfsteens' : 'recht',
  }
}

function normItem(x: unknown): OntwerpItem | null {
  if (!isObj(x) || !ITEM_TYPES.includes(x.type as ItemType)) return null
  if (![x.x, x.y, x.w, x.d].every(isNum)) return null
  const def = ITEMS[x.type as ItemType]
  return {
    id: typeof x.id === 'string' && x.id ? x.id.slice(0, 60) : Math.random().toString(36).slice(2),
    type: x.type as ItemType,
    x: x.x as number,
    y: x.y as number,
    w: Math.min(def.max[0], Math.max(def.min[0], x.w as number)),
    d: Math.min(def.max[1], Math.max(def.min[1], x.d as number)),
    rot: isNum(x.rot) ? norm(x.rot) : 0,
  }
}

export function normaliseerOntwerp(x: unknown, type: ProjectType): Ontwerp {
  const basis = leegOntwerp(type)
  if (!isObj(x)) return basis
  return {
    v: 1,
    items: (Array.isArray(x.items) ? x.items : []).slice(0, 80).map(normItem).filter((i): i is OntwerpItem => i != null),
    vloer: normAfwerking(x.vloer, basis.vloer),
    wand: normAfwerking(x.wand, basis.wand),
    inOfferte: x.inOfferte !== false,
    bijgewerkt: isNum(x.bijgewerkt) ? x.bijgewerkt : 0,
  }
}

/** Compacte vorm voor in de offerte-link: [L,B,H,tegelH], items als tuples, afwerkingen als tuples. */
export interface CompactOntwerp {
  k: [number, number, number, number]
  t: ProjectType
  i: [ItemType, number, number, number, number, number][]
  v: [string, string, Verband]
  w: [string, string, Verband]
}

export function compact(o: Ontwerp, k: Kamer): CompactOntwerp {
  const n = (v: number) => Math.round(v)
  return {
    k: [k.L, k.B, k.H, k.tegelH],
    t: k.type,
    i: o.items.map((it) => [it.type, n(it.x), n(it.y), n(it.w), n(it.d), n(it.rot)]),
    v: [o.vloer.kleur, o.vloer.formaat, o.vloer.verband],
    w: [o.wand.kleur, o.wand.formaat, o.wand.verband],
  }
}

export function uitCompact(c: unknown): { ontwerp: Ontwerp; kamer: Kamer } | null {
  if (!isObj(c) || !Array.isArray(c.k) || !Array.isArray(c.i)) return null
  const [L, B, H, tegelH] = c.k as unknown[]
  if (![L, B, H].every(isNum)) return null
  const type: ProjectType = ['badkamer', 'toilet', 'keuken', 'vloer'].includes(c.t as string) ? (c.t as ProjectType) : 'badkamer'
  const kamer: Kamer = {
    L: Math.min(3000, Math.max(80, L as number)),
    B: Math.min(3000, Math.max(80, B as number)),
    H: Math.min(500, Math.max(180, H as number)),
    tegelH: isNum(tegelH) ? Math.max(0, Math.min(H as number, tegelH)) : 0,
    type,
  }
  const items = (c.i as unknown[])
    .slice(0, 80)
    .map((t, i) => (Array.isArray(t) ? normItem({ id: `i${i}`, type: t[0], x: t[1], y: t[2], w: t[3], d: t[4], rot: t[5] }) : null))
    .filter((i): i is OntwerpItem => i != null)
  const af = (x: unknown) => (Array.isArray(x) ? { kleur: x[0], formaat: x[1], verband: x[2] } : null)
  const basis = leegOntwerp(type)
  return {
    kamer,
    ontwerp: { ...basis, items, vloer: normAfwerking(af(c.v), basis.vloer), wand: normAfwerking(af(c.w), basis.wand) },
  }
}

/**
 * Zoekt een vrije plek voor een nieuw item: wandobjecten langs de wanden, deuren/ramen in een vrij stuk wand,
 * vrije objecten in het midden. Valt terug op het midden van de ruimte.
 */
export function vrijePlek(type: ItemType, k: Kamer, items: OntwerpItem[], id: string, voorkeur?: { x: number; y: number }): OntwerpItem {
  const basis = nieuwItem(type, k, id, voorkeur)
  if (voorkeur) return basis
  const def = ITEMS[type]
  const botst = (it: OntwerpItem) =>
    def.montage === 'in'
      ? items.some((o) => ITEMS[o.type].montage === 'in' && wandVan(o, k) === wandVan(it, k) && Math.abs((it.rot % 180 === 0 ? it.x - o.x : it.y - o.y)) < (it.w + o.w) / 2 + 5)
      : items.some((o) => overlapt(it, o))
  if (!botst(basis)) return basis
  const stap = 10
  const kandidaten: OntwerpItem[] = []
  for (const w of ['boven', 'links', 'rechts', 'onder'] as Wand[]) {
    const lengte = w === 'boven' || w === 'onder' ? k.L : k.B
    for (let p = stap; p < lengte; p += stap) {
      const x = w === 'boven' || w === 'onder' ? p : w === 'links' ? 0 : k.L
      const y = w === 'links' || w === 'rechts' ? p : w === 'boven' ? 0 : k.B
      kandidaten.push(snap({ ...basis, x, y, rot: WAND_ROT[w] }, k, { wandAfstand: 1000 }))
    }
  }
  return kandidaten.find((c) => !botst(c)) ?? basis
}
