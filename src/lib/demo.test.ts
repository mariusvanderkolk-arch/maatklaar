import { describe, expect, it, vi } from 'vitest'
import { opslag } from './veiligeOpslag'
import { demoOfferte, demoProject } from './demo'

describe('demo', () => {
  it('realistische middenklasse badkamer', () => {
    const d = demoOfferte(Date.parse('2026-10-20'))
    expect(d.totaal).toBeGreaterThan(9000)
    expect(d.totaal).toBeLessThan(16000)
    expect(d.bedrijf.naam).toMatch(/Voorbeeld/)
    expect(JSON.stringify(d)).not.toMatch(/marius|maatklaar pro|abonnement/i)
  })
  it('raakt de opslag niet', () => {
    const spy = vi.spyOn(opslag, 'setItem')
    demoProject(); demoOfferte()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('demo-route', () => {
  it('parse en pad', async () => {
    const { parse } = await import('./router')
    const { padVoor } = await import('./analytics')
    expect(parse('#/demo')).toEqual({ naam: 'demo', stap: 'maten' })
    expect(parse('#/demo/klant')).toEqual({ naam: 'demo', stap: 'klant' })
    expect(parse('#/demo/onzin')).toEqual({ naam: 'demo', stap: 'maten' })
    expect(padVoor({ naam: 'demo', stap: 'klaar' })).toBe('/demo/klaar')
  })
})
