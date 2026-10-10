// Mollie roept dit aan met id=tr_xxx (form-encoded). We vertrouwen de body NIET:
// de betaling wordt altijd opnieuw bij Mollie opgehaald. Deploy met --no-verify-jwt.
import { admin, bedrag, billingAan, INTERVAL, mollie, webhookUrl } from '../_shared/mollie.ts'

type Betaling = {
  id: string
  status: string
  sequenceType: string
  customerId?: string
  subscriptionId?: string
  mandateId?: string
  paidAt?: string
  amount: { value: string }
  metadata?: { user_id?: string; plan?: string }
}

const plus = (d: Date, plan: string) => {
  const n = new Date(d)
  if (plan === 'jaar') n.setUTCFullYear(n.getUTCFullYear() + 1)
  else n.setUTCMonth(n.getUTCMonth() + 1)
  return n
}
const dag = (d: Date) => d.toISOString().slice(0, 10)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  if (!billingAan()) return new Response('uit', { status: 200 })
  try {
    const form = await req.formData()
    const id = String(form.get('id') ?? '')
    if (!/^tr_[A-Za-z0-9]+$/.test(id)) return new Response('ongeldig', { status: 400 })
    const b = await mollie<Betaling>(`/payments/${id}`)
    const db = admin()

    // gebruiker bepalen: via metadata (eerste betaling) of via het abonnement (vervolgbetalingen)
    let userId = b.metadata?.user_id
    let plan = b.metadata?.plan
    if (!userId && b.subscriptionId) {
      const { data } = await db.from('subscriptions').select('user_id, plan').eq('mollie_subscription_id', b.subscriptionId).maybeSingle()
      userId = data?.user_id
      plan = plan ?? data?.plan
    }
    if (!userId) return new Response('onbekend', { status: 200 })
    plan = plan === 'jaar' ? 'jaar' : 'maand'

    await db.from('payments').upsert({
      mollie_payment_id: b.id,
      user_id: userId,
      status: b.status,
      amount: Number(b.amount.value),
      plan,
      sequence_type: b.sequenceType,
      paid_at: b.paidAt ?? null,
    })

    const nu = new Date()
    const { data: abo } = await db.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()

    if (b.status === 'paid') {
      const periodeEind = plus(b.paidAt ? new Date(b.paidAt) : nu, plan)
      let subId = abo?.mollie_subscription_id as string | null
      if (b.sequenceType === 'first' && !subId && b.customerId) {
        // vervolgincasso's: start na de betaalde periode
        const sub = await mollie<{ id: string }>(`/customers/${b.customerId}/subscriptions`, {
          method: 'POST',
          body: JSON.stringify({
            amount: { currency: 'EUR', value: bedrag(plan) },
            interval: INTERVAL[plan],
            startDate: dag(periodeEind),
            description: `Maatklaar Pro (${plan})`,
            webhookUrl: webhookUrl(),
            metadata: { user_id: userId, plan },
          }),
        })
        subId = sub.id
      }
      await db.from('subscriptions').upsert({
        user_id: userId,
        status: 'active',
        plan,
        trial_ends_at: abo?.trial_ends_at ?? null,
        current_period_end: periodeEind.toISOString(),
        mollie_customer_id: b.customerId ?? abo?.mollie_customer_id ?? null,
        mollie_subscription_id: subId,
        updated_at: nu.toISOString(),
      })
    } else if (['failed', 'expired', 'canceled'].includes(b.status) && b.sequenceType === 'recurring' && abo) {
      await db.from('subscriptions').update({ status: 'past_due', updated_at: nu.toISOString() }).eq('user_id', userId)
    }
    // eerste betaling mislukt/afgebroken: niets aanpassen (proef of gratis blijft gewoon staan)
    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    // 500 → Mollie probeert het later opnieuw
    return new Response('fout', { status: 500 })
  }
})
