import { describe, expect, it } from 'vitest'
import { HERO_MAX, HERO_MIN, heroAfmetingen, oppervlakken, startStaat, verstel, wissel } from './heroDemo'

describe('heroDemo', () => {
  it('verstelt in stappen van 10 cm binnen grenzen', () => {
    expect(verstel(2.4, 1)).toBe(2.5)
    expect(verstel(2.4, -1)).toBe(2.3)
    expect(verstel(HERO_MAX, 1)).toBe(HERO_MAX)
    expect(verstel(HERO_MIN, -1)).toBe(HERO_MIN)
  })
  it('wisselt een onderdeel zonder de rest te raken', () => {
    const s = wissel(startStaat(), 'toilet')
    expect(s.aan.toilet).toBe(false)
    expect(s.aan.inloopdouche).toBe(true)
    expect(startStaat().aan.toilet).toBe(true)
  })
  it('rekent vloer en wand', () => {
    expect(oppervlakken(startStaat())).toEqual({ vloer: 4.32, wand: 21.8 })
  })
  it('douche past altijd in de ruimte', () => {
    const a = heroAfmetingen({ ...startStaat(), lengte: 1.2, breedte: 1.2 })
    expect(a.douche.breedte).toBeLessThanOrEqual(0.6)
    expect(a.douche.diepte).toBeLessThan(1.2)
  })
  it('schrijft niets naar opslag', () => {
    const schrijf: string[] = []
    const g = globalThis as { localStorage?: unknown }
    const oud = g.localStorage
    g.localStorage = { setItem: (k: string) => schrijf.push(k), getItem: () => null, removeItem: () => {}, length: 0 }
    try { wissel(startStaat(), 'inloopdouche'); heroAfmetingen(startStaat()) } finally { g.localStorage = oud }
    expect(schrijf).toEqual([])
  })
})

import { projectUitDemo } from './heroDemo'
describe('projectUitDemo', () => {
  it('neemt maten en sanitair mee', () => {
    const s = wissel({ ...startStaat(), lengte: 3.1, breedte: 2 }, 'toilet')
    const p = projectUitDemo(s, {}, 5)
    expect(p.type).toBe('badkamer')
    expect(p.afmetingen.lengte).toBe(3.1)
    expect(p.afmetingen.breedte).toBe(2)
    expect(p.scope.toilet).toBe(false)
    expect(p.scope.inloopdouche).toBe(true)
    expect(p.naam).toMatch(/3,1×2 m/)
    expect(p.createdAt).toBe(5)
  })
})
