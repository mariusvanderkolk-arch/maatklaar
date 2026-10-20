/**
 * Digitaal ondertekenen van een offerte (Supabase, zie supabase/ondertekenen.sql).
 * De offerte wordt als momentopname onder een onraadbaar token bewaard; lezen en tekenen gaat alleen via RPC's met dat token.
 * Werkt de server niet (SQL nog niet gedraaid, offline), dan valt de app terug op de gewone offerte-link.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './cloud/config'
import { TEST_MODUS } from './modus'
import { leesOfferte, type OfferteData } from './offerte'

export interface TekenStatus {
  snapshot: OfferteData
  hash: string
  created_at: string
  signed_at: string | null
  signer_name: string | null
  signature: string | null
  /** eerste keer geopend door de klant (na supabase/opvolging.sql) */
  viewed_at?: string | null
}
export type Fout = 'niet-beschikbaar' | 'niet-gevonden' | 'al-getekend' | 'gewijzigd' | 'ongeldig' | 'netwerk' | 'ingetrokken' | 'geen-eigenaar'

const kop = { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json' }
export const TOKEN_RE = /^[a-f0-9]{40,80}$/

async function rpc<T>(fn: string, body: unknown, f: typeof fetch, jwt?: string | null): Promise<{ ok: true; data: T } | { ok: false; fout: Fout }> {
  try {
    const headers = jwt ? { ...kop, authorization: `Bearer ${jwt}` } : kop
    const r = await f(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(body) })
    if (r.ok) return { ok: true, data: (await r.json()) as T }
    const t = await r.text().catch(() => '')
    if (r.status === 404 && /function|PGRST202/i.test(t)) return { ok: false, fout: 'niet-beschikbaar' }
    if (/al getekend/.test(t)) return { ok: false, fout: 'al-getekend' }
    if (/ingetrokken/.test(t)) return { ok: false, fout: 'ingetrokken' }
    if (/geen eigenaar/.test(t)) return { ok: false, fout: 'geen-eigenaar' }
    if (/gewijzigd|niet gevonden/.test(t)) return { ok: false, fout: 'gewijzigd' }
    if (/ongeldig/.test(t)) return { ok: false, fout: 'ongeldig' }
    return { ok: false, fout: r.status === 404 ? 'niet-beschikbaar' : 'netwerk' }
  } catch {
    return { ok: false, fout: 'netwerk' }
  }
}

/** Maakt een deellink-token voor deze offerte. */
export async function deelVoorOndertekening(d: OfferteData, f: typeof fetch = fetch, jwt: string | null = null) {
  // ingelogd: met de eigen JWT, zodat de server de eigenaar vastlegt (en per gebruiker telt)
  const r = await rpc<{ token: string; hash: string; owner_secret?: string }>('offerte_delen', { p_snapshot: d, p_site: TEST_MODUS ? 'test' : 'main' }, f, jwt)
  if (r.ok && !TOKEN_RE.test(r.data?.token ?? '')) return { ok: false as const, fout: 'netwerk' as Fout }
  return r
}

export async function haalTekenStatus(token: string, f: typeof fetch = fetch): Promise<{ ok: true; data: TekenStatus } | { ok: false; fout: Fout }> {
  if (!TOKEN_RE.test(token)) return { ok: false, fout: 'niet-gevonden' }
  const r = await rpc<(Omit<TekenStatus, 'snapshot'> & { snapshot: unknown }) | null>('offerte_ophalen', { p_token: token }, f)
  if (!r.ok) return r
  if (!r.data) return { ok: false, fout: 'niet-gevonden' }
  if ((r.data as { revoked?: boolean }).revoked) return { ok: false, fout: 'ingetrokken' }
  try {
    return { ok: true, data: { ...r.data, snapshot: leesOfferte(r.data.snapshot) } }
  } catch {
    return { ok: false, fout: 'niet-gevonden' }
  }
}

export async function teken(token: string, naam: string, handtekening: string, hash: string, f: typeof fetch = fetch) {
  if (naam.trim().length < 2) return { ok: false as const, fout: 'ongeldig' as Fout }
  if (!handtekening.startsWith('data:image/png;base64,') || handtekening.length > 150000) return { ok: false as const, fout: 'ongeldig' as Fout }
  return rpc<{ signed_at: string; signer_name: string }>('offerte_tekenen', { p_token: token, p_naam: naam.trim().slice(0, 100), p_handtekening: handtekening, p_hash: hash }, f)
}

/**
 * Klant opent de tekenlink: "bekeken" vastleggen. Stil bij fouten (bijv. SQL nog niet gedraaid of offline);
 * het tekenen zelf hangt hier nooit van af.
 */
export async function meldBekeken(token: string, f: typeof fetch = fetch): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false
  const r = await rpc<{ viewed_at: string | null }>('offerte_bekeken', { p_token: token }, f)
  return r.ok
}

/**
 * Trekt een tekenlink in (alleen de eigenaar: ingelogd als dezelfde gebruiker of met het eigenaarsgeheim).
 * 'niet-beschikbaar' = server-SQL (fotos-en-links.sql) nog niet gedraaid.
 */
export async function trekLinkIn(token: string, geheim: string | undefined, f: typeof fetch = fetch, jwt: string | null = null) {
  if (!TOKEN_RE.test(token)) return { ok: false as const, fout: 'niet-gevonden' as Fout }
  return rpc<{ revoked_at: string }>('offerte_intrekken', { p_token: token, p_geheim: geheim ?? null }, f, jwt)
}

export const tekenLink = (token: string, basis = `${location.origin}${location.pathname}`) => `${basis}#/offerte-tekenen/${token}`

export const FOUT_TEKST: Record<Fout, string> = {
  'niet-beschikbaar': 'Digitaal tekenen is nog niet beschikbaar.',
  'niet-gevonden': 'Deze offerte is niet gevonden of de link is verlopen (na 90 dagen, of 1 jaar na ondertekening). Vraag de aannemer om een nieuwe link.',
  'al-getekend': 'Deze offerte is al getekend.',
  gewijzigd: 'De offerte is intussen gewijzigd. Vraag de aannemer om een nieuwe link.',
  ongeldig: 'Vul je naam in en zet je handtekening.',
  netwerk: 'Geen verbinding met de server. Probeer het opnieuw.',
  ingetrokken: 'De aannemer heeft deze link ingetrokken, bijvoorbeeld omdat er een nieuwe versie van de offerte is. Vraag de aannemer om de nieuwste link.',
  'geen-eigenaar': 'Deze link kan alleen worden ingetrokken op het apparaat of account waarmee hij is gedeeld.',
}
