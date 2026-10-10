// POST → zegt het Mollie-abonnement op. Pro blijft tot current_period_end.
import { admin, billingAan, cors, gebruiker, json, mollie } from '../_shared/mollie.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (!billingAan()) return json({ error: 'Betalen staat uit.' }, 403)
    const user = await gebruiker(req)
    if (!user) return json({ error: 'Niet ingelogd.' }, 401)
    const db = admin()
    const { data: abo } = await db.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
    if (!abo) return json({ error: 'Geen abonnement gevonden.' }, 404)
    if (abo.mollie_customer_id && abo.mollie_subscription_id) {
      try {
        await mollie(`/customers/${abo.mollie_customer_id}/subscriptions/${abo.mollie_subscription_id}`, { method: 'DELETE' })
      } catch (e) {
        // al opgezegd bij Mollie is prima
        if (!/Mollie 4(04|22)/.test(String((e as Error).message))) throw e
      }
    }
    await db.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('user_id', user.id)
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
