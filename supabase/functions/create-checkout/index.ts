// POST { plan: 'maand' | 'jaar', redirectUrl } → { checkoutUrl }
// Maakt (zo nodig) een Mollie-klant en een eerste betaling (sequenceType 'first') voor een incassomandaat.
// Na betaling maakt mollie-webhook het abonnement aan.
import { admin, bedrag, billingAan, cors, gebruiker, json, mollie, webhookUrl } from '../_shared/mollie.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (!billingAan()) return json({ error: 'Betalen staat uit.' }, 403)
    const user = await gebruiker(req)
    if (!user) return json({ error: 'Niet ingelogd.' }, 401)
    const { plan, redirectUrl } = await req.json()
    if (plan !== 'maand' && plan !== 'jaar') return json({ error: 'Onbekend plan.' }, 400)
    const toegestaan = (Deno.env.get('APP_ORIGIN') ?? '').split(',').filter(Boolean)
    const terug = typeof redirectUrl === 'string' && (toegestaan.length === 0 || toegestaan.some((o) => redirectUrl.startsWith(o))) ? redirectUrl : toegestaan[0]
    if (!terug) return json({ error: 'Ongeldige redirectUrl.' }, 400)

    const db = admin()
    const { data: abo } = await db.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
    if (abo?.status === 'active' && abo.mollie_subscription_id) return json({ error: 'Je hebt al een actief abonnement.' }, 409)

    let klant = abo?.mollie_customer_id as string | undefined
    if (!klant) {
      const k = await mollie<{ id: string }>('/customers', { method: 'POST', body: JSON.stringify({ email: user.email, metadata: { user_id: user.id } }) })
      klant = k.id
      if (abo) await db.from('subscriptions').update({ mollie_customer_id: klant, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    }

    const betaling = await mollie<{ id: string; _links: { checkout?: { href: string } } }>(`/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount: { currency: 'EUR', value: bedrag(plan) },
        description: `Maatklaar Pro (${plan === 'jaar' ? 'jaar' : 'maand'})`,
        customerId: klant,
        sequenceType: 'first',
        redirectUrl: terug,
        webhookUrl: webhookUrl(),
        locale: 'nl_NL',
        metadata: { user_id: user.id, plan, customer_id: klant },
      }),
    })
    await db.from('payments').upsert({ mollie_payment_id: betaling.id, user_id: user.id, status: 'open', amount: Number(bedrag(plan)), plan, sequence_type: 'first' })
    const url = betaling._links.checkout?.href
    if (!url) return json({ error: 'Mollie gaf geen betaallink.' }, 502)
    return json({ checkoutUrl: url })
  } catch (e) {
    console.error(e)
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
