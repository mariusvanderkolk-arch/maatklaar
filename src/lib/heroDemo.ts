/**
 * Interactieve plattegrond in de homepage-hero. Puur in het geheugen: nooit opslaan
 * (geen localStorage/IndexedDB), net als src/lib/demo.ts.
 */
import type { Afmetingen } from './types'
import { demoProject } from './demo'

export const HERO_ONDERDELEN = [
  { id: 'inloopdouche', label: 'Inloopdouche' },
  { id: 'toilet', label: 'Toilet' },
  { id: 'wastafelmeubel', label: 'Wastafel' },
] as const
export type HeroOnderdeel = (typeof HERO_ONDERDELEN)[number]['id']

export const HERO_MIN = 1.2
export const HERO_MAX = 4.0
export const HERO_STAP = 0.1

export interface HeroDemoStaat {
  lengte: number
  breedte: number
  aan: Record<HeroOnderdeel, boolean>
}

export function startStaat(): HeroDemoStaat {
  return { lengte: 2.4, breedte: 1.8, aan: { inloopdouche: true, toilet: true, wastafelmeubel: true } }
}

const rond = (n: number) => Math.round(n * 10) / 10

/** Maat met stap verhogen/verlagen, binnen de grenzen. */
export function verstel(waarde: number, richting: 1 | -1): number {
  return rond(Math.min(HERO_MAX, Math.max(HERO_MIN, waarde + richting * HERO_STAP)))
}

export function wissel(s: HeroDemoStaat, id: HeroOnderdeel): HeroDemoStaat {
  return { ...s, aan: { ...s.aan, [id]: !s.aan[id] } }
}

/** Vloer en (globale) tegelwand, zoals een vakman ze snel zou willen zien. */
export function oppervlakken(s: HeroDemoStaat, hoogte = 2.6) {
  const vloer = rond(s.lengte * s.breedte * 100) / 100
  const wand = Math.round(2 * (s.lengte + s.breedte) * hoogte * 10) / 10
  return { vloer: Math.round(vloer * 100) / 100, wand }
}

export function heroAfmetingen(s: HeroDemoStaat): Afmetingen {
  const basis = demoProject(0).afmetingen
  return {
    ...basis,
    lengte: s.lengte,
    breedte: s.breedte,
    douche: { breedte: Math.min(0.9, s.lengte / 2), diepte: Math.min(1.2, s.breedte * 0.66) },
  }
}
