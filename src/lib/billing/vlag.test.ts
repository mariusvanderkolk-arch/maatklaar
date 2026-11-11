import { describe, expect, it } from 'vitest'
import { BILLING_AAN } from './config'
import { magNieuwProject } from './logica'
import { parse } from '../router'

describe('billing-vlag', () => {
  it('staat standaard uit (geen VITE_BILLING_ENABLED)', () => {
    expect(BILLING_AAN).toBe(false)
    expect(magNieuwProject({ aan: BILLING_AAN, abo: null, aantal: 999 }).mag).toBe(true)
  })
  it('abonnementsroute bestaat, maar toont zonder vlag geen betaalscherm in de app', () => {
    expect(parse('#/abonnement')).toEqual({ naam: 'abonnement', preview: undefined, terug: false })
    expect(parse('#/abonnement?preview=trial&terug=1')).toEqual({ naam: 'abonnement', preview: 'trial', terug: true })
    // Prijzen-pagina (inkoopprijzen van de aannemer) blijft gewoon bereikbaar.
    expect(parse('#/prijzen')).toEqual({ naam: 'prijzen', terugNaar: undefined })
    expect(BILLING_AAN).toBe(false)
  })
})
