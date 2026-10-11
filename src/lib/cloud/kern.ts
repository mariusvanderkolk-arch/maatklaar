/**
 * Pure kern van de cloud-sync (geen netwerk, geen localStorage), zodat hij goed te testen is.
 *
 * Model: elk "document" (project, factuur, prijzenlijst, bedrijfsprofiel) is één rij
 * (user_id, kind, id) met jsonb-data en updated_at. Conflicten: laatste wijziging wint.
 * Verwijderen = rij met deleted=true (tombstone), zodat andere apparaten het ook weghalen.
 */
import { normaliseerPrijzen, type EigenPrijs, type EigenPrijzen } from '../eigenPrijzen'

export type Soort = 'project' | 'factuur' | 'prijzen' | 'bedrijf' | 'design' | 'artikel'

export interface Doc {
  soort: Soort
  id: string
  data: unknown
  /** tijdstip van de laatste lokale wijziging, als het document dat zelf bijhoudt (ms) */
  tijd?: number
}

export interface MetaItem {
  /** hash van de laatst bekende inhoud */
  hash: string
  /** tijdstip van de laatste (lokale of overgenomen) wijziging, ms */
  tijd: number
  /** nog naar de cloud sturen */
  vuil: boolean
  /** lokaal verwijderd */
  weg?: boolean
  /** updated_at van de server zoals laatst gezien */
  server?: string
}

export type Meta = Record<string, MetaItem>

export interface RemoteRij {
  kind: string
  id: string
  data: unknown
  updated_at: string
  deleted: boolean
}

export const sleutelVan = (soort: Soort, id: string) => `${soort}/${id}`

/** Kleine, stabiele string-hash (djb2) van de JSON-inhoud. */
export function hashVan(data: unknown): string {
  const t = JSON.stringify(data) ?? ''
  let h = 5381
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0
  return `${t.length}:${(h >>> 0).toString(36)}`
}

/** Vergelijkt de lokale documenten met de meta en markeert nieuwe, gewijzigde en verwijderde documenten. */
export function markeerWijzigingen(meta: Meta, docs: Doc[], nu: number): { meta: Meta; gewijzigd: number } {
  const uit: Meta = { ...meta }
  const gezien = new Set<string>()
  let gewijzigd = 0
  for (const d of docs) {
    const k = sleutelVan(d.soort, d.id)
    gezien.add(k)
    const h = hashVan(d.data)
    const m = uit[k]
    if (!m || m.weg || m.hash !== h) {
      uit[k] = { hash: h, tijd: Math.max(d.tijd ?? nu, (m?.tijd ?? 0) + 1), vuil: true, server: m?.server }
      gewijzigd++
    }
  }
  for (const [k, m] of Object.entries(uit)) {
    if (!gezien.has(k) && !m.weg) {
      uit[k] = { ...m, weg: true, vuil: true, tijd: Math.max(nu, m.tijd + 1) }
      gewijzigd++
    }
  }
  return { meta: uit, gewijzigd }
}

export type Actie =
  | { soort: Soort; id: string; type: 'zet'; data: unknown }
  | { soort: Soort; id: string; type: 'verwijder' }
  | { soort: Soort; id: string; type: 'samenvoegen'; data: unknown }

const SOORTEN: Soort[] = ['project', 'factuur', 'prijzen', 'bedrijf', 'design', 'artikel']

/**
 * Verwerkt de rijen uit de cloud.
 * - eersteKeer: lokale gegevens worden nooit verwijderd; staat iets aan beide kanten, dan 'samenvoegen'.
 * - anders: laatste wijziging wint (lokaal vuil + nieuwer → lokaal blijft en wordt verstuurd).
 */
export function verwerkRemote(
  meta: Meta,
  rijen: RemoteRij[],
  opties: { eersteKeer: boolean; prefix?: string; lokaalAanwezig: (k: string) => boolean },
): { meta: Meta; acties: Actie[] } {
  const uit: Meta = { ...meta }
  const acties: Actie[] = []
  const prefix = opties.prefix ?? ''
  for (const r of rijen) {
    if (!r.kind.startsWith(prefix)) continue
    const soort = r.kind.slice(prefix.length) as Soort
    if (!SOORTEN.includes(soort)) continue
    const k = sleutelVan(soort, r.id)
    const m = uit[k]
    if (m?.server === r.updated_at && !m.vuil) continue // al verwerkt
    const remoteTijd = Date.parse(r.updated_at) || 0
    const lokaal = opties.lokaalAanwezig(k)
    if (opties.eersteKeer) {
      if (r.deleted) continue
      if (lokaal && m?.vuil) {
        acties.push({ soort, id: r.id, type: 'samenvoegen', data: r.data })
        uit[k] = { ...m, server: r.updated_at }
        continue
      }
    } else if (m?.vuil && m.tijd > remoteTijd) {
      uit[k] = { ...m, server: r.updated_at }
      continue // lokaal is nieuwer en gaat zo naar de cloud
    }
    if (r.deleted) {
      if (lokaal) acties.push({ soort, id: r.id, type: 'verwijder' })
      uit[k] = { hash: '', tijd: remoteTijd, vuil: false, weg: true, server: r.updated_at }
    } else {
      acties.push({ soort, id: r.id, type: 'zet', data: r.data })
      uit[k] = { hash: hashVan(r.data), tijd: remoteTijd, vuil: false, server: r.updated_at }
    }
  }
  return { meta: uit, acties }
}

/** Eigen prijzen per artikel samenvoegen: het meest recent bijgewerkte artikel wint (oud formaat wordt eerst omgezet). */
export function combineerPrijzenNieuwste(a: unknown, b: unknown): EigenPrijzen {
  const uit: EigenPrijzen = {}
  for (const bron of [normaliseerPrijzen(a), normaliseerPrijzen(b)]) {
    for (const [p, e] of Object.entries(bron) as [keyof EigenPrijzen, EigenPrijs][]) {
      const oud = uit[p]
      if (!oud || (e?.bijgewerkt ?? '') > (oud.bijgewerkt ?? '')) uit[p] = e
    }
  }
  return uit
}

export type FoutSoort = 'geen-tabel' | 'offline' | 'niet-ingelogd' | 'fout'

/** Zet een fout van Supabase/het netwerk om naar een soort die de UI begrijpt. */
export function soortFout(e: unknown): FoutSoort {
  const f = (e ?? {}) as { code?: string; message?: string; status?: number; name?: string }
  const msg = String(f.message ?? e ?? '')
  if (f.code === 'PGRST205' || f.code === '42P01' || /could not find the table|relation .* does not exist/i.test(msg)) return 'geen-tabel'
  if (f.code === 'PGRST202' && /delete_my_account/.test(msg)) return 'geen-tabel'
  if (f.status === 401 || f.code === 'PGRST301' || /jwt|not authenticated/i.test(msg)) return 'niet-ingelogd'
  if (f.name === 'TypeError' || /failed to fetch|networkerror|load failed|network request failed/i.test(msg)) return 'offline'
  return 'fout'
}
