/**
 * Aanbouw (fase B): hoeveelheden voor het casco uit lengte × breedte × hoogte. Puur, zonder prijzen.
 *
 * Aannames (staan ook in de toelichting van elke regel):
 * - De maten zijn binnenmaten. De aanbouw staat met één lange zijde (de lengte L) tegen de bestaande gevel.
 *   In de plattegrond is dat de bovenwand. Nieuwe gevels: links + onder + rechts = L + 2B.
 * - Plat dak; het overstek komt aan de drie vrije zijden.
 * - Geen sterkte- of constructieberekening: fundering en ligger altijd volgens de constructeur.
 * - Er zijn geen richtprijzen: de aannemer vult zijn eigen prijs per eenheid in (bij Prijzen).
 */
import type { Afmetingen, Opening, Scope } from './types'

export const AANBOUW_POSTEN = [
  ['aanbouw-grondwerk', 'Grondwerk (ontgraven/aanvullen)', 'per m²', 'grondwerk'],
  ['aanbouw-fundering', 'Strokenfundering', 'per m¹', 'fundering'],
  ['aanbouw-gevel', 'Gevel / buitenmuur', 'per m²', 'buitenmuur'],
  ['aanbouw-isolatie', 'Isolatie vloer, gevels en dak', 'per m²', 'isolatie'],
  ['aanbouw-dak', 'Plat dak (dakbeschot + bedekking)', 'per m²', 'dak'],
  ['aanbouw-daktrim', 'Daktrim', 'per m¹', 'dak'],
  ['aanbouw-hwa', 'Hemelwaterafvoer incl. aansluiting', 'per stuk', 'hwa'],
  ['aanbouw-kozijn', 'Kozijnen (ramen, deuren, pui)', 'per m²', 'kozijnen'],
  ['aanbouw-doorbraak', 'Doorbraak bestaande gevel', 'per m¹', 'gevelDoorbraak'],
] as const

export type AanbouwId = (typeof AANBOUW_POSTEN)[number][0]

export interface AanbouwMaten {
  /** binnenmaten in m */
  L: number
  B: number
  H: number
  /** vloeroppervlak L × B (m²) */
  vloer: number
  /** lengte nieuwe gevels L + 2B (m¹) */
  gevelLengte: number
  /** gevel bruto (L + 2B) × H (m²) */
  gevelBruto: number
  /** kozijnen in de nieuwe gevels (m²), uit de openingen */
  kozijnM2: number
  kozijnAantal: number
  /** gevel netto = bruto − kozijnen (m²) */
  gevelNetto: number
  /** overstek (m) en dakvlak (L + 2o) × (B + o) (m²) */
  overstek: number
  dak: number
  /** daktrim langs de drie vrije zijden (m¹) */
  daktrim: number
  /** isolatie vloer + gevel netto + dak binnen (L × B) (m²) */
  isolatie: number
  /** doorbraak in de bestaande gevel (m) */
  doorbraak: number
}

const pos = (n: number | undefined) => (Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0)
const r2 = (n: number) => Math.round(n * 100) / 100

export const kozijnOppervlak = (openingen: Opening[]) => openingen.reduce((t, o) => t + pos(o.breedte) * pos(o.hoogte), 0)

export function aanbouwMaten(a: Afmetingen): AanbouwMaten {
  const L = pos(a.lengte)
  const B = pos(a.breedte)
  const H = pos(a.hoogte)
  const gevelLengte = L + 2 * B
  const gevelBruto = gevelLengte * H
  const kozijnM2 = Math.min(gevelBruto, kozijnOppervlak(a.openingen))
  const gevelNetto = Math.max(0, gevelBruto - kozijnM2)
  const overstek = Math.min(1, pos(a.aanbouw?.overstek))
  const dak = L > 0 && B > 0 ? (L + 2 * overstek) * (B + overstek) : 0
  const daktrim = L > 0 && B > 0 ? L + 2 * overstek + 2 * (B + overstek) : 0
  const vloer = L * B
  return {
    L, B, H, vloer, gevelLengte, gevelBruto, kozijnM2, kozijnAantal: a.openingen.length, gevelNetto, overstek, dak, daktrim,
    isolatie: vloer + gevelNetto + vloer,
    doorbraak: Math.min(L, pos(a.aanbouw?.doorbraak)),
  }
}

export interface AanbouwRegel {
  id: AanbouwId
  naam: string
  nodig: number
  eenheid: 'm²' | 'm¹' | 'stuk'
  toelichting: string
}

const nl = (n: number) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 }).format(n)

/** Casco-posten voor de aangevinkte werkzaamheden. Hoeveelheden zonder prijs en zonder snijverlies. */
export function aanbouwRegels(a: Afmetingen, s: Partial<Scope>): AanbouwRegel[] {
  const m = aanbouwMaten(a)
  const uit: AanbouwRegel[] = []
  const naam = (id: AanbouwId) => AANBOUW_POSTEN.find((p) => p[0] === id)![1]
  const add = (id: AanbouwId, nodig: number, eenheid: AanbouwRegel['eenheid'], toelichting: string) => {
    if (nodig > 0) uit.push({ id, naam: naam(id), nodig: r2(nodig), eenheid, toelichting })
  }
  const LB = `${nl(m.L)} × ${nl(m.B)} m`
  if (s.grondwerk) add('aanbouw-grondwerk', m.vloer, 'm²', `Vloeroppervlak ${LB}. Diepte en m³ volgens tekening`)
  if (s.fundering) add('aanbouw-fundering', m.gevelLengte, 'm¹', `Nieuwe gevels L + 2B = ${nl(m.L)} + 2 × ${nl(m.B)} m. Afmetingen volgens constructeur`)
  if (s.buitenmuur) add('aanbouw-gevel', m.gevelNetto, 'm²', `(${nl(m.gevelLengte)} m × ${nl(m.H)} m) − ${nl(r2(m.kozijnM2))} m² kozijnen`)
  if (s.isolatie) add('aanbouw-isolatie', m.isolatie, 'm²', `Vloer ${nl(r2(m.vloer))} + gevels ${nl(r2(m.gevelNetto))} + dak ${nl(r2(m.vloer))} m²`)
  if (s.dak) {
    add('aanbouw-dak', m.dak, 'm²', m.overstek > 0 ? `(${nl(m.L)} + 2 × ${nl(m.overstek)}) × (${nl(m.B)} + ${nl(m.overstek)}) m, overstek aan 3 zijden` : `${LB}, zonder overstek`)
    add('aanbouw-daktrim', m.daktrim, 'm¹', 'Langs de drie vrije dakranden')
  }
  if (s.hwa) add('aanbouw-hwa', 1, 'stuk', `Lengte ca. ${nl(m.H)} m (hoogte aanbouw)`)
  if (s.kozijnen) add('aanbouw-kozijn', m.kozijnM2, 'm²', `${m.kozijnAantal} kozijn(en) uit de openingen bij Opmeten`)
  if (s.gevelDoorbraak) add('aanbouw-doorbraak', m.doorbraak, 'm¹', 'Breedte doorbraak. Ligger en stempelen volgens constructeur')
  return uit
}
