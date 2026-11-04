/**
 * Mail Marius bij een hulpchat-vraag (via Edge Function `hulp-melding`, zie docs/hulpchat-melding.md).
 * Fire-and-forget, geanonimiseerd, max 5 per sessie. Zonder Supabase-config of in dev: doet niets.
 */
import { SUPABASE_KEY, SUPABASE_URL } from '../cloud/config'
import { TEST_MODUS } from '../modus'
import { anonimiseer } from '../analytics'

let verstuurd = 0
export const MAX_PER_SESSIE = 5
export function _reset() { verstuurd = 0 }

export function meldingBody(vraag: string, beantwoord: boolean, scherm: string) {
  return { vraag: anonimiseer(vraag), beantwoord, scherm: scherm.slice(0, 60), site: TEST_MODUS ? 'test' : 'main' }
}

export function meldHulpvraag(vraag: string, beantwoord: boolean, scherm: string, f: typeof fetch = (...a) => fetch(...a), actief = import.meta.env.PROD) {
  if (!actief || !SUPABASE_URL || !SUPABASE_KEY || !vraag.trim() || verstuurd >= MAX_PER_SESSIE) return false
  verstuurd++
  try {
    f(`${SUPABASE_URL}/functions/v1/hulp-melding`, {
      method: 'POST', keepalive: true,
      headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(meldingBody(vraag, beantwoord, scherm)),
    }).catch(() => {})
  } catch { /* nooit de chat hinderen */ }
  return true
}
