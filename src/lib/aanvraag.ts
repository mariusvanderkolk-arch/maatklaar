/**
 * Aanvraaglink: een eigen aanvraagformulier voor de aannemer, zonder server. De link bevat alleen de bedrijfsnaam en
 * het zakelijke WhatsApp-nummer. De klant vult de vragen in die bij zijn klus horen; daarna opent WhatsApp op de
 * telefoon van de klant met een kant-en-klaar bericht aan de aannemer. De klant verstuurt het zelf; Maatklaar bewaart
 * en verstuurt niets. In het bericht zit een link waarmee de aannemer er met één tik een project van maakt.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { ProjectType } from './types'

export interface AanvraagProfiel {
  /** bedrijfsnaam */
  n: string
  /** WhatsApp-nummer in internationaal formaat, alleen cijfers (bijv. 31612345678) */
  t: string
}

export type AanvraagType = ProjectType | 'anders'

export interface Aanvraag {
  type: AanvraagType
  /** aangevinkte onderdelen (labels uit VRAGEN) */
  keuzes: string[]
  /** ongeveer hoeveel m² (vrije tekst, bijv. "6") */
  m2: string
  wanneer: string
  plaats: string
  wensen: string
  naam: string
  telefoon: string
}

export const TYPE_LABEL: Record<AanvraagType, string> = {
  badkamer: 'Badkamer',
  toilet: 'Toilet',
  keuken: 'Keuken',
  vloer: 'Vloer',
  aanbouw: 'Aanbouw',
  stucwerk: 'Stucwerk',
  schilderwerk: 'Schilderwerk',
  anders: 'Iets anders',
}

/** Per soort klus: wat bepaalt de prijs? De klant vinkt aan wat van toepassing is. */
export const VRAGEN: Record<AanvraagType, { keuzes: string[]; m2?: string }> = {
  badkamer: { keuzes: ['Oude badkamer slopen', 'Inloopdouche', 'Bad', 'Hangtoilet', 'Wastafelmeubel', 'Vloerverwarming', 'Tegels tot het plafond', 'Sanitair koop ik zelf'], m2: 'Vloeroppervlak badkamer (m²)' },
  toilet: { keuzes: ['Oude toilet slopen', 'Hangtoilet', 'Fonteintje', 'Nieuwe wandtegels', 'Nieuwe vloertegels', 'Sanitair koop ik zelf'], m2: 'Vloeroppervlak toilet (m²)' },
  keuken: { keuzes: ['Oude keuken verwijderen', 'Nieuwe keuken al gekocht', 'Inbouwapparatuur aansluiten', 'Tegelwerk achterwand', 'Elektra of perilex aanpassen', 'Leidingen verleggen'], m2: 'Lengte keukenblok (m)' },
  vloer: { keuzes: ['Laminaat', 'PVC', 'Tegelvloer', 'Oude vloer eruit', 'Egaliseren', 'Plinten', 'Vloerverwarming aanwezig'], m2: 'Oppervlak vloer (m²)' },
  aanbouw: { keuzes: ['Tekening of vergunning is er al', 'Nog geen tekening', 'Plat dak', 'Schuin dak', 'Openslaande deuren of schuifpui', 'Ook afwerking binnen'], m2: 'Ongeveer hoe groot (m²)' },
  stucwerk: { keuzes: ['Wanden', 'Plafonds', 'Oud behang moet eraf', 'Scheuren of gaten herstellen', 'Glad (sausklaar)', 'Spachtelputz of structuur'], m2: 'Ongeveer hoeveel m² wand en plafond' },
  schilderwerk: { keuzes: ['Binnen', 'Buiten', 'Wanden en plafonds', 'Kozijnen en deuren', 'Houtrot herstellen', 'Kleur weet ik al'], m2: 'Ongeveer hoeveel m²' },
  anders: { keuzes: [] },
}

export const WANNEER = ['Zo snel mogelijk', 'Binnen 3 maanden', 'Over 3 tot 6 maanden', 'Later of weet ik nog niet'] as const

/** Telefoonnummer naar wa.me-formaat (alleen cijfers, landcode). NL-nummers die met 0 beginnen krijgen 31. */
export function waNummer(tel: string): string | null {
  let d = tel.trim().replace(/^\+/, '00').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = `31${d.slice(1)}`
  if (d.startsWith('310')) d = `31${d.slice(3)}` // +31 (0)6…
  return d.length >= 10 && d.length <= 15 ? d : null
}

// stuurtekens (behalve regeleinde in de toelichting) vervangen door een spatie
const schoon = (s: unknown, max: number) =>
  typeof s === 'string' ? [...s].map((c) => { const n = c.charCodeAt(0); return (n < 32 && c !== '\n') || n === 127 ? ' ' : c }).join('').trim().slice(0, max) : ''

export function codeerProfiel(p: AanvraagProfiel): string {
  return compressToEncodedURIComponent(JSON.stringify({ v: 1, n: schoon(p.n, 80), t: p.t }))
}

export function leesProfiel(code: string): AanvraagProfiel | null {
  try {
    const r = JSON.parse(decompressFromEncodedURIComponent(code) || 'null') as Partial<AanvraagProfiel> & { v?: number }
    if (!r || r.v !== 1) return null
    const t = waNummer(String(r.t ?? ''))
    return t ? { n: schoon(r.n, 80), t } : null
  } catch {
    return null
  }
}

/** Basis-URL van de app (zonder hash). */
const basisUrl = () => (typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : 'https://maatklaar.nl/')

export const aanvraagLink = (p: AanvraagProfiel, basis = basisUrl()) => `${basis}#/aanvraag/${codeerProfiel(p)}`

const TYPES = Object.keys(TYPE_LABEL) as AanvraagType[]

export function codeerAanvraag(a: Aanvraag): string {
  return compressToEncodedURIComponent(JSON.stringify({ v: 1, ...a }))
}

export function leesAanvraag(code: string): Aanvraag | null {
  try {
    const r = JSON.parse(decompressFromEncodedURIComponent(code) || 'null') as Partial<Aanvraag> & { v?: number }
    if (!r || r.v !== 1) return null
    const type = TYPES.includes(r.type as AanvraagType) ? (r.type as AanvraagType) : 'anders'
    const toegestaan = new Set(VRAGEN[type].keuzes)
    return {
      type,
      keuzes: (Array.isArray(r.keuzes) ? r.keuzes : []).map((k) => schoon(k, 60)).filter((k) => toegestaan.has(k)),
      m2: schoon(r.m2, 12),
      wanneer: schoon(r.wanneer, 40),
      plaats: schoon(r.plaats, 120),
      wensen: schoon(r.wensen, 1000),
      naam: schoon(r.naam, 80),
      telefoon: schoon(r.telefoon, 20),
    }
  } catch {
    return null
  }
}

/** Link voor de aannemer: opent "Nieuw project" met de aanvraag al ingevuld. */
export const projectVanAanvraagLink = (a: Aanvraag, basis = basisUrl()) => `${basis}#/nieuw?aanvraag=${codeerAanvraag(a)}`

/** Haalt de aanvraag uit een hash als #/nieuw?aanvraag=… */
export function aanvraagUitHash(hash: string): Aanvraag | null {
  const q = hash.split('?')[1]
  if (!q) return null
  const code = new URLSearchParams(q).get('aanvraag')
  return code ? leesAanvraag(code) : null
}

/** Het WhatsApp-bericht dat de klant aan de aannemer stuurt. */
export function aanvraagTekst(a: Aanvraag, bedrijf: string, projectLink: string): string {
  const v = VRAGEN[a.type]
  const regels = [
    `Hoi${bedrijf.trim() ? ` ${bedrijf.trim()}` : ''}, ik heb een aanvraag voor een klus.`,
    '',
    `Klus: ${TYPE_LABEL[a.type]}`,
    a.keuzes.length ? `Wat erbij hoort: ${a.keuzes.join(', ')}` : '',
    a.m2.trim() && v.m2 ? `${v.m2.replace(/ \(.*\)$/, '')}: ${a.m2.trim()} ${/\(m\)/.test(v.m2) ? 'm' : 'm²'}` : '',
    a.wanneer ? `Wanneer: ${a.wanneer}` : '',
    a.plaats.trim() ? `Adres of plaats: ${a.plaats.trim()}` : '',
    a.wensen.trim() ? `Toelichting: ${a.wensen.trim()}` : '',
    '',
    `Naam: ${a.naam.trim()}`,
    a.telefoon.trim() ? `Telefoon: ${a.telefoon.trim()}` : '',
    '',
    "Ik stuur hieronder nog een paar foto's van de ruimte.",
    '',
    `(Voor de vakman: maak hier direct een project van in Maatklaar: ${projectLink})`,
  ]
  return regels.filter((r, i, arr) => r !== '' || (arr[i - 1] !== '' && i > 0)).join('\n').trim()
}

export const aanvraagWaUrl = (nummer: string, tekst: string) => `https://wa.me/${nummer}?text=${encodeURIComponent(tekst)}`

/** Projectvelden uit een aanvraag (voor het formulier Nieuw project). */
export function projectVelden(a: Aanvraag): { type: ProjectType; klant: string; adres: string; naam: string; aanvraag: { tekst: string; datum: number } } {
  const type: ProjectType = a.type === 'anders' ? 'badkamer' : a.type
  const tekst = [
    `Soort klus: ${TYPE_LABEL[a.type]}`,
    a.keuzes.length ? `Wat erbij hoort: ${a.keuzes.join(', ')}` : '',
    a.m2.trim() ? `Omvang: ${a.m2.trim()} ${/\(m\)/.test(VRAGEN[a.type].m2 ?? '') ? 'm' : 'm²'}` : '',
    a.wanneer ? `Wanneer: ${a.wanneer}` : '',
    a.wensen.trim() ? `Toelichting: ${a.wensen.trim()}` : '',
    a.telefoon.trim() ? `Telefoon klant: ${a.telefoon.trim()}` : '',
  ].filter(Boolean).join('\n')
  return { type, klant: a.naam.trim(), adres: a.plaats.trim(), naam: `${TYPE_LABEL[a.type]}${a.naam.trim() ? ` ${a.naam.trim().split(/\s+/).slice(-1)[0]}` : ''}`, aanvraag: { tekst, datum: Date.now() } }
}
