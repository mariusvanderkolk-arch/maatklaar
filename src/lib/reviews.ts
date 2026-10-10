/**
 * Beoordelingen van Maatklaar zelf (Supabase-tabel `reviews`, zie supabase/reviews.sql).
 * Faalt altijd stil: ontbreekt de tabel of is er geen netwerk, dan toont de app gewoon niets.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './cloud/config'
import { sleutel, TEST_MODUS } from './modus'
import { opslag } from './veiligeOpslag'

export const MAX_TEKST = 300
export interface ReviewInvoer {
  stars: number
  text: string
  name?: string
  company?: string
  consent: boolean
}
export interface Review {
  id: number
  created_at: string
  stars: number
  text: string
  name: string | null
  company: string | null
}

const kop = { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json' }
const leeg = (s?: string, n = 80) => (s?.trim() ? s.trim().replace(/\s+/g, ' ').slice(0, n) : null)

/** Valideert en maakt de rij voor de database. Geeft een foutmelding (string) of de rij. */
export function maakRij(r: ReviewInvoer): string | Record<string, unknown> {
  const stars = Math.round(r.stars)
  if (!(stars >= 1 && stars <= 5)) return 'Kies 1 tot 5 sterren.'
  const text = r.text.trim().replace(/\s+\n/g, '\n')
  if (text.length > MAX_TEKST) return `Maximaal ${MAX_TEKST} tekens.`
  return { site: TEST_MODUS ? 'test' : 'main', stars, text, name: leeg(r.name, 60), company: leeg(r.company, 80), consent: !!r.consent }
}

export async function verstuurReview(r: ReviewInvoer, f: typeof fetch = fetch): Promise<'ok' | 'geen-tabel' | 'fout'> {
  const rij = maakRij(r)
  if (typeof rij === 'string') return 'fout'
  try {
    const res = await f(`${SUPABASE_URL}/rest/v1/reviews`, { method: 'POST', headers: { ...kop, prefer: 'return=minimal' }, body: JSON.stringify(rij) })
    if (res.ok) {
      reviewStatus.zetVerstuurd()
      return 'ok'
    }
    return res.status === 404 ? 'geen-tabel' : 'fout'
  } catch {
    return 'fout'
  }
}

let cache: Promise<Review[]> | null = null
/** Goedgekeurde beoordelingen (met toestemming). Lege lijst bij elke fout. */
export function haalReviews(f: typeof fetch = fetch): Promise<Review[]> {
  return (cache ??= (async () => {
    try {
      const site = TEST_MODUS ? 'test' : 'main'
      const res = await f(`${SUPABASE_URL}/rest/v1/reviews?select=id,created_at,stars,text,name,company&site=eq.${site}&order=created_at.desc&limit=50`, { headers: kop })
      if (!res.ok) return []
      const d = (await res.json()) as Review[]
      return Array.isArray(d) ? d.filter((r) => r && r.stars >= 1 && r.stars <= 5) : []
    } catch {
      return []
    }
  })())
}
export const _resetCache = () => (cache = null)

export function samenvatting(rs: Review[]) {
  if (!rs.length) return null
  const gem = rs.reduce((s, r) => s + r.stars, 0) / rs.length
  const quotes = rs.filter((r) => r.text.trim().length >= 10).sort((a, b) => b.stars - a.stars || b.created_at.localeCompare(a.created_at)).slice(0, 3)
  return { gemiddelde: Math.round(gem * 10) / 10, aantal: rs.length, quotes }
}

// ——— Wanneer vragen we om een beoordeling? ———
const K = sleutel('review')
type Status = { offertes: number; verstuurd?: boolean; later?: number }
const lees = (): Status => {
  try {
    return { offertes: 0, ...JSON.parse(opslag.getItem(K) || '{}') }
  } catch {
    return { offertes: 0 }
  }
}
const schrijf = (s: Status) => {
  try {
    opslag.setItem(K, JSON.stringify(s))
  } catch {
    /* */
  }
}
export const OFFERTES_VOOR_VRAAG = 3
export const reviewStatus = {
  lees,
  telOfferte: () => schrijf({ ...lees(), offertes: lees().offertes + 1 }),
  zetVerstuurd: () => schrijf({ ...lees(), verstuurd: true }),
  later: (nu = Date.now()) => schrijf({ ...lees(), later: nu + 30 * 864e5 }),
  /** Vraag tonen na een paar offertes, niet als al verstuurd of 'later' nog loopt. */
  moetVragen: (nu = Date.now()) => {
    const s = lees()
    return !s.verstuurd && s.offertes >= OFFERTES_VOOR_VRAAG && (!s.later || nu > s.later)
  },
}

// ——— Dialoog openen vanaf elke plek ———
const luisteraars = new Set<(open: boolean) => void>()
export const reviewDialoog = {
  open: () => luisteraars.forEach((f) => f(true)),
  abonneer: (f: (open: boolean) => void) => {
    luisteraars.add(f)
    return () => void luisteraars.delete(f)
  },
}
