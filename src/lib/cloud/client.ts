/** Lazy Supabase-client: de bibliotheek wordt pas geladen als iemand inlogt of al ingelogd is. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { AUTH_SLEUTEL, SUPABASE_KEY, SUPABASE_URL } from './config'

let belofte: Promise<SupabaseClient> | null = null

export function haalClient(): Promise<SupabaseClient> {
  belofte ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storageKey: AUTH_SLEUTEL, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
    }),
  )
  return belofte
}
