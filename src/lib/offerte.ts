/**
 * Offerte als deelbare link. Er is geen server: alle offertegegevens worden gecomprimeerd
 * (lz-string) in de URL-hash gezet: #/offerte-bekijken/<data>. De klant ziet een alleen-lezen
 * weergave en kan akkoord geven via een vooraf ingevuld bericht (WhatsApp, e-mail of kopiëren).
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { formatDatum, isoDatum } from './format'
import type { Bedrijf } from './bedrijf'
import { uitCompact, type CompactOntwerp } from './ontwerp/model'

export interface OfferteData {
  v: 1
  nr: string
  /** offertedatum YYYY-MM-DD */
  datum: string
  geldigTot: string
  bedrijf: Partial<Pick<Bedrijf, 'naam' | 'contactpersoon' | 'telefoon' | 'email' | 'adres' | 'website' | 'kvk' | 'btw' | 'iban'>>
  klant: string
  adres: string
  project: string
  ruimte: string
  maten: string
  /** werkzaamheden: [label, omschrijving] */
  werk: [string, string][]
  /** oppervlakken: [label, waarde] */
  opp: [string, string][]
  /** materialen: [omschrijving, aantal, bedrag, voorbeeldprijs?] */
  mat: [string, string, number, 0 | 1][]
  matTotaal: number
  /** arbeid: [omschrijving, uren] (leeg = zonder arbeid) */
  arb: [string, number][]
  tarief: number
  arbTotaal: number
  totaal: number
  notities: string
  betaaltermijn: string
  prijsTekst: string
  /** ruimte-ontwerp (compact), optioneel */
  ow?: CompactOntwerp
}

const MAX_LINK = 12_000

export function codeerOfferte(d: OfferteData): string {
  return compressToEncodedURIComponent(JSON.stringify(d))
}

const isStr = (x: unknown): x is string => typeof x === 'string'
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const str = (x: unknown, max = 400) => (isStr(x) ? x.slice(0, max) : '')

/** Leest en controleert offertegegevens uit een link. Gooit een Nederlandse foutmelding bij ongeldige data. */
export function decodeerOfferte(code: string): OfferteData {
  if (!code || code.length > MAX_LINK) throw new Error('Deze offerte-link is onvolledig of te lang.')
  let ruw: unknown
  try {
    const json = decompressFromEncodedURIComponent(code)
    if (!json) throw new Error()
    ruw = JSON.parse(json)
  } catch {
    throw new Error('Deze offerte-link kon niet worden gelezen. Controleer of je de volledige link hebt gekopieerd.')
  }
  const o = ruw as Record<string, unknown>
  if (!o || typeof o !== 'object' || o.v !== 1 || !isStr(o.nr) || !isNum(o.totaal) || !Array.isArray(o.mat)) {
    throw new Error('Deze offerte-link bevat geen geldige offerte.')
  }
  const b = (o.bedrijf && typeof o.bedrijf === 'object' ? o.bedrijf : {}) as Record<string, unknown>
  const paren = (x: unknown): [string, string][] =>
    Array.isArray(x) ? x.filter((r) => Array.isArray(r)).slice(0, 60).map((r) => [str(r[0], 120), str(r[1], 200)]) : []
  return {
    v: 1,
    nr: str(o.nr, 40),
    datum: str(o.datum, 10),
    geldigTot: str(o.geldigTot, 10),
    bedrijf: Object.fromEntries(
      ['naam', 'contactpersoon', 'telefoon', 'email', 'adres', 'website', 'kvk', 'btw', 'iban'].map((k) => [k, str(b[k], 160)]).filter(([, v]) => v),
    ),
    klant: str(o.klant, 120),
    adres: str(o.adres, 200),
    project: str(o.project, 120),
    ruimte: str(o.ruimte, 40),
    maten: str(o.maten, 80),
    werk: paren(o.werk),
    opp: paren(o.opp),
    mat: (o.mat as unknown[])
      .filter((r): r is unknown[] => Array.isArray(r))
      .slice(0, 120)
      .map((r) => [str(r[0], 160), str(r[1], 60), isNum(r[2]) ? r[2] : 0, r[3] ? 1 : 0]),
    matTotaal: isNum(o.matTotaal) ? o.matTotaal : 0,
    arb: Array.isArray(o.arb) ? o.arb.filter((r): r is unknown[] => Array.isArray(r)).slice(0, 40).map((r) => [str(r[0], 120), isNum(r[1]) ? r[1] : 0]) : [],
    tarief: isNum(o.tarief) ? o.tarief : 0,
    arbTotaal: isNum(o.arbTotaal) ? o.arbTotaal : 0,
    totaal: o.totaal as number,
    notities: str(o.notities, 2000),
    betaaltermijn: str(o.betaaltermijn, 400),
    prijsTekst: str(o.prijsTekst, 400),
    ...(uitCompact(o.ow) ? { ow: o.ow as CompactOntwerp } : {}),
  }
}

/** Volledige link naar de klantweergave. */
export function offerteLink(d: OfferteData, basis = `${location.origin}${location.pathname}`): string {
  return `${basis}#/offerte-bekijken/${codeerOfferte(d)}`
}

/** Telefoonnummer voor wa.me: alleen cijfers, internationaal (NL: 06… → 316…). */
export function waNummer(tel: string): string {
  let n = tel.replace(/[^\d+]/g, '')
  if (n.startsWith('+')) n = n.slice(1)
  else if (n.startsWith('00')) n = n.slice(2)
  else if (n.startsWith('0')) n = `31${n.slice(1)}`
  return n.replace(/\D/g, '')
}

const eur = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
const datumNl = (iso: string) =>
  iso ? formatDatum({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, isoDatum(iso)) : ''

/** Bericht van de klant terug naar de aannemer. */
export function akkoordBericht(d: OfferteData, naam: string, opmerking: string, vandaagIso: string): string {
  const aan = d.bedrijf.contactpersoon || d.bedrijf.naam || 'aannemer'
  return [
    `Beste ${aan},`,
    '',
    `Hierbij geef ik akkoord op offerte ${d.nr}${d.project ? ` (${d.project})` : ''} van ${datumNl(d.datum)}, totaal ${eur(d.totaal)} incl. btw.`,
    ...(opmerking.trim() ? ['', `Opmerking: ${opmerking.trim()}`] : []),
    '',
    `Naam: ${naam.trim()}`,
    `Datum akkoord: ${datumNl(vandaagIso)}`,
    '',
    'Met vriendelijke groet,',
    naam.trim(),
  ].join('\n')
}

export const whatsappLink = (tel: string, tekst: string) => `https://wa.me/${tel ? waNummer(tel) : ''}?text=${encodeURIComponent(tekst)}`
export const mailtoLink = (email: string, onderwerp: string, tekst: string) =>
  `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst)}`

export { datumNl }
