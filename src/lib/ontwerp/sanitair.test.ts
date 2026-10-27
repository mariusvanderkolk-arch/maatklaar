import { describe, expect, it } from 'vitest'
import { compact, leegOntwerp, normaliseerOntwerp, overlapt, uitCompact, voorstelIndeling, type Kamer, type OntwerpItem } from './model'
import { heeftOmbouw, metOmbouw, normSanitair, OMBOUW_DIEPTE, STANDAARD_SANITAIR } from './sanitair'

const k: Kamer = { L: 250, B: 200, H: 260, tegelH: 210, type: 'badkamer' }

describe('sanitair-keuzes', () => {
  it('normaliseert en valt terug op standaard', () => {
    expect(normSanitair(null)).toBeUndefined()
    expect(normSanitair({ kraan: 'mat-zwart', douche: 'xx' })).toEqual({ ...STANDAARD_SANITAIR, kraan: 'mat-zwart' })
  })
  it('blijft bewaard via normaliseren en de offerte-link', () => {
    const s = { kraan: 'antraciet', douche: 'inbouw', bad: 'vloer', wastafel: 'wand', front: 'salie' } as const
    const o = { ...leegOntwerp('badkamer'), sanitair: { ...s } }
    expect(normaliseerOntwerp(JSON.parse(JSON.stringify(o)), 'badkamer').sanitair).toEqual(s)
    expect(uitCompact(JSON.parse(JSON.stringify(compact(o, k))))!.ontwerp.sanitair).toEqual(s)
    // oude links zonder sanitair
    expect(uitCompact(JSON.parse(JSON.stringify(compact(leegOntwerp('badkamer'), k))))!.ontwerp.sanitair).toBeUndefined()
  })
})

describe('leidingombouw achter hangtoilet', () => {
  const toilet: OntwerpItem = { id: 't', type: 'toilet-hangend', x: 27, y: 120, w: 37, d: 54, rot: 270 }
  it('zet een ombouw tegen de wand en schuift het toilet ervoor', () => {
    const r = metOmbouw(toilet, k, [toilet], 'o')!
    expect(r.ombouw.type).toBe('ombouw')
    expect(r.ombouw.x).toBe(OMBOUW_DIEPTE / 2)
    expect(r.toilet.x).toBe(27 + OMBOUW_DIEPTE)
    expect(overlapt(r.ombouw, r.toilet)).toBe(false)
    expect(heeftOmbouw(r.toilet, [r.ombouw, r.toilet])).toBe(true)
    expect(metOmbouw(r.toilet, k, [r.ombouw, r.toilet], 'o2')).toBeNull()
  })
  it('niet voor een toilet los van de wand of een staand toilet', () => {
    expect(metOmbouw({ ...toilet, x: 120 }, k, [], 'o')).toBeNull()
    expect(metOmbouw({ ...toilet, type: 'toilet-staand' }, k, [], 'o')).toBeNull()
  })
  it('voorstel-indeling krijgt een ombouw achter het hangtoilet', () => {
    let n = 0
    for (const type of ['badkamer', 'toilet'] as const) {
      const p = { type, afmetingen: { lengte: 2.5, breedte: 2, hoogte: 2.6, tegelhoogte: 2.1, douche: { breedte: 1, diepte: 1.2 }, openingen: [] }, scope: {} } as never
      const items = voorstelIndeling(p, () => `i${n++}`)
      const t = items.find((i) => i.type === 'toilet-hangend')!
      expect(heeftOmbouw(t, items)).toBe(true)
    }
  })
})
