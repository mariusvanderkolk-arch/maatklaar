/**
 * Eigen prijzen: door de gebruiker ingevoerde prijzen die de voorbeeldprijzen overschrijven.
 * Alles in dit bestand is puur (geen localStorage), zodat het goed te testen is.
 */
import type { ProductId } from './calc'
import { CATALOGUS, catalogusItem, eenheidLabel } from './catalogus'
import { WINKELS, type PrijsAanbod, type PrijsBron, type WinkelId } from './prices'

export interface EigenPrijs {
  /** prijs incl. btw; null/undefined = geen eigen prijs (voorbeeldprijs blijft gelden) */
  prijs?: number | null
  /** afwijkende inhoud per verpakking (alleen i.c.m. een eigen prijs) */
  inhoud?: number | null
  productNaam?: string
  link?: string
  nietLeverbaar?: boolean
  /** ISO-tijdstip van de laatste wijziging */
  bijgewerkt: string
}

export type EigenPrijzen = Partial<Record<ProductId, Partial<Record<WinkelId, EigenPrijs>>>>

const heeftPrijs = (e?: EigenPrijs): e is EigenPrijs & { prijs: number } => e?.prijs != null && Number.isFinite(e.prijs)

const isLeeg = (e: EigenPrijs) =>
  !heeftPrijs(e) && !e.nietLeverbaar && !e.productNaam?.trim() && !e.link?.trim() && (e.inhoud == null || !Number.isFinite(e.inhoud))

/**
 * Combineert een basisbron (voorbeeldprijzen) met eigen prijzen.
 * - eigen prijs → overschrijft de basisprijs (bron 'eigen')
 * - 'niet leverbaar' → winkel valt weg voor dit artikel
 * - geen eigen prijs → basisprijs blijft, eventueel met eigen productnaam/link
 */
export function metEigenPrijzen(basis: PrijsBron, eigen: EigenPrijzen): PrijsBron {
  const aantalEigen = telEigenPrijzen(eigen)
  return {
    id: aantalEigen ? `eigen+${basis.id}` : basis.id,
    naam: aantalEigen ? 'Eigen prijzen' : basis.naam,
    isVoorbeeld: basis.isVoorbeeld && aantalEigen === 0,
    peildatum: laatstBijgewerkt(eigen) ?? basis.peildatum,
    aanbiedingen(product) {
      const basisAanbod = basis.aanbiedingen(product)
      const rij = eigen[product] ?? {}
      const uit: PrijsAanbod[] = []
      for (const w of WINKELS) {
        const e = rij[w.id]
        const b = basisAanbod.find((a) => a.winkel === w.id)
        if (e?.nietLeverbaar) continue
        const extra = {
          ...(e?.productNaam?.trim() ? { productNaam: e.productNaam.trim() } : {}),
          ...(e?.link?.trim() ? { link: e.link.trim() } : {}),
        }
        if (heeftPrijs(e)) {
          uit.push({
            winkel: w.id,
            prijs: e.prijs,
            bron: 'eigen',
            bijgewerkt: e.bijgewerkt,
            ...(e.inhoud != null && e.inhoud > 0 ? { inhoud: e.inhoud } : {}),
            ...extra,
          })
        } else if (b) {
          uit.push({ ...b, bron: b.bron ?? (basis.isVoorbeeld ? 'voorbeeld' : 'eigen'), ...extra })
        }
      }
      return uit
    },
  }
}

export function telEigenPrijzen(eigen: EigenPrijzen): number {
  let n = 0
  for (const rij of Object.values(eigen)) for (const e of Object.values(rij ?? {})) if (heeftPrijs(e)) n++
  return n
}

export function laatstBijgewerkt(eigen: EigenPrijzen): string | undefined {
  let max: string | undefined
  for (const rij of Object.values(eigen))
    for (const e of Object.values(rij ?? {})) if (e && !isLeeg(e) && (!max || e.bijgewerkt > max)) max = e.bijgewerkt
  return max
}

/** Houdt alleen betekenisvolle velden over (compact opslaan, voorspelbaar exporteren). */
function normaliseer(e: EigenPrijs): EigenPrijs {
  const u: EigenPrijs = { bijgewerkt: e.bijgewerkt }
  if (heeftPrijs(e)) u.prijs = e.prijs
  if (e.inhoud != null && Number.isFinite(e.inhoud) && e.inhoud > 0) u.inhoud = e.inhoud
  if (e.productNaam?.trim()) u.productNaam = e.productNaam.trim()
  if (e.link?.trim()) u.link = e.link.trim()
  if (e.nietLeverbaar) u.nietLeverbaar = true
  return u
}

/** Wijzigt één prijs (immutabel). Lege invoer ruimt de regel op, zodat de voorbeeldprijs weer geldt. */
export function zetEigenPrijs(
  eigen: EigenPrijzen,
  product: ProductId,
  winkel: WinkelId,
  wijziging: Partial<Omit<EigenPrijs, 'bijgewerkt'>>,
  nu: Date = new Date(),
): EigenPrijzen {
  const oud = eigen[product]?.[winkel]
  const nieuw = normaliseer({ ...oud, ...wijziging, bijgewerkt: nu.toISOString() })
  const rij = { ...(eigen[product] ?? {}) }
  if (isLeeg(nieuw)) delete rij[winkel]
  else rij[winkel] = nieuw
  const uit = { ...eigen }
  if (Object.keys(rij).length) uit[product] = rij
  else delete uit[product]
  return uit
}

export function verwijderEigenPrijs(eigen: EigenPrijzen, product: ProductId, winkel: WinkelId): EigenPrijzen {
  const rij = { ...(eigen[product] ?? {}) }
  delete rij[winkel]
  const uit = { ...eigen }
  if (Object.keys(rij).length) uit[product] = rij
  else delete uit[product]
  return uit
}

/** Voegt geïmporteerde prijzen samen met bestaande; het bestand wint per artikel/winkel. */
export function voegSamen(eigen: EigenPrijzen, extra: EigenPrijzen): EigenPrijzen {
  const uit: EigenPrijzen = { ...eigen }
  for (const [p, rij] of Object.entries(extra) as [ProductId, Partial<Record<WinkelId, EigenPrijs>>][]) {
    uit[p] = { ...(uit[p] ?? {}), ...rij }
  }
  return uit
}


/** Zet alle voorbeeldprijzen om naar eigen prijzen, zodat je kunt bijstellen i.p.v. vanaf nul typen. */
export function voorbeeldAlsEigen(basis: PrijsBron, nu = new Date()): EigenPrijzen {
  let uit: EigenPrijzen = {}
  for (const item of CATALOGUS) {
    for (const a of basis.aanbiedingen(item.id)) {
      uit = zetEigenPrijs(uit, item.id, a.winkel, { prijs: a.prijs, inhoud: a.inhoud ?? null }, nu)
    }
  }
  return uit
}

/** Vult alleen cellen zonder eigen prijs (of niet-leverbaar) met de voorbeeldprijs. Bestaande eigen prijzen blijven. */
export function vulVoorbeeldenAan(eigen: EigenPrijzen, basis: PrijsBron, nu = new Date()): EigenPrijzen {
  let uit = eigen
  for (const item of CATALOGUS) {
    for (const a of basis.aanbiedingen(item.id)) {
      const e = eigen[item.id]?.[a.winkel]
      if (heeftPrijs(e) || e?.nietLeverbaar) continue
      uit = zetEigenPrijs(uit, item.id, a.winkel, { prijs: a.prijs, inhoud: a.inhoud ?? null }, nu)
    }
  }
  return uit
}

export type KopieerModus = 'alleen-leeg' | 'overschrijven'

/**
 * Kopieert prijzen van de ene winkel naar de andere.
 * - alleen-leeg: vult alleen cellen zonder eigen prijs (of niet-leverbaar) bij de doelwinkel
 * - overschrijven: zet alle bronprijzen over (bestaande doelprijzen gaan verloren)
 * Bron = eigen prijs als die er is, anders de voorbeeldprijs van die winkel.
 */
export function kopieerWinkelPrijzen(
  eigen: EigenPrijzen,
  van: WinkelId,
  naar: WinkelId,
  basis: PrijsBron,
  modus: KopieerModus = 'alleen-leeg',
  nu = new Date(),
): EigenPrijzen {
  if (van === naar) return eigen
  let uit = eigen
  for (const item of CATALOGUS) {
    const bronEigen = eigen[item.id]?.[van]
    const doel = eigen[item.id]?.[naar]
    if (modus === 'alleen-leeg' && (heeftPrijs(doel) || doel?.nietLeverbaar)) continue
    let prijs: number | null = null
    let inhoud: number | null | undefined
    let productNaam: string | undefined
    let link: string | undefined
    let nietLeverbaar = false
    if (bronEigen?.nietLeverbaar) {
      if (modus === 'alleen-leeg') continue
      nietLeverbaar = true
    } else if (heeftPrijs(bronEigen)) {
      prijs = bronEigen.prijs
      inhoud = bronEigen.inhoud
      productNaam = bronEigen.productNaam
      link = bronEigen.link
    } else {
      const b = basis.aanbiedingen(item.id).find((a) => a.winkel === van)
      if (!b) continue
      prijs = b.prijs
      inhoud = b.inhoud
    }
    uit = zetEigenPrijs(
      uit,
      item.id,
      naar,
      { prijs: nietLeverbaar ? null : prijs, inhoud: nietLeverbaar ? null : (inhoud ?? null), productNaam, link, nietLeverbaar },
      nu,
    )
  }
  return uit
}

/** Past een percentage toe op alle eigen prijzen van één winkel (bijv. +5 of −3). */
export function pasPercentageToe(eigen: EigenPrijzen, winkel: WinkelId, procent: number, nu = new Date()): EigenPrijzen {
  if (!Number.isFinite(procent) || procent === 0) return eigen
  let uit = eigen
  const factor = 1 + procent / 100
  for (const [p, rij] of Object.entries(eigen) as [ProductId, Partial<Record<WinkelId, EigenPrijs>>][]) {
    const e = rij?.[winkel]
    if (!heeftPrijs(e)) continue
    const nieuw = Math.round(e.prijs * factor * 100) / 100
    uit = zetEigenPrijs(uit, p, winkel, { prijs: nieuw }, nu)
  }
  return uit
}

// ——— Export / import ————————————————————————————————————————————————

const WINKEL_IDS = WINKELS.map((w) => w.id)
const isProduct = (id: string): id is ProductId => CATALOGUS.some((c) => c.id === id)
const isWinkel = (id: string): id is WinkelId => (WINKEL_IDS as string[]).includes(id)
const winkelVanTekst = (t: string): WinkelId | undefined => {
  const s = t.trim().toLowerCase()
  return WINKELS.find((w) => w.id === s || w.naam.toLowerCase() === s)?.id
}

export interface PrijzenExport {
  app: 'slimmer-wonen'
  type: 'prijzen'
  versie: 1
  geexporteerd: string
  prijzen: EigenPrijzen
}

export function naarJson(eigen: EigenPrijzen, nu = new Date()): string {
  const data: PrijzenExport = { app: 'slimmer-wonen', type: 'prijzen', versie: 1, geexporteerd: nu.toISOString(), prijzen: eigen }
  return JSON.stringify(data, null, 2)
}

const getalOfNull = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null
  if (typeof v !== 'string') return null
  const t = v.replace(/[€\s]/g, '')
  if (!t) return null
  // "1.234,56" → 1234.56 ; "12,49" → 12.49 ; "12.49" → 12.49
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(norm)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const geldigeDatum = (v: unknown, standaard: string) =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : standaard

export function vanJson(tekst: string, nu = new Date()): EigenPrijzen {
  let data: unknown
  try {
    data = JSON.parse(tekst)
  } catch {
    throw new Error('Dit bestand is geen geldig JSON-bestand.')
  }
  const obj = data as Partial<PrijzenExport>
  const bron = (obj && typeof obj === 'object' && 'prijzen' in obj ? obj.prijzen : data) as Record<string, unknown>
  if (!bron || typeof bron !== 'object' || Array.isArray(bron)) throw new Error('Geen prijzen gevonden in dit bestand.')
  let uit: EigenPrijzen = {}
  for (const [p, rij] of Object.entries(bron)) {
    if (!isProduct(p) || !rij || typeof rij !== 'object') continue
    for (const [w, e] of Object.entries(rij as Record<string, Record<string, unknown>>)) {
      if (!isWinkel(w) || !e || typeof e !== 'object') continue
      uit = zetEigenPrijs(
        uit,
        p,
        w,
        {
          prijs: getalOfNull(e.prijs),
          inhoud: getalOfNull(e.inhoud),
          productNaam: typeof e.productNaam === 'string' ? e.productNaam : undefined,
          link: typeof e.link === 'string' ? e.link : undefined,
          nietLeverbaar: e.nietLeverbaar === true,
        },
        new Date(geldigeDatum(e.bijgewerkt, nu.toISOString())),
      )
    }
  }
  if (!Object.keys(uit).length) throw new Error('Geen geldige prijzen gevonden in dit bestand.')
  return uit
}

const CSV_KOPPEN = ['product_id', 'artikel', 'winkel', 'prijs_incl_btw', 'eenheid', 'inhoud', 'niet_leverbaar', 'productnaam', 'link', 'bron', 'bijgewerkt']

const csvVeld = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csvGetal = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))

/** CSV (puntkomma, decimale komma — opent direct goed in Nederlandse Excel) met álle artikelen × winkels. */
export function naarCsv(eigen: EigenPrijzen, basis: PrijsBron): string {
  const regels = [CSV_KOPPEN.join(';')]
  for (const item of CATALOGUS) {
    const basisAanbod = basis.aanbiedingen(item.id)
    for (const w of WINKELS) {
      const e = eigen[item.id]?.[w.id]
      const b = basisAanbod.find((a) => a.winkel === w.id)
      const eigenPrijs = e?.prijs != null
      const prijs = eigenPrijs ? e!.prijs! : (b?.prijs ?? null)
      regels.push(
        [
          item.id,
          item.naam,
          w.naam,
          csvGetal(prijs),
          eenheidLabel(item),
          csvGetal(e?.inhoud ?? null),
          e?.nietLeverbaar ? 'ja' : '',
          e?.productNaam ?? '',
          e?.link ?? '',
          eigenPrijs ? 'eigen' : 'voorbeeld',
          eigenPrijs || e ? (e?.bijgewerkt ?? '') : basis.peildatum,
        ]
          .map((v) => csvVeld(String(v)))
          .join(';'),
      )
    }
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
 * Leest een CSV in. Een regel wordt een eigen prijs als de bron niet 'voorbeeld' is, óf als
 * prijs/inhoud/niet-leverbaar/productnaam/link afwijkt van het voorbeeld (bijv. aangepast in Excel).
 */
export function vanCsv(tekst: string, basis: PrijsBron, nu = new Date()): EigenPrijzen {
  const rijen = parseCsv(tekst)
  if (rijen.length < 2) throw new Error('Het CSV-bestand bevat geen regels.')
  const kop = rijen[0].map((k) => k.trim().toLowerCase())
  const kol = (naam: string) => kop.indexOf(naam)
  const [iP, iW, iPrijs] = [kol('product_id'), kol('winkel'), kol('prijs_incl_btw') >= 0 ? kol('prijs_incl_btw') : kol('prijs')]
  if (iP < 0 || iW < 0 || iPrijs < 0) throw new Error('Onbekend CSV-formaat: kolommen product_id, winkel en prijs_incl_btw zijn nodig.')
  const waarde = (r: string[], naam: string) => {
    const i = kol(naam)
    return i >= 0 ? (r[i] ?? '').trim() : ''
  }
  let uit: EigenPrijzen = {}
  for (const r of rijen.slice(1)) {
    const p = (r[iP] ?? '').trim()
    const w = winkelVanTekst(r[iW] ?? '')
    if (!isProduct(p) || !w) continue
    const prijs = getalOfNull(r[iPrijs] ?? '')
    const inhoud = getalOfNull(waarde(r, 'inhoud'))
    const nietLeverbaar = /^(ja|yes|true|1|x)$/i.test(waarde(r, 'niet_leverbaar'))
    const productNaam = waarde(r, 'productnaam')
    const link = waarde(r, 'link')
    const bron = waarde(r, 'bron').toLowerCase()
    const b = basis.aanbiedingen(p).find((a) => a.winkel === w)
    const standaardInhoud = catalogusItem(p)?.inhoud?.standaard
    const afwijkend =
      (prijs != null && (b == null || Math.abs(prijs - b.prijs) > 0.004)) ||
      (inhoud != null && inhoud !== standaardInhoud) ||
      nietLeverbaar ||
      !!productNaam ||
      !!link
    if (bron === 'voorbeeld' && !afwijkend) continue
    const eigenPrijs = bron === 'voorbeeld' && prijs != null && b != null && Math.abs(prijs - b.prijs) <= 0.004 ? null : prijs
    uit = zetEigenPrijs(
      uit,
      p,
      w,
      { prijs: eigenPrijs, inhoud: eigenPrijs != null ? inhoud : null, productNaam, link, nietLeverbaar },
      new Date(geldigeDatum(waarde(r, 'bijgewerkt') || undefined, nu.toISOString())),
    )
  }
  return uit
}

/** Herkent het bestandstype op inhoud (JSON begint met { ). */
export function importeerPrijzen(tekst: string, basis: PrijsBron, nu = new Date()): EigenPrijzen {
  return tekst.trim().startsWith('{') ? vanJson(tekst, nu) : vanCsv(tekst, basis, nu)
}
