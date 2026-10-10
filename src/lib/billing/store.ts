/**
 * Abonnementsstatus uit Supabase (tabel subscriptions, alleen eigen rij leesbaar).
 * Doet NIETS zolang BILLING_AAN uit staat: geen netwerk, geen Supabase-bibliotheek.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { BILLING_AAN, type Plan } from './config'
import { heeftPro, magNieuwProject, telActieveProjecten, type Abonnement } from './logica'
import { useCloud } from '../cloud/sync'
import { haalClient } from '../cloud/client'
import { useProjecten } from '../store'

interface AboStaat {
  geladen: boolean
  bezig: boolean
  abo: Abonnement | null
  fout: string | null
  voor: string | null
}
let staat: AboStaat = { geladen: false, bezig: false, abo: null, fout: null, voor: null }
const luisteraars = new Set<() => void>()
const zet = (w: Partial<AboStaat>) => {
  staat = { ...staat, ...w }
  luisteraars.forEach((f) => f())
}

const NL = (e: unknown) => {
  const m = String((e as { message?: string })?.message ?? e ?? '')
  if (/fetch|network|Failed/i.test(m)) return 'Geen verbinding. Probeer het zo opnieuw.'
  if (/relation .*subscriptions|PGRST205/i.test(m)) return 'Abonnementen zijn nog niet ingericht (tabel ontbreekt).'
  return m || 'Er ging iets mis.'
}

export async function laadAbonnement(gebruikerId: string | null) {
  if (!BILLING_AAN) return
  if (!gebruikerId) return zet({ geladen: true, abo: null, voor: null, fout: null })
  zet({ bezig: true, fout: null })
  try {
    const c = await haalClient()
    const { data, error } = await c.from('subscriptions').select('status, plan, trial_ends_at, current_period_end, mollie_subscription_id').maybeSingle()
    if (error) throw error
    zet({ geladen: true, bezig: false, abo: (data as Abonnement | null) ?? null, voor: gebruikerId })
  } catch (e) {
    zet({ geladen: true, bezig: false, fout: NL(e), voor: gebruikerId })
  }
}

async function actie<T>(f: () => Promise<T>): Promise<T | undefined> {
  zet({ bezig: true, fout: null })
  try {
    return await f()
  } catch (e) {
    zet({ fout: NL(e) })
    return undefined
  } finally {
    zet({ bezig: false })
  }
}

/** Start de proefperiode van 14 dagen (eenmalig per account, via de database-functie start_trial). */
export const startProef = (gebruikerId: string) =>
  actie(async () => {
    const c = await haalClient()
    const { error } = await c.rpc('start_trial')
    if (error) throw error
    await laadAbonnement(gebruikerId)
  })

/** Naar de betaalpagina van Mollie (iDEAL e.d.); daarna komt de gebruiker terug op #/abonnement. */
export const startBetaling = (plan: Plan) =>
  actie(async () => {
    const c = await haalClient()
    const terug = `${location.origin}${location.pathname}#/abonnement?terug=1`
    const { data, error } = await c.functions.invoke('create-checkout', { body: { plan, redirectUrl: terug } })
    if (error) throw error
    const url = (data as { checkoutUrl?: string })?.checkoutUrl
    if (!url) throw new Error('Geen betaallink ontvangen.')
    location.href = url
  })

export const zegOp = (gebruikerId: string) =>
  actie(async () => {
    const c = await haalClient()
    const { error } = await c.functions.invoke('cancel-subscription', { body: {} })
    if (error) throw error
    await laadAbonnement(gebruikerId)
  })

export function useAbonnement() {
  const s = useSyncExternalStore(
    (f) => {
      luisteraars.add(f)
      return () => luisteraars.delete(f)
    },
    () => staat,
  )
  const cloud = useCloud()
  const id = cloud.gebruiker?.id ?? null
  useEffect(() => {
    if (BILLING_AAN && id !== staat.voor) void laadAbonnement(id)
  }, [id])
  return { ...s, gebruiker: cloud.gebruiker, pro: heeftPro(s.abo) }
}

/** Gate voor nieuwe projecten. Vlag uit: altijd toegestaan. */
export function useProjectToegang() {
  const projecten = useProjecten()
  const { abo } = useAbonnement()
  return magNieuwProject({ aan: BILLING_AAN, abo, aantal: telActieveProjecten(projecten) })
}
