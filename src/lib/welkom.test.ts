import { describe, expect, it } from 'vitest'
import { markeerWelkom, welkomGezien, welkomStand, welkomTekst } from './welkom'

describe('welkom', () => {
  it('nieuw → eenmalig welkom; ingelogd terug → welkom terug, één keer', () => {
    expect(welkomStand({ gezien: false, ingelogd: false, terugAlGetoond: false })).toBe('nieuw')
    expect(welkomStand({ gezien: false, ingelogd: true, terugAlGetoond: false })).toBe('nieuw')
    expect(welkomStand({ gezien: true, ingelogd: true, terugAlGetoond: false })).toBe('terug')
    expect(welkomStand({ gezien: true, ingelogd: true, terugAlGetoond: true })).toBeNull()
    expect(welkomStand({ gezien: true, ingelogd: false, terugAlGetoond: false })).toBeNull()
  })
  it('onthoudt dat het welkom gezien is', () => {
    expect(welkomGezien()).toBe(false)
    markeerWelkom()
    expect(welkomGezien()).toBe(true)
  })
  it('geen prijzen of persoonlijke naam in de tekst', () => {
    const alles = Object.values(welkomTekst).join(' ')
    expect(alles).not.toMatch(/€|\d+,\d\d|marius/i)
    expect(alles).toContain('gratis')
  })
})
