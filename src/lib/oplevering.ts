/**
 * Opleverrapport per project. Maatklaar weet al welke werkzaamheden er in de klus zitten, dus de checklist staat
 * meteen klaar: per onderdeel kies je "In orde" of "Restpunt" (met omschrijving en foto). Beide partijen tekenen op
 * hetzelfde scherm. Alles blijft lokaal (en in de cloud-sync van het project); de app verstuurt zelf niets.
 */
import { scopeItems } from './ruimtes'
import type { Project } from './types'

export type PuntStatus = 'open' | 'goed' | 'restpunt'

export interface OpleverPunt {
  id: string
  /** onderdeel, bijv. "Wandtegels" of "Meerwerk MW1: extra stopcontact" */
  onderdeel: string
  status: PuntStatus
  /** wat er nog moet gebeuren (bij een restpunt) */
  notitie?: string
  /** foto-id uit project.fotos */
  fotoId?: string
  /** YYYY-MM-DD: wanneer een restpunt is afgehandeld */
  afgerondOp?: string
  /** afgesproken hersteldatum (YYYY-MM-DD) */
  uiterlijk?: string
}

export interface OpleverHandtekening {
  naam: string
  /** PNG-data-URL */
  handtekening: string
  /** ISO-tijdstip */
  op: string
}

export interface Oplevering {
  /** YYYY-MM-DD */
  datum: string
  punten: OpleverPunt[]
  opmerking?: string
  aannemer?: OpleverHandtekening
  klant?: OpleverHandtekening
}

/** Onderdelen die je niet "oplevert" (geen zichtbaar resultaat). */
const NIET_OPLEVEREN = new Set(['container'])

/** Checklist uit de werkzaamheden van het project plus getekend meerwerk. */
export function puntenVoor(p: Pick<Project, 'type' | 'scope' | 'meerwerk'>, uid: () => string): OpleverPunt[] {
  const werk = scopeItems(p.type)
    .filter((i) => p.scope?.[i.key] && !NIET_OPLEVEREN.has(i.key))
    .map((i) => ({ id: uid(), onderdeel: i.label, status: 'open' as const }))
  const mw = (p.meerwerk ?? [])
    .filter((m) => m.soort === 'meer' && m.teken?.getekend && m.omschrijving.trim())
    .map((m) => ({ id: uid(), onderdeel: `Meerwerk: ${m.omschrijving.trim()}`, status: 'open' as const }))
  return [...werk, ...mw]
}

export const nieuweOplevering = (p: Pick<Project, 'type' | 'scope' | 'meerwerk'>, datum: string, uid: () => string): Oplevering => ({ datum, punten: puntenVoor(p, uid) })

export const restpunten = (o: Oplevering) => o.punten.filter((x) => x.status === 'restpunt')
export const openRestpunten = (o: Oplevering) => restpunten(o).filter((x) => !x.afgerondOp)
export const nietBekeken = (o: Oplevering) => o.punten.filter((x) => x.status === 'open')
export const getekend = (o: Oplevering | undefined) => Boolean(o?.aannemer && o?.klant)

export type OpleverStand = 'leeg' | 'bezig' | 'klaar-om-te-tekenen' | 'getekend' | 'afgerond'

/** Samenvattende stand voor badges en de kaart op het planningscherm. */
export function opleverStand(o: Oplevering | undefined): OpleverStand {
  if (!o) return 'leeg'
  if (getekend(o)) return openRestpunten(o).length ? 'getekend' : 'afgerond'
  return nietBekeken(o).length ? 'bezig' : 'klaar-om-te-tekenen'
}

export const STAND_TEKST: Record<OpleverStand, string> = {
  leeg: 'Nog niet gestart',
  bezig: 'Bezig met nalopen',
  'klaar-om-te-tekenen': 'Klaar om te tekenen',
  getekend: 'Getekend, restpunten open',
  afgerond: 'Opgeleverd',
}

const nlDatum = (iso: string) => {
  const [j, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!j || !m || !d) return iso
  return new Date(Date.UTC(j, m - 1, d)).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** Conceptbericht voor WhatsApp: wat is opgeleverd en wat staat nog open. De aannemer verstuurt het zelf. */
export function opleverTekst(p: Pick<Project, 'naam' | 'klant'>, o: Oplevering, bedrijf = ''): string {
  const k = p.klant.trim()
  const goed = o.punten.filter((x) => x.status === 'goed')
  const rest = restpunten(o)
  const regels = [
    `Hoi${k ? ` ${k}` : ''}, hierbij de oplevering van ${p.naam.trim() || 'je project'} op ${nlDatum(o.datum)}.`,
    '',
    goed.length ? `In orde (${goed.length}): ${goed.map((x) => x.onderdeel).join(', ')}.` : '',
    rest.length
      ? `Restpunten (${rest.length}):\n${rest.map((x) => `- ${x.onderdeel}${x.notitie?.trim() ? `: ${x.notitie.trim()}` : ''}${x.afgerondOp ? ` (afgerond ${nlDatum(x.afgerondOp)})` : x.uiterlijk ? ` (uiterlijk ${nlDatum(x.uiterlijk)})` : ''}`).join('\n')}`
      : 'Er zijn geen restpunten.',
    o.opmerking?.trim() ? `\nOpmerking: ${o.opmerking.trim()}` : '',
    '',
    'Het opleverrapport met handtekeningen stuur ik je als PDF.',
    bedrijf.trim() ? `\nGroet,\n${bedrijf.trim()}` : '',
  ]
  return regels.filter((r, i, a) => !(r === '' && a[i - 1] === '')).join('\n').trim()
}

/** Oude of kapotte data veilig inlezen (bijv. uit de cloud of een back-up). */
export function leesOplevering(ruw: unknown): Oplevering | undefined {
  if (!ruw || typeof ruw !== 'object') return undefined
  const r = ruw as Partial<Oplevering>
  const datum = typeof r.datum === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r.datum) ? r.datum.slice(0, 10) : undefined
  if (!datum) return undefined
  const statussen: PuntStatus[] = ['open', 'goed', 'restpunt']
  const punten = (Array.isArray(r.punten) ? r.punten : [])
    .filter((x): x is OpleverPunt => Boolean(x && typeof x === 'object' && typeof x.id === 'string' && typeof x.onderdeel === 'string'))
    .map((x) => ({ ...x, status: statussen.includes(x.status) ? x.status : 'open' }))
  const hand = (h: unknown): OpleverHandtekening | undefined => {
    const x = h as Partial<OpleverHandtekening> | undefined
    return x && typeof x.naam === 'string' && typeof x.handtekening === 'string' && x.handtekening.startsWith('data:image/') && typeof x.op === 'string' ? { naam: x.naam, handtekening: x.handtekening, op: x.op } : undefined
  }
  return { datum, punten, opmerking: typeof r.opmerking === 'string' ? r.opmerking : undefined, aannemer: hand(r.aannemer), klant: hand(r.klant) }
}
