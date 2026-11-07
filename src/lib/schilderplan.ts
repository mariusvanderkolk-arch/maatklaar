/** Eigen schetskleuren, géén gelicentieerde digitale waaierwaarden of kleurconversie. */
import type { Project } from './types'
export const KLEUR_DISCLAIMER = 'Kleuren op je scherm zijn een benadering en kunnen afwijken van de echte verf. Controleer je keuze altijd met een fysieke kleurenwaaier of een proefvlak.'
export const WAAIERS = [
  { id: 'ral', naam: 'RAL Classic', bron: 'https://www.ral-farben.de/en/all-ral-colours' },
  { id: 'ncs', naam: 'NCS', bron: 'https://ncscolour.com/en-int/products/ncs-index-2050' },
  { id: 'sikkens', naam: 'Sikkens 5051 / ACC', bron: 'https://www.sikkens.nl/nl/kleurcollecties/sikkens-5051-kleuren' },
  { id: 'flexa', naam: 'Flexa Mengcollectie', bron: 'https://www.flexa.nl/nl/producten/flexa-mengcollectie-kleurenwaaier' },
  { id: 'sigma', naam: 'Sigma Voice of Colour', bron: 'https://www.sigma.nl/kleur/over-onze-kleuren/sigma-voice-of-colour' },
  { id: 'eigen', naam: 'Andere waaier / eigen kleur', bron: '' },
] as const
export type Waaier = typeof WAAIERS[number]['id']
export interface SchilderKleur { waaier: Waaier; code: string; naam: string; hex: string }
/** Kleine code-/naamselectie gecontroleerd bij de bron. HEX is eigen illustratie, niet de officiële kleurwaarde. */
export const KLEUR_SELECTIE: SchilderKleur[] = [
  { waaier: 'ral', code: 'RAL 9010', naam: 'Zuiver wit', hex: '#f8f6ef' },
  { waaier: 'ral', code: 'RAL 9016', naam: 'Verkeerswit', hex: '#fafafa' },
  { waaier: 'ral', code: 'RAL 9005', naam: 'Gitzwart', hex: '#232426' },
  { waaier: 'flexa', code: 'Wit Salie', naam: 'Wit Salie · Mengkleuren Collectie', hex: '#e8ede5' },
  { waaier: 'flexa', code: 'Wit Zandstrand', naam: 'Wit Zandstrand · Mengkleuren Collectie', hex: '#f1e9dc' },
  { waaier: 'ncs', code: 'S 0500-N', naam: 'S 0500-N', hex: '#f6f5f2' },
  { waaier: 'sikkens', code: 'S0.05.85', naam: 'S0.05.85', hex: '#cbd7df' },
]
export type WandZijde = 'boven' | 'rechts' | 'onder' | 'links' | 'plafond'
export const ZIJDEN: WandZijde[] = ['boven', 'rechts', 'onder', 'links', 'plafond']
export const ZIJDE_NAAM: Record<WandZijde, string> = { boven: 'Wand A (boven)', rechts: 'Wand B (rechts)', onder: 'Wand C (onder)', links: 'Wand D (links)', plafond: 'Plafond' }
export interface SchilderWand { zijde: WandZijde; schilderen: boolean; aftrek: number; kleur: SchilderKleur }
export interface SchilderKamer { id: string; naam: string; lengte: number; breedte: number; hoogte: number; wanden: SchilderWand[] }
export interface SchilderPlan { kamers: SchilderKamer[] }
const num = (x: unknown, max: number) => typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(max, x)) : 0
export function leesKleur(x: Partial<SchilderKleur> | undefined): SchilderKleur {
  return { waaier: WAAIERS.find((w) => w.id === x?.waaier)?.id ?? 'eigen', code: String(x?.code ?? '').slice(0, 60), naam: String(x?.naam ?? '').slice(0, 80), hex: /^#[0-9a-f]{6}$/i.test(x?.hex ?? '') ? x!.hex! : '#dedbd5' }
}
export function nieuweSchilderKamer(id: string, naam = 'Ruimte 1', lengte = 4, breedte = 3, hoogte = 2.6): SchilderKamer {
  return { id, naam, lengte, breedte, hoogte, wanden: ZIJDEN.map((zijde) => ({ zijde, schilderen: true, aftrek: 0, kleur: { waaier: 'eigen', code: '', naam: 'Nog te kiezen', hex: '#dedbd5' } })) }
}
export function schilderKamers(p: Pick<Project, 'schilderPlan'>): SchilderKamer[] {
  if (!Array.isArray(p.schilderPlan?.kamers)) return []
  return p.schilderPlan.kamers.filter((k) => k && typeof k === 'object').slice(0, 5).map((k, i) => ({ id: String(k.id ?? `kamer-${i}`).slice(0, 60), naam: String(k.naam ?? '').slice(0, 60), lengte: num(k.lengte, 100), breedte: num(k.breedte, 100), hoogte: num(k.hoogte, 20), wanden: ZIJDEN.map((zijde) => {
    const w = Array.isArray(k.wanden) ? k.wanden.find((w) => w?.zijde === zijde) : undefined
    return { zijde, schilderen: w?.schilderen === true, aftrek: num(w?.aftrek, 10000), kleur: leesKleur(w?.kleur) }
  }) }))
}
export const schilderM2 = (k: SchilderKamer, w: SchilderWand) => !w.schilderen ? 0 : Math.max(0, (w.zijde === 'plafond' ? k.lengte * k.breedte : (w.zijde === 'boven' || w.zijde === 'onder' ? k.lengte : k.breedte) * k.hoogte) - w.aftrek)
export const schilderVlakId = (k: SchilderKamer, w: SchilderWand) => `plan-${k.id}-${w.zijde}`
export const kleurTekst = (k: SchilderKleur) => `${WAAIERS.find((w) => w.id === k.waaier)?.naam ?? ''} ${k.code} ${k.naam}`.trim()
