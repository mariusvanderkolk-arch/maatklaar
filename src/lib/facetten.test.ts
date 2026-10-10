import { describe, expect, it } from 'vitest'
import { berekenArbeid, berekenMaterialen, kiesContainer } from './calc'
import { nieuwProject } from './defaults'
import { RUIMTES, scopePerFase } from './ruimtes'
import { voorbeeldPrijsBron } from './prices'
import type { Scope, ScopeKey } from './types'

describe('volledige facetlijst per ruimte', () => {
  for (const r of RUIMTES) {
    it(`${r.id}: alle werkzaamheden aan → materiaal én arbeid, alles geprijsd`, () => {
      const scope = Object.fromEntries(r.werk.map((k) => [k, true])) as Scope
      const p = { ...nieuwProject({ type: r.id }), scope }
      const mat = berekenMaterialen(p)
      const arb = berekenArbeid(p)
      for (const m of mat) expect(voorbeeldPrijsBron.aanbod(m.id), m.id).toBeDefined()
      const metArbeid = new Set(arb.map((a) => a.scope))
      // elke gekozen werkzaamheid levert arbeid op (kitwerk op een vloer zonder kitnaden uitgezonderd)
      for (const k of r.werk as ScopeKey[]) if (k !== 'container' && !(r.id === 'vloer' && k === 'kitwerk')) expect(metArbeid.has(k), `${r.id}/${k}`).toBe(true)
      // checklist is volledig gegroepeerd
      expect(scopePerFase(r.id).flatMap((g) => g.items.map((i) => i.key)).sort()).toEqual([...r.werk].sort())
    })
  }
  it('huur container is een aparte, kiesbare post naast stortkosten en big bags (alle ruimtes)', () => {
    for (const r of RUIMTES) {
      expect(r.werk, r.id).toContain('container')
      const basis = nieuwProject({ type: r.id })
      const ids = (c: boolean) => berekenMaterialen({ ...basis, scope: { ...basis.scope, sloopwerk: true, container: c } }).map((m) => m.id)
      expect(ids(true).some((i) => i.startsWith('container')), r.id).toBe(true)
      expect(ids(true)).toContain('afvalverwerking')
      expect(ids(true)).not.toContain('bigbag')
      expect(ids(false)).toEqual(expect.arrayContaining(['bigbag', 'afvalverwerking']))
      expect(ids(false).some((i) => i.startsWith('container'))).toBe(false)
    }
    expect(voorbeeldPrijsBron.aanbod('container')?.bron).toBe('voorbeeld')
  })
  it('badkamer, toilet en keuken hebben leidingwerk, elektra en ventilatie', () => {
    for (const id of ['badkamer', 'toilet', 'keuken'] as const) {
      const w = RUIMTES.find((r) => r.id === id)!.werk
      for (const k of ['sloopwerk', 'leidingwerk', 'elektra', 'ventilatie', 'kitwerk'] as ScopeKey[]) expect(w, `${id}/${k}`).toContain(k)
    }
  })
})

describe('containerkeuze', () => {
  it('automatisch: kleinste maat waar alles in past', () => {
    expect(kiesContainer(2.1)).toMatchObject({ maat: 3, aantal: 1 })
    expect(kiesContainer(7)).toMatchObject({ maat: 10, aantal: 1 })
    expect(kiesContainer(31)).toMatchObject({ maat: 15, aantal: 3 })
  })
  it('puin en grond max 6 m³ per container', () => {
    expect(kiesContainer(9, { soort: 'puin' })).toMatchObject({ maat: 6, aantal: 2 })
    expect(kiesContainer(4, { soort: 'grond', maat: 15 })).toMatchObject({ maat: 6, aantal: 1 })
  })
  it('gekozen maat en soort geven eigen regels; oude 6 m³-prijs blijft gekoppeld', () => {
    const basis = nieuwProject({ type: 'badkamer' })
    const mat = berekenMaterialen({ ...basis, scope: { ...basis.scope, sloopwerk: true, container: true }, container: { maat: 6, soort: 'hout' } })
    expect(mat.find((m) => m.id === 'container')?.naam).toMatch(/6 m³ – hout/)
    expect(mat.map((m) => m.id)).toContain('stort-hout')
    for (const id of ['container-3', 'container', 'container-10', 'container-15', 'afvalverwerking', 'stort-puin', 'stort-hout', 'stort-grond'] as const) expect(voorbeeldPrijsBron.aanbod(id)?.bron).toBe('voorbeeld')
  })
})
