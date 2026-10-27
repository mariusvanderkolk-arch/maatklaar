/**
 * Herziene offerte: vergelijking per regel met de vorige gedeelde versie.
 * De vorige versie gaat als compacte samenvatting mee in de offerte zelf (veld `vorige`),
 * zodat de klant (link of tekenlink) ziet wat er veranderd is. Geen extra server-opslag nodig.
 */
import type { OfferteData } from './offerte'

export interface VorigeVersie {
  nr: string
  /** offertedatum YYYY-MM-DD van de vorige versie */
  datum: string
  totaal: number
  /** [omschrijving, aantal, bedrag] */
  mat: [string, string, number][]
  /** [omschrijving, uren] */
  arb: [string, number][]
  tarief: number
  arbTotaal: number
  onv?: number
}

export type Wijziging = 'nieuw' | 'gewijzigd' | 'gelijk'
export interface MatRegelDiff {
  soort: Wijziging
  /** bij 'gewijzigd': oude waarden */
  was?: { aantal?: string; bedrag?: number }
}
export interface Herziening {
  vorige: VorigeVersie
  mat: MatRegelDiff[]
  /** materiaalregels die niet meer op de offerte staan */
  matWeg: [string, string, number][]
  arb: { soort: Wijziging; wasUren?: number }[]
  arbWeg: [string, number][]
  tariefWas?: number
  onvWas?: number
  verschil: number
  /** aantal regels nieuw/gewijzigd/vervallen */
  aantal: number
}

const rond = (n: number) => Math.round(n * 100) / 100

/** Compacte samenvatting van een (vorige) versie om mee te sturen. */
export function vatSamen(d: OfferteData): VorigeVersie {
  return {
    nr: d.nr,
    datum: d.datum,
    totaal: d.totaal,
    mat: d.mat.map(([o, a, b]) => [o, a, b]),
    arb: d.arb.map(([o, u]) => [o, u]),
    tarief: d.tarief,
    arbTotaal: d.arbTotaal,
    ...(d.onv?.[1] ? { onv: d.onv[1] } : {}),
  }
}

const str = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '')
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)

/** Controleert een ruwe samenvatting (uit link of server). Ongeldig → undefined. */
export function leesVorige(x: unknown): VorigeVersie | undefined {
  const o = x as Record<string, unknown>
  if (!o || typeof o !== 'object' || typeof o.nr !== 'string' || typeof o.totaal !== 'number' || !Array.isArray(o.mat)) return undefined
  const rijen = (r: unknown) => (Array.isArray(r) ? r.filter((y): y is unknown[] => Array.isArray(y)) : [])
  return {
    nr: str(o.nr, 40),
    datum: str(o.datum, 10),
    totaal: num(o.totaal),
    mat: rijen(o.mat).slice(0, 120).map((r) => [str(r[0], 160), str(r[1], 60), num(r[2])]),
    arb: rijen(o.arb).slice(0, 40).map((r) => [str(r[0], 120), num(r[1])]),
    tarief: num(o.tarief),
    arbTotaal: num(o.arbTotaal),
    ...(num(o.onv) ? { onv: num(o.onv) } : {}),
  }
}

/** Vergelijkt de huidige offerte met de vorige versie. Regels worden gekoppeld op omschrijving. */
export function vergelijk(d: OfferteData, v: VorigeVersie): Herziening {
  const vrijMat = v.mat.map(() => true)
  const mat: MatRegelDiff[] = d.mat.map(([oms, aantal, bedrag]) => {
    const i = v.mat.findIndex((r, j) => vrijMat[j] && r[0] === oms)
    if (i < 0) return { soort: 'nieuw' }
    vrijMat[i] = false
    const [, wasA, wasB] = v.mat[i]
    const was: MatRegelDiff['was'] = {}
    if (wasA !== aantal) was.aantal = wasA
    if (rond(wasB) !== rond(bedrag)) was.bedrag = wasB
    return Object.keys(was).length ? { soort: 'gewijzigd', was } : { soort: 'gelijk' }
  })
  const matWeg = v.mat.filter((_, j) => vrijMat[j])
  const vrijArb = v.arb.map(() => true)
  const arb = d.arb.map(([oms, uren]) => {
    const i = v.arb.findIndex((r, j) => vrijArb[j] && r[0] === oms)
    if (i < 0) return { soort: 'nieuw' as const }
    vrijArb[i] = false
    return rond(v.arb[i][1]) !== rond(uren) ? { soort: 'gewijzigd' as const, wasUren: v.arb[i][1] } : { soort: 'gelijk' as const }
  })
  const arbWeg = v.arb.filter((_, j) => vrijArb[j])
  const tariefWas = d.arb.length && v.arb.length && rond(v.tarief) !== rond(d.tarief) ? v.tarief : undefined
  const onvNu = d.onv?.[1] ?? 0
  const onvWas = rond(onvNu) !== rond(v.onv ?? 0) ? (v.onv ?? 0) : undefined
  const aantal =
    mat.filter((m) => m.soort !== 'gelijk').length + matWeg.length + arb.filter((a) => a.soort !== 'gelijk').length + arbWeg.length + (tariefWas !== undefined ? 1 : 0) + (onvWas !== undefined ? 1 : 0)
  return { vorige: v, mat, matWeg, arb, arbWeg, tariefWas, onvWas, verschil: rond(d.totaal - v.totaal), aantal }
}

/** Herziening voor weergave, of null als er geen (zinvolle) vorige versie is. */
export function herziening(d: OfferteData): Herziening | null {
  if (!d.vorige || d.mw) return null
  const h = vergelijk(d, d.vorige)
  return h.aantal > 0 || h.verschil !== 0 ? h : null
}
