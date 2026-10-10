import { describe, expect, it } from 'vitest'
import { BILLING_AAN } from './config'
import { magNieuwProject } from './logica'
import { parse } from '../router'

describe('billing-vlag', () => {
  it('staat standaard uit (geen VITE_BILLING_ENABLED)', () => {
    expect(BILLING_AAN).toBe(false)
    expect(magNieuwProject({ aan: BILLING_AAN, abo: null, aantal: 999 }).mag).toBe(true)
  })
  it('verborgen voorbeeldroute', () => {
    expect(parse('#/abonnement?preview=1')).toEqual({ naam: 'abonnement', preview: 'gratis', terug: false })
    expect(parse('#/abonnement?preview=trial')).toMatchObject({ preview: 'trial' })
    expect(parse('#/abonnement?terug=1')).toMatchObject({ preview: undefined, terug: true })
    expect(parse('#/prijzen')).toEqual({ naam: 'prijzen', terugNaar: undefined })
  })
})
