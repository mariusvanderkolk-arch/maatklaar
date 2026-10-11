import { describe, expect, it } from 'vitest'
import { migreerVoorbeelden } from './store'
import { nieuwProject } from './defaults'

const dag = 86_400_000
describe('migreerVoorbeelden', () => {
  it('haalt alleen onaangeroerde oude voorbeelden weg en voegt het nieuwe toe', () => {
    const t = 1_800_000_000_000
    const oudOnaangeroerd = nieuwProject({ voorbeeld: true, voorbeeldId: 'keuken-bakker', createdAt: t - 3 * dag, updatedAt: t - 2 * dag })
    const oudBewerkt = nieuwProject({ voorbeeld: true, voorbeeldId: 'douche-de-vries', createdAt: t - 12 * dag, updatedAt: t + 5000 })
    const eigen = nieuwProject({ naam: 'Mijn badkamer', createdAt: t, updatedAt: t })
    const uit = migreerVoorbeelden([oudOnaangeroerd, oudBewerkt, eigen])
    expect(uit.map((p) => p.voorbeeldId ?? p.naam)).toEqual(['douche-de-vries', 'Mijn badkamer', 'compleet-jansen'])
    expect(migreerVoorbeelden(uit)).toHaveLength(3)
  })
})
