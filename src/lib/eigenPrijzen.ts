/**
 * Eigen prijslijst: één prijs per artikel (eigen inkoopprijs), met optionele leverancier.
 * Eigen prijzen gaan voor de voorbeeldprijzen. Alles in dit bestand is puur (geen opslag), zodat het goed te testen is.
 *
 * Tot versie 1.2 bestond een prijs per winkel (Gamma/Praxis/Hornbach/Karwei). Oude gegevens en bestanden
 * worden hier omgezet (zie `vanOudFormaat`).
 */
import type { ProductId } from './calc'
import { CATALOGUS, catalogusItem, eenheidLabel } from './catalogus'
import { OUDE_WINKELS, oudeWinkelNaam, type OudeWinkelId, type PrijsAanbod, type PrijsBron } from './prices'

export interface EigenPrijs {
  /** prijs incl. btw; null/undefined = geen eigen prijs (voorbeeldprijs blijft gelden) */
  prijs?: number | null
  /** leverancier, vrije tekst (bijv. "Bouwvoordeel Barneveld") */
  leverancier?: string
  /** afwijkende inhoud per verpakking */
  inhoud?: number | null
  productNaam?: string
  link?: string
  /** ISO-tijdstip van de laatste wijziging */
  bijgewerkt: string
}

export type EigenPrijzen = Partial<Record<ProductId, EigenPrijs>>

const heeftPrijs = (e?: EigenPrijs | null): e is EigenPrijs & { prijs: number } => e?.prijs != null && Number.isFinite(e.prijs)
const isLeeg = (e: EigenPrijs) =>
  !heeftPrijs(e) && !e.leverancier?.trim() && !e.productNaam?.trim() && !e.link?.trim() && (e.inhoud == null || !Number.isFinite(e.inhoud))
const isProduct = (id: string): id is ProductId => CATALOGUS.some((c) => c.id === id)

/** Eigen prijzen over een basisbron (voorbeeldprijzen). */
export function metEigenPrijzen(basis: PrijsBron, eigen: EigenPrijzen): PrijsBron {
  const aantalEigen = telEigenPrijzen(eigen)
  return {
    id: aantalEigen ? `eigen+${basis.id}` : basis.id,
    naam: aantalEigen ? 'Eigen prijslijst' : basis.naam,
    isVoorbeeld: basis.isVoorbeeld && aantalEigen === 0,
    peildatum: laatstBijgewerkt(eigen) ?? basis.peildatum,
    aanbod(product) {
      const e = eigen[product]
      const extra = {
        ...(e?.leverancier?.trim() ? { leverancier: e.leverancier.trim() } : {}),
        ...(e?.productNaam?.trim() ? { productNaam: e.productNaam.trim() } : {}),
        ...(e?.link?.trim() ? { link: e.link.trim() } : {}),
      }
      if (heeftPrijs(e))
        return { prijs: e.prijs, bron: 'eigen', bijgewerkt: e.bijgewerkt, ...(e.inhoud != null && e.inhoud > 0 ? { inhoud: e.inhoud } : {}), ...extra } satisfies PrijsAanbod
      const b = basis.aanbod(product)
      return b ? { ...b, ...extra } : undefined
    },
  }
}

export function telEigenPrijzen(eigen: EigenPrijzen): number {
  return Object.values(eigen).filter((e) => heeftPrijs(e)).length
}

export function laatstBijgewerkt(eigen: EigenPrijzen): string | undefined {
  let max: string | undefined
  for (const e of Object.values(eigen)) if (e && !isLeeg(e) && (!max || e.bijgewerkt > max)) max = e.bijgewerkt
  return max
}

function normaliseer(e: EigenPrijs): EigenPrijs {
  const u: EigenPrijs = { bijgewerkt: e.bijgewerkt }
  if (heeftPrijs(e)) u.prijs = Math.round(e.prijs * 100) / 100
  if (e.leverancier?.trim()) u.leverancier = e.leverancier.trim().slice(0, 80)
  if (e.inhoud != null && Number.isFinite(e.inhoud) && e.inhoud > 0) u.inhoud = e.inhoud
  if (e.productNaam?.trim()) u.productNaam = e.productNaam.trim()
  if (e.link?.trim()) u.link = e.link.trim()
  return u
}

/** Wijzigt één artikel (immutabel). Lege invoer ruimt de regel op, zodat de voorbeeldprijs weer geldt. */
export function zetEigenPrijs(eigen: EigenPrijzen, product: ProductId, wijziging: Partial<Omit<EigenPrijs, 'bijgewerkt'>>, nu: Date = new Date()): EigenPrijzen {
  const nieuw = normaliseer({ ...eigen[product], ...wijziging, bijgewerkt: nu.toISOString() })
  const uit = { ...eigen }
  if (isLeeg(nieuw)) delete uit[product]
  else uit[product] = nieuw
  return uit
}

export function verwijderEigenPrijs(eigen: EigenPrijzen, product: ProductId): EigenPrijzen {
  const uit = { ...eigen }
  delete uit[product]
  return uit
}

/** Samenvoegen; `extra` wint per artikel. */
export function voegSamen(eigen: EigenPrijzen, extra: EigenPrijzen): EigenPrijzen {
  return { ...eigen, ...extra }
}

/** Alle voorbeeldprijzen als eigen prijs (snelle start). */
export function voorbeeldAlsEigen(basis: PrijsBron, nu = new Date()): EigenPrijzen {
  let uit: EigenPrijzen = {}
  for (const item of CATALOGUS) {
    const a = basis.aanbod(item.id)
    if (a) uit = zetEigenPrijs(uit, item.id, { prijs: a.prijs }, nu)
  }
  return uit
}

/** Vult alleen artikelen zonder eigen prijs met de voorbeeldprijs. */
export function vulVoorbeeldenAan(eigen: EigenPrijzen, basis: PrijsBron, nu = new Date()): EigenPrijzen {
  let uit = eigen
  for (const item of CATALOGUS) {
    if (heeftPrijs(eigen[item.id])) continue
    const a = basis.aanbod(item.id)
    if (a) uit = zetEigenPrijs(uit, item.id, { prijs: a.prijs }, nu)
  }
  return uit
}

/** Percentage op eigen prijzen, optioneel alleen voor één leverancier of één groep. */
export function pasPercentageToe(eigen: EigenPrijzen, procent: number, filter: { leverancier?: string; groep?: string } = {}, nu = new Date()): EigenPrijzen {
  if (!Number.isFinite(procent) || procent === 0) return eigen
  let uit = eigen
  const factor = 1 + procent / 100
  const lev = filter.leverancier?.trim().toLowerCase()
  for (const [p, e] of Object.entries(eigen) as [ProductId, EigenPrijs][]) {
    if (!heeftPrijs(e)) continue
    if (lev && (e.leverancier ?? '').trim().toLowerCase() !== lev) continue
    if (filter.groep && catalogusItem(p)?.groep !== filter.groep) continue
    uit = zetEigenPrijs(uit, p, { prijs: Math.round(e.prijs * factor * 100) / 100 }, nu)
  }
  return uit
}

/** Unieke leveranciers in de prijslijst (voor filters/suggesties). */
export const leveranciers = (eigen: EigenPrijzen) => [...new Set(Object.values(eigen).map((e) => e?.leverancier?.trim()).filter(Boolean) as string[])].sort()

// ——— Oud formaat (prijzen per winkel) ————————————————————————————————

type OudeCel = { prijs?: unknown; inhoud?: unknown; productNaam?: unknown; link?: unknown; nietLeverbaar?: unknown; bijgewerkt?: unknown }
export type OudePrijzen = Partial<Record<string, Partial<Record<string, OudeCel>>>>

const OUDE_IDS = OUDE_WINKELS.map((w) => w.id) as string[]

/** Herkent het oude formaat: { product: { gamma: {...}, praxis: {...} } }. */
export function isOudFormaat(x: unknown): x is OudePrijzen {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false
  const rijen = Object.values(x as Record<string, unknown>)
  return rijen.length > 0 && rijen.some((r) => r && typeof r === 'object' && Object.keys(r).some((k) => OUDE_IDS.includes(k)) && !('prijs' in (r as object)))
}

const getal = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null
  if (typeof v !== 'string') return null
  const t = v.replace(/[€\s]/g, '')
  if (!t) return null
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) && n >= 0 ? n : null
}
const datum = (v: unknown, standaard: string) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : standaard)

/** Hoeveel prijzen er per oude winkel zijn ingevuld. */
export function oudeWinkelTelling(oud: OudePrijzen): { id: OudeWinkelId; naam: string; aantal: number }[] {
  return OUDE_WINKELS.map((w) => ({ id: w.id, naam: w.naam, aantal: Object.values(oud).filter((r) => getal(r?.[w.id]?.prijs) != null && r?.[w.id]?.nietLeverbaar !== true).length }))
}

export interface Omzetting {
  prijzen: EigenPrijzen
  /** gekozen hoofdwinkel (meest ingevuld, of door gebruiker gekozen) */
  winkel: OudeWinkelId | null
  /** aantal artikelen met prijs van de hoofdwinkel */
  uitHoofd: number
  /** aantal artikelen waar de hoofdwinkel leeg was en een andere winkel is gebruikt */
  uitAndere: number
  /** aantal artikelen met meer dan één winkelprijs (andere prijzen alleen nog in de bewaarde kopie) */
  meerdere: number
}

/**
 * Zet oude prijzen-per-winkel om naar één prijs per artikel.
 * Hoofdwinkel = `voorkeur`, anders de winkel met de meeste ingevulde prijzen (bij gelijkspel de eerste).
 * Per artikel: prijs van de hoofdwinkel; is die leeg, dan de eerste andere winkel met een prijs.
 * De winkelnaam wordt als leverancier bewaard, zodat zichtbaar blijft waar de prijs vandaan kwam.
 */
export function vanOudFormaat(oud: OudePrijzen, voorkeur?: OudeWinkelId | null, nu = new Date()): Omzetting {
  const telling = oudeWinkelTelling(oud)
  const hoofd = voorkeur ?? [...telling].sort((a, b) => b.aantal - a.aantal)[0]?.id ?? null
  const volgorde = [hoofd, ...OUDE_IDS.filter((w) => w !== hoofd)].filter(Boolean) as string[]
  let prijzen: EigenPrijzen = {}
  let uitHoofd = 0
  let uitAndere = 0
  let meerdere = 0
  for (const [p, rij] of Object.entries(oud)) {
    if (!isProduct(p) || !rij) continue
    const metPrijs = volgorde.filter((w) => getal(rij[w]?.prijs) != null && rij[w]?.nietLeverbaar !== true)
    if (metPrijs.length > 1) meerdere++
    const w = metPrijs[0]
    if (!w) continue
    const c = rij[w]!
    if (w === hoofd) uitHoofd++
    else uitAndere++
    prijzen = zetEigenPrijs(
      prijzen,
      p,
      {
        prijs: getal(c.prijs),
        inhoud: getal(c.inhoud),
        leverancier: oudeWinkelNaam(w),
        productNaam: typeof c.productNaam === 'string' ? c.productNaam : undefined,
        link: typeof c.link === 'string' ? c.link : undefined,
      },
      new Date(datum(c.bijgewerkt, nu.toISOString())),
    )
  }
  return { prijzen, winkel: (hoofd as OudeWinkelId) ?? null, uitHoofd, uitAndere, meerdere }
}

/** Accepteert zowel het nieuwe als het oude formaat (cloud, back-up, opslag). */
export function normaliseerPrijzen(ruw: unknown): EigenPrijzen {
  if (!ruw || typeof ruw !== 'object' || Array.isArray(ruw)) return {}
  if (isOudFormaat(ruw)) return vanOudFormaat(ruw).prijzen
  const uit: EigenPrijzen = {}
  for (const [p, e] of Object.entries(ruw as Record<string, EigenPrijs>)) {
    if (!isProduct(p) || !e || typeof e !== 'object') continue
    const n = normaliseer({
      prijs: getal(e.prijs),
      leverancier: typeof e.leverancier === 'string' ? e.leverancier : undefined,
      inhoud: getal(e.inhoud),
      productNaam: typeof e.productNaam === 'string' ? e.productNaam : undefined,
      link: typeof e.link === 'string' ? e.link : undefined,
      bijgewerkt: datum(e.bijgewerkt, new Date(0).toISOString()),
    })
    if (!isLeeg(n)) uit[p] = n
  }
  return uit
}

// ——— Export / import ————————————————————————————————————————————————

export interface PrijzenExport {
  app: 'slimmer-wonen'
  type: 'prijzen'
  versie: 2
  geexporteerd: string
  prijzen: EigenPrijzen
}

export function naarJson(eigen: EigenPrijzen, nu = new Date()): string {
  const data: PrijzenExport = { app: 'slimmer-wonen', type: 'prijzen', versie: 2, geexporteerd: nu.toISOString(), prijzen: eigen }
  return JSON.stringify(data, null, 2)
}

/** Resultaat van een import: de prijzen, plus info als het een oud bestand per winkel was. */
export interface ImportResultaat {
  prijzen: EigenPrijzen
  oud?: { winkels: { id: OudeWinkelId; naam: string; aantal: number }[]; gekozen: OudeWinkelId | null; uitAndere: number; meerdere: number }
}

function leesOud(oud: OudePrijzen, winkel: OudeWinkelId | null | undefined, nu: Date): ImportResultaat {
  const o = vanOudFormaat(oud, winkel ?? undefined, nu)
  if (!Object.keys(o.prijzen).length) throw new Error('Geen geldige prijzen gevonden in dit bestand.')
  return { prijzen: o.prijzen, oud: { winkels: oudeWinkelTelling(oud).filter((w) => w.aantal > 0), gekozen: o.winkel, uitAndere: o.uitAndere, meerdere: o.meerdere } }
}

export function vanJson(tekst: string, winkel?: OudeWinkelId | null, nu = new Date()): ImportResultaat {
  let data: unknown
  try {
    data = JSON.parse(tekst)
  } catch {
    throw new Error('Dit bestand is geen geldig JSON-bestand.')
  }
  const obj = data as Partial<PrijzenExport>
  const bron = obj && typeof obj === 'object' && 'prijzen' in obj ? obj.prijzen : data
  if (!bron || typeof bron !== 'object' || Array.isArray(bron)) throw new Error('Geen prijzen gevonden in dit bestand.')
  if (isOudFormaat(bron)) return leesOud(bron, winkel, nu)
  const prijzen = normaliseerPrijzen(bron)
  if (!Object.keys(prijzen).length) throw new Error('Geen geldige prijzen gevonden in dit bestand.')
  return { prijzen }
}

const CSV_KOPPEN = ['product_id', 'artikel', 'prijs_incl_btw', 'eenheid', 'leverancier', 'inhoud', 'productnaam', 'link', 'bron', 'bijgewerkt']
const csvVeld = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csvGetal = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))

/** CSV (puntkomma, decimale komma — opent direct in Nederlandse Excel): één regel per artikel. */
export function naarCsv(eigen: EigenPrijzen, basis: PrijsBron): string {
  const regels = [CSV_KOPPEN.join(';')]
  for (const item of CATALOGUS) {
    const e = eigen[item.id]
    const b = basis.aanbod(item.id)
    const isEigen = heeftPrijs(e)
    regels.push(
      [
        item.id,
        item.naam,
        csvGetal(isEigen ? e.prijs : (b?.prijs ?? null)),
        eenheidLabel(item),
        e?.leverancier ?? '',
        csvGetal(e?.inhoud ?? null),
        e?.productNaam ?? '',
        e?.link ?? '',
        isEigen ? 'eigen' : 'voorbeeld',
        isEigen || e ? (e?.bijgewerkt ?? '') : basis.peildatum,
      ]
        .map((v) => csvVeld(String(v)))
        .join(';'),
    )
  }
  return '\uFEFF' + regels.join('\r\n') + '\r\n'
}

/** Eenvoudige CSV-parser met ondersteuning voor aanhalingstekens. */
export function parseCsv(tekst: string): string[][] {
  const t = tekst.replace(/^\uFEFF/, '')
  const eersteRegel = t.split(/\r?\n/, 1)[0] ?? ''
  const sep = (eersteRegel.match(/;/g)?.length ?? 0) >= (eersteRegel.match(/,/g)?.length ?? 0) ? ';' : ','
  const rijen: string[][] = []
  let rij: string[] = []
  let veld = ''
  let quote = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (quote) {
      if (c === '"' && t[i + 1] === '"') {
        veld += '"'
        i++
      } else if (c === '"') quote = false
      else veld += c
    } else if (c === '"') quote = true
    else if (c === sep) {
      rij.push(veld)
      veld = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      rij.push(veld)
      if (rij.some((v) => v.trim() !== '')) rijen.push(rij)
      rij = []
      veld = ''
    } else veld += c
  }
  rij.push(veld)
  if (rij.some((v) => v.trim() !== '')) rijen.push(rij)
  return rijen
}

/**
 * Leest een CSV in. Nieuw formaat: één regel per artikel. Oud formaat (kolom `winkel`): per winkel,
 * omgezet met `vanOudFormaat` (gekozen winkel of de meest ingevulde).
 * Een regel wordt een eigen prijs als bron ≠ 'voorbeeld', of als de prijs/leverancier/inhoud afwijkt van het voorbeeld.
 */
export function vanCsv(tekst: string, basis: PrijsBron, winkel?: OudeWinkelId | null, nu = new Date()): ImportResultaat {
  const rijen = parseCsv(tekst)
  if (rijen.length < 2) throw new Error('Het CSV-bestand bevat geen regels.')
  const kop = rijen[0].map((k) => k.trim().toLowerCase())
  const kol = (naam: string) => kop.indexOf(naam)
  const iP = kol('product_id')
  const iPrijs = kol('prijs_incl_btw') >= 0 ? kol('prijs_incl_btw') : kol('prijs')
  if (iP < 0 || iPrijs < 0) throw new Error('Onbekend CSV-formaat: kolommen product_id en prijs_incl_btw zijn nodig.')
  const waarde = (r: string[], naam: string) => {
    const i = kol(naam)
    return i >= 0 ? (r[i] ?? '').trim() : ''
  }
  const iW = kol('winkel')
  if (iW >= 0) {
    // oud formaat: per winkel
    const oud: OudePrijzen = {}
    for (const r of rijen.slice(1)) {
      const p = (r[iP] ?? '').trim()
      const wTekst = (r[iW] ?? '').trim().toLowerCase()
      const w = OUDE_WINKELS.find((x) => x.id === wTekst || x.naam.toLowerCase() === wTekst)?.id
      if (!isProduct(p) || !w) continue
      const prijs = getal(r[iPrijs] ?? '')
      const bron = waarde(r, 'bron').toLowerCase()
      if (prijs == null || bron === 'voorbeeld') continue
      oud[p] = { ...(oud[p] ?? {}), [w]: { prijs, inhoud: waarde(r, 'inhoud'), productNaam: waarde(r, 'productnaam'), link: waarde(r, 'link'), nietLeverbaar: /^(ja|yes|true|1|x)$/i.test(waarde(r, 'niet_leverbaar')), bijgewerkt: waarde(r, 'bijgewerkt') || undefined } }
    }
    return leesOud(oud, winkel, nu)
  }
  let uit: EigenPrijzen = {}
  for (const r of rijen.slice(1)) {
    const p = (r[iP] ?? '').trim()
    if (!isProduct(p)) continue
    const prijs = getal(r[iPrijs] ?? '')
    const inhoud = getal(waarde(r, 'inhoud'))
    const leverancier = waarde(r, 'leverancier')
    const productNaam = waarde(r, 'productnaam')
    const link = waarde(r, 'link')
    const bron = waarde(r, 'bron').toLowerCase()
    const b = basis.aanbod(p)
    const standaardInhoud = catalogusItem(p)?.inhoud?.standaard
    const prijsAnders = prijs != null && (b == null || Math.abs(prijs - b.prijs) > 0.004)
    const afwijkend = prijsAnders || (inhoud != null && inhoud !== standaardInhoud) || !!leverancier || !!productNaam || !!link
    if (bron === 'voorbeeld' && !afwijkend) continue
    const eigenPrijs = bron === 'voorbeeld' && !prijsAnders ? null : prijs
    uit = zetEigenPrijs(uit, p, { prijs: eigenPrijs, inhoud: eigenPrijs != null ? inhoud : null, leverancier, productNaam, link }, new Date(datum(waarde(r, 'bijgewerkt') || undefined, nu.toISOString())))
  }
  return { prijzen: uit }
}

/** Herkent het bestandstype op inhoud (JSON begint met { ). */
export function importeerPrijzen(tekst: string, basis: PrijsBron, winkel?: OudeWinkelId | null, nu = new Date()): ImportResultaat {
  return tekst.trim().startsWith('{') ? vanJson(tekst, winkel, nu) : vanCsv(tekst, basis, winkel, nu)
}
