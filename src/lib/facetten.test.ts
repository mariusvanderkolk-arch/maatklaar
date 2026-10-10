import { describe, expect, it } from 'vitest'
import { berekenArbeid, berekenMaterialen } from './calc'
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
      for (const k of r.werk as ScopeKey[]) if (!(r.id === 'vloer' && k === 'kitwerk')) expect(metArbeid.has(k), `${r.id}/${k}`).toBe(true)
      // checklist is volledig gegroepeerd
      expect(scopePerFase(r.id).flatMap((g) => g.items.map((i) => i.key)).sort()).toEqual([...r.werk].sort())
    })
  }
  it('badkamer, toilet en keuken hebben leidingwerk, elektra en ventilatie', () => {
    for (const id of ['badkamer', 'toilet', 'keuken'] as const) {
      const w = RUIMTES.find((r) => r.id === id)!.werk
      for (const k of ['sloopwerk', 'leidingwerk', 'elektra', 'ventilatie', 'kitwerk'] as ScopeKey[]) expect(w, `${id}/${k}`).toContain(k)
    }
  })
})
