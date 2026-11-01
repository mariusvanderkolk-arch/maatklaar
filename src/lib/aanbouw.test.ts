import { describe, expect, it } from 'vitest'
import { aanbouwMaten, aanbouwRegels } from './aanbouw'
import { berekenMaterialen } from './calc'
import { nieuwProject } from './defaults'
import { voorbeeldPrijsBron } from './prices'
import { scopeVoor } from './ruimtes'
import type { Afmetingen } from './types'

const afm = (x: Partial<Afmetingen> = {}): Afmetingen => ({ ...nieuwProject({ type: 'aanbouw' }).afmetingen, openingen: [], ...x })

describe('aanbouwMaten', () => {
  it('rekent vloer, gevel en dak uit L×B×H', () => {
    const m = aanbouwMaten(afm({ lengte: 4, breedte: 3, hoogte: 2.7, aanbouw: { doorbraak: 3.5, overstek: 0.2 } }))
    expect(m.vloer).toBe(12)
    expect(m.gevelLengte).toBe(10)
    expect(m.gevelBruto).toBeCloseTo(27)
    expect(m.dak).toBeCloseTo(4.4 * 3.2)
    expect(m.daktrim).toBeCloseTo(4.4 + 2 * 3.2)
    expect(m.doorbraak).toBe(3.5)
  })
  it('trekt kozijnen af en begrenst doorbraak en overstek', () => {
    const m = aanbouwMaten(
      afm({ lengte: 4, breedte: 3, hoogte: 2.7, aanbouw: { doorbraak: 9, overstek: 5 }, openingen: [{ id: 'a', type: 'raam', breedte: 3, hoogte: 2.3, vanafVloer: 0 }] }),
    )
    expect(m.kozijnM2).toBeCloseTo(6.9)
    expect(m.gevelNetto).toBeCloseTo(27 - 6.9)
    expect(m.overstek).toBe(1)
    expect(m.doorbraak).toBe(4)
  })
  it('geeft nul bij ongeldige maten', () => {
    const m = aanbouwMaten(afm({ lengte: -1, breedte: Number.NaN, hoogte: 0 }))
    expect(m.vloer).toBe(0)
    expect(m.dak).toBe(0)
  })
})

describe('aanbouwRegels', () => {
  it('alleen aangevinkte posten, zonder lege regels', () => {
    const r = aanbouwRegels(afm({ lengte: 4, breedte: 3, hoogte: 2.7 }), { fundering: true, kozijnen: true })
    expect(r.map((x) => x.id)).toEqual(['aanbouw-fundering', 'aanbouw-vloer']) // geen kozijnen ingevuld → geen regel
    expect(r[0]).toMatchObject({ nodig: 10, eenheid: 'm¹' })
    expect(r[0].toelichting).toMatch(/constructeur/)
  })
})

describe('berekenMaterialen aanbouw', () => {
  it('isolatie: spouw (gevel netto) en dak (L×B) apart', () => {
    const r = aanbouwRegels(afm({ lengte: 4, breedte: 3, hoogte: 2.7 }), { isolatie: true })
    expect(r.map((x) => [x.id, x.nodig])).toEqual([['aanbouw-isolatie', 27], ['aanbouw-dakisolatie', 12]])
  })
  it('zet casco-posten vooraan, met all-in richtprijs', () => {
    const p = nieuwProject({ type: 'aanbouw' })
    const regels = berekenMaterialen(p)
    const casco = regels.filter((r) => r.groep === 'aanbouw')
    expect(casco.length).toBeGreaterThan(3)
    expect(regels[0].groep).toBe('aanbouw')
    for (const r of casco) expect(voorbeeldPrijsBron.aanbod(r.id)?.prijs, r.id).toBeGreaterThan(0)
  })
  it('casco 4×3×2,7 m met 6 m² kozijn valt binnen NL-bandbreedte casco (€1.500–4.200/m²)', () => {
    const p = nieuwProject({ type: 'aanbouw' })
    p.afmetingen = { ...p.afmetingen, lengte: 4, breedte: 3, hoogte: 2.7, aanbouw: { doorbraak: 4, overstek: 0.2 }, openingen: [{ id: 'a', type: 'raam', breedte: 3, hoogte: 2, vanafVloer: 0 }] }
    p.scope = { ...p.scope, grondwerk: true, fundering: true, buitenmuur: true, isolatie: true, dak: true, hwa: true, kozijnen: true, gevelDoorbraak: true }
    const totaal = berekenMaterialen(p).filter((r) => r.groep === 'aanbouw').reduce((t, r) => t + r.prijsAantal * voorbeeldPrijsBron.aanbod(r.id)!.prijs, 0)
    expect(totaal / 12).toBeGreaterThan(1500)
    expect(totaal / 12).toBeLessThan(4200)
  })
  it('standaard-scope bevat casco-werk', () => {
    const s = scopeVoor('aanbouw')
    expect(s.fundering && s.buitenmuur && s.dak && s.kozijnen).toBe(true)
  })
})
