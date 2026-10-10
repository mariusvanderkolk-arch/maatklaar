import { describe, expect, it } from 'vitest'
import { heeftPro, jaarBesparing, magNieuwProject, prijsLabel, proefDagenOver, proefMogelijk, statusTekst, teBetalen, telActieveProjecten, type Abonnement } from './logica'

const NU = Date.parse('2026-10-10T12:00:00Z')
const DAG = 864e5
const iso = (t: number) => new Date(t).toISOString()
const proef = (eind: number): Abonnement => ({ status: 'trial', plan: null, trial_ends_at: iso(eind), current_period_end: null })

describe('vlag uit = niets verandert', () => {
  it('altijd nieuwe projecten, ook met 50 projecten en geen account', () => {
    expect(magNieuwProject({ aan: false, abo: null, aantal: 50, nu: NU })).toEqual({ mag: true, aantal: 50, max: null })
    expect(magNieuwProject({ aan: false, abo: { status: 'canceled', plan: 'maand', trial_ends_at: null, current_period_end: iso(NU - 90 * DAG) }, aantal: 9, nu: NU }).mag).toBe(true)
  })
})

describe('gratis limiet', () => {
  it('2 actieve projecten; voorbeeldprojecten tellen niet', () => {
    const ps = [{ voorbeeld: true }, { voorbeeld: true }, {}, { voorbeeld: false }]
    expect(telActieveProjecten(ps)).toBe(2)
    expect(magNieuwProject({ aan: true, abo: null, aantal: 0, nu: NU }).mag).toBe(true)
    expect(magNieuwProject({ aan: true, abo: null, aantal: 1, nu: NU }).mag).toBe(true)
    expect(magNieuwProject({ aan: true, abo: null, aantal: 2, nu: NU })).toEqual({ mag: false, reden: 'limiet', aantal: 2, max: 2 })
  })
  it('Pro of proef: onbeperkt', () => {
    expect(magNieuwProject({ aan: true, abo: proef(NU + 3 * DAG), aantal: 30, nu: NU }).mag).toBe(true)
    expect(magNieuwProject({ aan: true, abo: { status: 'active', plan: 'jaar', trial_ends_at: null, current_period_end: iso(NU + 200 * DAG) }, aantal: 30, nu: NU }).mag).toBe(true)
  })
  it('na afgelopen proef weer de gratis limiet (gegevens blijven)', () => {
    expect(magNieuwProject({ aan: true, abo: proef(NU - DAG), aantal: 5, nu: NU }).mag).toBe(false)
  })
})

describe('proefperiode', () => {
  it('dagen over: naar boven afgerond, nooit negatief', () => {
    expect(proefDagenOver(proef(NU + 14 * DAG), NU)).toBe(14)
    expect(proefDagenOver(proef(NU + 13 * DAG + 1), NU)).toBe(14)
    expect(proefDagenOver(proef(NU + 1000), NU)).toBe(1)
    expect(proefDagenOver(proef(NU - 1), NU)).toBe(0)
    expect(proefDagenOver(null, NU)).toBe(0)
    expect(proefDagenOver({ ...proef(NU), trial_ends_at: 'onzin' }, NU)).toBe(0)
  })
  it('maar één keer per account', () => {
    expect(proefMogelijk(null)).toBe(true)
    expect(proefMogelijk(proef(NU - DAG))).toBe(false)
  })
  it('statusteksten', () => {
    expect(statusTekst(proef(NU + DAG / 2), NU)).toBe('Proefperiode: nog 1 dag')
    expect(statusTekst(proef(NU + 5 * DAG), NU)).toBe('Proefperiode: nog 5 dagen')
    expect(statusTekst(null)).toBe('Gratis')
  })
})

describe('Pro-rechten', () => {
  const a = (status: Abonnement['status'], eind: number): Abonnement => ({ status, plan: 'maand', trial_ends_at: null, current_period_end: iso(eind) })
  it('actief, mislukte betaling met respijt, opgezegd tot periode-einde', () => {
    expect(heeftPro(a('active', NU + DAG), NU)).toBe(true)
    expect(heeftPro(a('past_due', NU - 3 * DAG), NU)).toBe(true)
    expect(heeftPro(a('past_due', NU - 8 * DAG), NU)).toBe(false)
    expect(heeftPro(a('canceled', NU + DAG), NU)).toBe(true)
    expect(heeftPro(a('canceled', NU - DAG), NU)).toBe(false)
  })
})

describe('prijzen', () => {
  it('standaard excl. btw; Mollie rekent incl. 21% btw', () => {
    expect(teBetalen('maand', false)).toBe(12.09)
    expect(teBetalen('jaar', false)).toBe(119.79)
    expect(teBetalen('maand', true)).toBe(9.99)
    const l = prijsLabel('maand', false)
    expect(l.btw).toBe('excl. btw')
    expect(l.sub).toMatch(/12,09.*incl\. 21% btw/)
    expect(prijsLabel('jaar', true).btw).toBe('incl. btw')
    expect(jaarBesparing()).toBe(2)
  })
})
