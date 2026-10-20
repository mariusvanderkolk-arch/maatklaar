// Gedeelde helpers voor de Maatklaar Edge Functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const MOLLIE = 'https://api.mollie.com/v2'

/** Prijzen exclusief btw; INCL_BTW=true als de bedragen al incl. btw zijn. Zelfde als src/lib/billing/config.ts. */
/** Geen prijs in de code: zet PRIJS_MAAND / PRIJS_JAAR als secret. Zonder secret weigert betalen. */
export const PRIJZEN: Record<string, number> = { maand: Number(Deno.env.get('PRIJS_MAAND') ?? 0), jaar: Number(Deno.env.get('PRIJS_JAAR') ?? 0) }
export const BTW = 0.21
export const INTERVAL: Record<string, string> = { maand: '1 month', jaar: '12 months' }

export function bedrag(plan: string): string {
  const p = PRIJZEN[plan]
  if (p == null) throw new Error('Onbekend plan')
  if (!Number.isFinite(p) || p <= 0) throw new Error('Geen prijs ingesteld')
  const incl = Deno.env.get('PRICES_INCL_VAT') === 'true' ? p : Math.round(p * (1 + BTW) * 100) / 100
  return incl.toFixed(2)
}

export const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'https://maatklaar.nl',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

export function billingAan() {
  return Deno.env.get('BILLING_ENABLED') === 'true'
}

export async function mollie<T = Record<string, unknown>>(pad: string, init: RequestInit = {}): Promise<T> {
  const key = Deno.env.get('MOLLIE_API_KEY')
  if (!key) throw new Error('MOLLIE_API_KEY ontbreekt')
  const res = await fetch(`${MOLLIE}${pad}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const body = res.status === 204 ? {} : await res.json()
  if (!res.ok) throw new Error(`Mollie ${res.status}: ${(body as { detail?: string }).detail ?? res.statusText}`)
  return body as T
}

/** Service-role client (omzeilt RLS) — alleen hier op de server. */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
}

/** Ingelogde gebruiker uit de Authorization-header. */
export async function gebruiker(req: Request) {
  const auth = req.headers.get('Authorization') ?? ''
  const c = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data, error } = await c.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export const webhookUrl = () => `${Deno.env.get('SUPABASE_URL')}/functions/v1/mollie-webhook`
