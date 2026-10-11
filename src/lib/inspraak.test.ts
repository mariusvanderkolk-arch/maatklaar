import { describe, expect, it, vi } from 'vitest'
import { pasInspraakToe, regelParser, schoon, verwerkInspraak } from './inspraak'
import { nieuwProject } from './defaults'

describe('regelParser', () => {
  it('voorbeeldzin', () => {
    const r = regelParser('badkamer 2 bij 3 meter, tegels tot plafond, inloopdouche, toilet vervangen, container 6 kuub')
    expect(r).toMatchObject({ type: 'badkamer', lengte: 3, breedte: 2, tegelhoogte: 'plafond', container: { maat: 6 } })
    expect(r.aan).toEqual(expect.arrayContaining(['inloopdouche', 'toilet', 'sloopwerk', 'container', 'wandtegels', 'vloertegels']))
    expect(r.aan).not.toContain('bad')
  })
  it('woorden, komma, cm, hoogte, ontkenning en afvalsoort', () => {
    const r = regelParser('Toilet van 90 bij 150 cm, plafond hoogte 2,4, geen fontein, container met puin, klant Jansen')
    expect(r).toMatchObject({ type: 'toilet', lengte: 1.5, breedte: 0.9, hoogte: 2.4, container: { soort: 'puin' }, klant: 'Jansen' })
    expect(r.uit).toContain('fontein')
    expect(regelParser('keuken twee komma vijf bij vier, spatwand en spots').lengte).toBe(4)
    expect(regelParser('woonkamer 5 bij 4 laminaat met plinten').aan).toEqual(expect.arrayContaining(['legvloer', 'plinten']))
    expect(regelParser('woonkamer 5 bij 4 laminaat').type).toBe('vloer')
    expect(regelParser('badkamer met ligbad').aan).toContain('bad')
  })
})

describe('schoon (AI-uitvoer)', () => {
  it('filtert onzin', () => {
    expect(schoon({ type: 'garage', lengte: 999, aan: ['toilet', 'rm -rf'], uit: ['toilet', 'bad'], container: { maat: 7, soort: 'hout' } })).toEqual({ aan: ['toilet'], uit: ['bad'], container: { soort: 'hout' } })
  })
})

describe('verwerkInspraak', () => {
  it('gebruikt AI-resultaat als de functie werkt', async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ resultaat: { type: 'keuken', aan: ['spatwand'], uit: [] } }) }) as Response)
    expect(await verwerkInspraak('keuken', f as unknown as typeof fetch)).toEqual({ r: { type: 'keuken', aan: ['spatwand'], uit: [] }, bron: 'ai' })
  })
  it('valt terug op regels zonder sleutel of offline', async () => {
    const z = await verwerkInspraak('toilet 1 bij 2', (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch)
    expect(z).toMatchObject({ bron: 'regels', reden: 'geen-sleutel', r: { type: 'toilet', lengte: 2 } })
    expect((await verwerkInspraak('toilet', (async () => { throw new Error() }) as unknown as typeof fetch)).reden).toBe('offline')
  })
})

describe('pasInspraakToe', () => {
  it('zet type, maten, tegelhoogte en onderdelen', () => {
    const p = nieuwProject({ type: 'badkamer' })
    const n = pasInspraakToe(p, { type: 'toilet', lengte: 1.5, breedte: 0.9, hoogte: 2.4, tegelhoogte: 'plafond', aan: ['container', 'bad'], uit: ['fontein'], container: { maat: 3 } })
    expect(n.type).toBe('toilet')
    expect(n.afmetingen).toMatchObject({ lengte: 1.5, breedte: 0.9, hoogte: 2.4, tegelhoogte: 2.4 })
    expect(n.scope.container).toBe(true)
    expect(n.scope.bad).toBeFalsy() // past niet bij toilet
    expect(n.scope.fontein).toBe(false)
    expect(n.container).toEqual({ maat: 3 })
  })
})
