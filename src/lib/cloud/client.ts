/** Lazy Supabase-client: de bibliotheek wordt pas geladen als iemand inlogt of al ingelogd is. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { AUTH_SLEUTEL, SUPABASE_KEY, SUPABASE_URL } from './config'
import { opslag } from '../veiligeOpslag'

/** Opslag voor de inlogsessie die nooit gooit (in-app browsers kunnen localStorage blokkeren). */
const authOpslag = {
  getItem: (k: string) => {
    try {
      return opslag.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k: string, v: string) => {
    try {
      opslag.setItem(k, v)
    } catch {
      /* alleen deze sessie */
    }
  },
  removeItem: (k: string) => {
    try {
      opslag.removeItem(k)
    } catch {
      /* negeren */
    }
  },
}

let belofte: Promise<SupabaseClient> | null = null

export function haalClient(): Promise<SupabaseClient> {
  belofte ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storage: authOpslag, storageKey: AUTH_SLEUTEL, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
    }),
  )
  return belofte
}
