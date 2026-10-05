/**
 * Supabase-configuratie. De publishable key is bedoeld voor de browser (veilig om te publiceren);
 * de beveiliging zit in Row Level Security (zie supabase/schema.sql).
 */
import { sleutel, TEST_MODUS } from '../modus'

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || 'https://cdhrbfawrhburztuzdha.supabase.co'
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_GxcILb6LAbuiuF7L7Tktew_7pPbHwvD'
export const CLOUD_AAN = Boolean(SUPABASE_URL && SUPABASE_KEY)

/** Eigen sessiesleutel per app (gewoon/test draaien op hetzelfde domein). */
export const AUTH_SLEUTEL = sleutel('auth')
/** De testversie bewaart haar documenten apart (kind 'test-project' enz.). */
export const KIND_PREFIX = TEST_MODUS ? 'test-' : ''
export const TABEL = 'user_data'

/** Redirect na de inloglink: dezelfde pagina (werkt voor /slimmer-wonen/ én /slimmer-wonen-test/). */
export const redirectUrl = () => `${location.origin}${location.pathname}`

/** Is er (mogelijk) een sessie? Dan pas de Supabase-bibliotheek laden (houdt de app licht). */
export function sessieHint(): boolean {
  try {
    if (/access_token=|error_description=|[?&]code=/.test(location.hash + location.search)) return true
    return localStorage.getItem(AUTH_SLEUTEL) != null
  } catch {
    return false
  }
}
