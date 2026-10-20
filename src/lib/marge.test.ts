import { describe, expect, it } from 'vitest'
import { begrens, margeOverzicht, margeRegels, projectMarge, regelMarge, verkoopPrijs } from './marge'
import type { InkoopRegel } from './shopping'

const r = (sleutel: string, totaal: number) => ({ sleutel, naam: sleutel, totaal } as unknown as InkoopRegel)

describe('marge op materiaal', () => {
  it('oude projecten: geen marge', () => {
    expect(projectMarge({})).toBe(0)
    expect(margeRegels({}, [r('a', 121)])[0]).toMatchObject({ inkoop: 121, marge: 0, verkoop: 121 })
  })
  it('marge voor btw: excl-bedrag × (1+m), btw blijft 21%', () => {
    const v = verkoopPrijs(121, 10) // excl 100 → 110 excl → 133,10 incl
    expect(v).toBe(133.1)
    expect(Math.round((v / 1.21) * 100) / 100).toBe(110)
  })
  it('per regel gaat voor project, begrensd 0–200', () => {
    const p = { marge: 10, margeRegels: { b: 25 } }
    expect(regelMarge(p, 'a')).toBe(10)
    expect(regelMarge(p, 'b')).toBe(25)
    expect(begrens(-5)).toBe(0)
    expect(begrens(999)).toBe(200)
    expect(begrens(NaN)).toBe(0)
  })
  it('overzicht: verdiensten = marge + arbeid', () => {
    const o = margeOverzicht(margeRegels({ marge: 20 }, [r('a', 100), r('b', 50)]), 500)
    expect(o).toMatchObject({ inkoop: 150, marge: 30, verkoop: 180, arbeid: 500, verdiensten: 530 })
  })
})
