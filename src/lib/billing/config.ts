/**
 * Abonnementen (Maatklaar Pro) — staat standaard UIT.
 * Zolang VITE_BILLING_ENABLED niet 'true' is, verandert er niets voor gebruikers: geen limieten, geen betaalmuur.
 * Zie docs/BETALINGEN.md.
 */
const env = import.meta.env as Record<string, string | undefined>

export const BILLING_AAN = env.VITE_BILLING_ENABLED === 'true'

/** Prijzen in euro's. Standaard EXCLUSIEF btw (zakelijke klanten). Laat dit nakijken door je boekhouder. */
export const PRIJZEN = { maand: 9.99, jaar: 99 } as const
export const PRIJS_INCL_BTW = env.VITE_PRICES_INCL_VAT === 'true'
export const BTW = 0.21

export const GRATIS_MAX_PROJECTEN = 2
export const PROEF_DAGEN = 14
/** Na een mislukte incasso blijft Pro nog even werken. */
export const RESPIJT_DAGEN = 7

export type Plan = keyof typeof PRIJZEN
