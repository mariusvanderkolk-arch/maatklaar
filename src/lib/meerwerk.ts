/**
 * Meer- en minderwerk (meerwerkbon). Pure functies, getest in meerwerk.test.ts.
 * Bedragen incl. 21% btw (zoals de rest van de app). Een meerwerkbon wordt via dezelfde beveiligde
 * deel-/tekenflow als de offerte ter ondertekening aangeboden (snapshot met veld `mw`); er is geen databasewijziging nodig.
 * Waarschuwingsplicht (HR 2022): de klant ziet vóór het tekenen duidelijk dat de prijs stijgt (of daalt) en met hoeveel.
 */
import type { OfferteData } from './offerte'
import type { Bedrijf } from './bedrijf'
import type { FactuurRegel } from './factuur'
import type { OfferteStatus, Project } from './types'
import { projectMarge } from './marge'

export type MeerwerkSoort = 'meer' | 'minder'
type Teken = NonNullable<OfferteStatus['teken']>

export interface MeerwerkItem {
  id: string
  /** volgnummer binnen het project (1, 2, …) */
  nr: number
  /** YYYY-MM-DD */
  datum: string
  soort: MeerwerkSoort
  omschrijving: string
  reden: string
  /** 'bedrag' = vast bedrag; 'berekend' = materiaal (inkoop, met projectmarge) + uren × uurtarief */
  modus: 'bedrag' | 'berekend'
  bedrag: number
  materiaal: number
  uren: number
  /** kleine foto als data-URL (optioneel) */
  foto?: string
  teken?: Teken
}

/** Info op de meerwerkbon (in de gedeelde snapshot). */
export interface MeerwerkInfo {
  soort: MeerwerkSoort
  omschrijving: string
  reden: string
  /** bedrag incl. btw, positief = meerwerk, negatief = minderwerk */
  bedrag: number
  materiaal?: number
  uren?: number
  offerteNr: string
  foto?: string
}

const cent = (n: number) => Math.round(n * 100) / 100
const pos = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0)

/** Grootte van het bedrag (altijd ≥ 0), incl. btw. */
export function bedragVan(m: Pick<MeerwerkItem, 'modus' | 'bedrag' | 'materiaal' | 'uren'>, p: Pick<Project, 'uurtarief' | 'marge'>): number {
  if (m.modus === 'bedrag') return cent(pos(m.bedrag))
  return cent(pos(m.materiaal) * (1 + projectMarge(p) / 100) + pos(m.uren) * pos(p.uurtarief))
}
/** Bedrag met teken: meerwerk +, minderwerk −. */
export const metTeken = (m: MeerwerkItem, p: Pick<Project, 'uurtarief' | 'marge'>) => (m.soort === 'minder' ? -1 : 1) * bedragVan(m, p)

export const goedgekeurd = (m: MeerwerkItem) => Boolean(m.teken?.getekend)
export type MeerwerkStatus = 'concept' | 'verstuurd' | 'getekend' | 'ingetrokken'
export function meerwerkStatus(m: MeerwerkItem): MeerwerkStatus {
  if (m.teken?.getekend) return 'getekend'
  if (m.teken?.ingetrokkenOp) return 'ingetrokken'
  if (m.teken?.token) return 'verstuurd'
  return 'concept'
}
export const STATUS_TEKST: Record<MeerwerkStatus, string> = { concept: 'Concept', verstuurd: 'Wacht op handtekening', getekend: 'Getekend', ingetrokken: 'Ingetrokken' }

/** Som van goedgekeurd meer- en minderwerk (incl. btw). Oude projecten: 0. */
export function meerwerkTotaal(p: Pick<Project, 'meerwerk' | 'uurtarief' | 'marge'>): number {
  return cent((p.meerwerk ?? []).filter(goedgekeurd).reduce((s, m) => s + metTeken(m, p), 0))
}

export function volgendNr(p: Pick<Project, 'meerwerk'>): number {
  return (p.meerwerk ?? []).reduce((n, m) => Math.max(n, m.nr), 0) + 1
}

export const bonNummer = (offerteNr: string | undefined, nr: number) => `${offerteNr && offerteNr !== '—' ? `${offerteNr}-` : ''}MW${nr}`

export function waarschuwing(soort: MeerwerkSoort, bedrag: number, euro: (n: number) => string): string {
  return soort === 'meer'
    ? `Let op: door dit meerwerk wordt de prijs ${euro(Math.abs(bedrag))} hoger (incl. btw). Pas na jouw handtekening wordt het uitgevoerd en in rekening gebracht.`
    : `Door dit minderwerk wordt de prijs ${euro(Math.abs(bedrag))} lager (incl. btw).`
}

/** Snapshot voor de meerwerkbon (OfferteData-vorm, zodat de bestaande teken-/deelflow hem kan dragen). */
export function maakMeerwerkData(p: Project, m: MeerwerkItem, bedrijf: Bedrijf, offerteNr: string): OfferteData {
  const bedrag = metTeken(m, p)
  const label = m.soort === 'meer' ? 'Meerwerk' : 'Minderwerk'
  const geldigTot = new Date(Date.parse(m.datum) + 30 * 86_400_000).toISOString().slice(0, 10)
  return {
    v: 1,
    nr: bonNummer(offerteNr, m.nr),
    datum: m.datum,
    geldigTot,
    bedrijf: Object.fromEntries(
      (['naam', 'contactpersoon', 'telefoon', 'email', 'adres', 'website', 'kvk', 'btw', 'iban'] as const).map((k) => [k, (bedrijf[k] ?? '').trim()]).filter(([, v]) => v),
    ),
    klant: p.klant,
    adres: p.adres,
    project: p.naam,
    ruimte: '',
    maten: '',
    werk: [[label, m.omschrijving]],
    opp: [],
    mat: [[`${label}: ${m.omschrijving}`.slice(0, 160), '', bedrag, 0]],
    matTotaal: bedrag,
    arb: [],
    tarief: p.uurtarief,
    arbTotaal: 0,
    totaal: bedrag,
    notities: m.reden,
    betaaltermijn: bedrijf.betaaltermijn?.trim() ?? '',
    prijsTekst: '',
    mw: {
      soort: m.soort,
      omschrijving: m.omschrijving,
      reden: m.reden,
      bedrag,
      ...(m.modus === 'berekend' ? { materiaal: cent(pos(m.materiaal) * (1 + projectMarge(p) / 100)), uren: pos(m.uren) } : {}),
      offerteNr,
      ...(m.foto ? { foto: m.foto } : {}),
    },
  }
}

const isFoto = (x: unknown): x is string => typeof x === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x) && x.length <= 150_000

/** Controleert de `mw`-info uit een (onvertrouwde) snapshot. */
export function leesMeerwerkInfo(ruw: unknown): MeerwerkInfo | undefined {
  if (!ruw || typeof ruw !== 'object') return undefined
  const o = ruw as Record<string, unknown>
  if (o.soort !== 'meer' && o.soort !== 'minder') return undefined
  const s = (x: unknown, n: number) => (typeof x === 'string' ? x.slice(0, n) : '')
  const g = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined)
  return {
    soort: o.soort,
    omschrijving: s(o.omschrijving, 400),
    reden: s(o.reden, 600),
    bedrag: g(o.bedrag) ?? 0,
    ...(g(o.materiaal) != null ? { materiaal: g(o.materiaal) } : {}),
    ...(g(o.uren) != null ? { uren: g(o.uren) } : {}),
    offerteNr: s(o.offerteNr, 40),
    ...(isFoto(o.foto) ? { foto: o.foto } : {}),
  }
}

/** Factuurregels voor goedgekeurd meer-/minderwerk (excl. btw, 21%). */
export function meerwerkFactuurRegels(p: Project, uid: () => string): FactuurRegel[] {
  return (p.meerwerk ?? []).filter(goedgekeurd).map((m) => ({
    id: uid(),
    soort: 'materiaal' as const,
    omschrijving: `${m.soort === 'meer' ? 'Meerwerk' : 'Minderwerk'}: ${m.omschrijving}`.slice(0, 160),
    detail: `bon ${bonNummer(p.offerte?.nummer, m.nr)}, getekend ${m.teken!.getekend!.op.slice(0, 10)}`,
    excl: cent(metTeken(m, p) / 1.21),
    btw: 21 as const,
  }))
}
