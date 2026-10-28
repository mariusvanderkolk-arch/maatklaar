import { describe, expect, it } from 'vitest'
import { snelstartProject } from './Snelstart'
import { regelParser } from '../lib/inspraak'

describe('snelstart', () => {
  it('maakt uit één zin een concept-project met maten en onderdelen', () => {
    const p = snelstartProject(regelParser('badkamer 2 bij 3, inloopdouche, hangtoilet'), 1)
    expect(p.type).toBe('badkamer')
    expect(p.afmetingen.lengte).toBe(3)
    expect(p.afmetingen.breedte).toBe(2)
    expect(p.scope.inloopdouche).toBe(true)
    expect(p.naam).toMatch(/^Snelle offerte badkamer/)
    expect(p.createdAt).toBe(1)
  })
  it('zonder herkenning: standaard badkamer, nooit een fout', () => {
    const p = snelstartProject(regelParser('???'))
    expect(p.type).toBe('badkamer')
    expect(p.afmetingen.lengte).toBeGreaterThan(0)
  })
})
