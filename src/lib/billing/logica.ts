/** Pure abonnementslogica (getest in logica.test.ts). */
import { BTW, GRATIS_MAX_PROJECTEN, PRIJS_INCL_BTW, PRIJZEN, RESPIJT_DAGEN, type Plan } from './config'

export type AboStatus = 'trial' | 'active' | 'past_due' | 'canceled'

/** Rij uit de tabel subscriptions (zie supabase/billing.sql). */
export interface Abonnement {
  status: AboStatus
  plan: Plan | null
  trial_ends_at: string | null
  current_period_end: string | null
  mollie_subscription_id?: string | null
}

const DAG = 24 * 3600e3
const tijd = (s: string | null | undefined) => {
  const t = s ? Date.parse(s) : NaN
  return Number.isFinite(t) ? t : null
}

/** Hele dagen proefperiode over (afgerond naar boven; 0 als voorbij of geen proef). */
export function proefDagenOver(a: Abonnement | null, nu = Date.now()): number {
  if (!a || a.status !== 'trial') return 0
  const eind = tijd(a.trial_ends_at)
  if (eind == null || eind <= nu) return 0
  return Math.ceil((eind - nu) / DAG)
}

/** Heeft deze gebruiker nu Pro-rechten? */
export function heeftPro(a: Abonnement | null, nu = Date.now()): boolean {
  if (!a) return false
  const periode = tijd(a.current_period_end)
  switch (a.status) {
    case 'trial':
      return proefDagenOver(a, nu) > 0
    case 'active':
      return periode == null || periode > nu - RESPIJT_DAGEN * DAG
    case 'past_due':
      return periode != null && periode + RESPIJT_DAGEN * DAG > nu
    case 'canceled':
      // opgezegd: Pro tot het einde van de betaalde periode
      return periode != null && periode > nu
    default:
      return false
  }
}

/** Een proefperiode kan maar één keer per account. */
export const proefMogelijk = (a: Abonnement | null) => a == null

/** Telt actieve projecten; voorbeeldprojecten tellen niet mee. */
export const telActieveProjecten = (ps: { voorbeeld?: boolean }[]) => ps.filter((p) => !p.voorbeeld).length

export interface Toegang {
  mag: boolean
  reden?: 'limiet'
  aantal: number
  max: number | null
}

/**
 * Mag er een NIEUW project bij? Bestaande projecten blijven altijd te openen, bewerken en exporteren.
 * Met de vlag uit: altijd ja (niets verandert).
 */
export function magNieuwProject(o: { aan: boolean; abo: Abonnement | null; aantal: number; nu?: number }): Toegang {
  if (!o.aan || heeftPro(o.abo, o.nu)) return { mag: true, aantal: o.aantal, max: null }
  const mag = o.aantal < GRATIS_MAX_PROJECTEN
  return mag ? { mag, aantal: o.aantal, max: GRATIS_MAX_PROJECTEN } : { mag, reden: 'limiet', aantal: o.aantal, max: GRATIS_MAX_PROJECTEN }
}

const euro = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)

/** Bedrag dat bij Mollie wordt afgeschreven (altijd incl. btw). */
export function teBetalen(plan: Plan, inclBtw = PRIJS_INCL_BTW): number {
  const p = PRIJZEN[plan]
  return inclBtw ? p : Math.round(p * (1 + BTW) * 100) / 100
}

export function prijsLabel(plan: Plan, inclBtw = PRIJS_INCL_BTW) {
  const p = PRIJZEN[plan]
  return {
    bedrag: euro(p),
    per: plan === 'maand' ? 'per maand' : 'per jaar',
    btw: inclBtw ? 'incl. btw' : 'excl. btw',
    sub: inclBtw ? `${euro(Math.round((p / (1 + BTW)) * 100) / 100)} excl. btw` : `${euro(teBetalen(plan, false))} incl. ${Math.round(BTW * 100)}% btw`,
  }
}

/** Besparing van jaar t.o.v. 12 × maand, in hele maanden. */
export const jaarBesparing = () => Math.round((PRIJZEN.maand * 12 - PRIJZEN.jaar) / PRIJZEN.maand)

export function statusTekst(a: Abonnement | null, nu = Date.now()): string {
  if (!a) return 'Gratis'
  const d = proefDagenOver(a, nu)
  const datum = (s: string | null) => (tijd(s) ? new Date(tijd(s)!).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
  if (a.status === 'trial') return d > 0 ? `Proefperiode: nog ${d} ${d === 1 ? 'dag' : 'dagen'}` : 'Proefperiode afgelopen'
  if (a.status === 'active') return `Pro actief${a.current_period_end ? ` · verlengt op ${datum(a.current_period_end)}` : ''}`
  if (a.status === 'past_due') return 'Betaling mislukt · we proberen het opnieuw'
  return heeftPro(a, nu) ? `Opgezegd · Pro tot ${datum(a.current_period_end)}` : 'Opgezegd'
}
