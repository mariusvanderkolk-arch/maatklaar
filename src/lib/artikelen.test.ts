import { describe, expect, it } from 'vitest'
import { CATALOGUS } from './catalogus'
import { VOORBEELD_PRIJZEN, voorbeeldPrijsBron, type PrijsBron } from './prices'
import { berekenMaterialen } from './calc'
import { nieuwProject } from './defaults'
import { berekenAlles, pasSetsToe } from './useCalc'
import { SETS } from './artikelen'
import type { EigenArtikel } from './eigenArtikelen'

const eigenBron = (eigen: Record<string, number>): PrijsBron => ({
  ...voorbeeldPrijsBron,
  aanbod: (id) => (id in eigen ? { prijs: eigen[id], bron: 'eigen' } : voorbeeldPrijsBron.aanbod(id)),
})

describe('uitgebreide catalogus', () => {
  it('veel artikelen, unieke ids, allemaal met voorbeeldprijs', () => {
    const actief = CATALOGUS.filter((c) => !c.oud)
    expect(actief.length).toBeGreaterThan(250)
    expect(new Set(CATALOGUS.map((c) => c.id)).size).toBe(CATALOGUS.length)
    for (const c of actief) expect(VOORBEELD_PRIJZEN[c.id], c.id).toBeGreaterThan(0)
    for (const g of ['waterdicht', 'lijm-voeg', 'afwerking', 'leidingwerk', 'keuken']) expect(actief.filter((c) => c.groep === g).length).toBeGreaterThan(15)
  })
  it('berekening gebruikt losse fittingen in plaats van de set', () => {
    const ids = berekenMaterialen(nieuwProject({ type: 'badkamer' })).map((r) => r.id)
    expect(ids).not.toContain('koppelingen')
    expect(ids).toEqual(expect.arrayContaining(['knel-bocht', 'muurplaat', 'stopkraan', 'afdekfolie']))
  })
})

describe('oude setprijzen blijven gelden', () => {
  const p = nieuwProject({ type: 'badkamer' })
  it('eigen setprijs zonder losse prijzen → één setregel', () => {
    const r = pasSetsToe(berekenMaterialen(p), eigenBron({ koppelingen: 85 }))
    expect(r.filter((x) => x.id === 'koppelingen')).toHaveLength(1)
    expect(r.some((x) => x.uitSet === 'koppelingen')).toBe(false)
  })
  it('zodra een los artikel een eigen prijs heeft → losse artikelen', () => {
    const r = pasSetsToe(berekenMaterialen(p), eigenBron({ koppelingen: 85, 'knel-bocht': 5 }))
    expect(r.some((x) => x.id === 'koppelingen')).toBe(false)
    expect(Object.keys(SETS)).toContain('koppelingen')
  })
})

describe('handmatige artikelen en eigen artikelen', () => {
  it('komen met eigen aantal en prijs op de inkooplijst', () => {
    const eigen: EigenArtikel[] = [{ id: 'eigen-x1', groep: 'elektra', naam: 'Inbouwdoos hol', eenheid: 'per stuk', prijs: 1.5, leverancier: 'TU', bijgewerkt: '2026-10-11T00:00:00Z' }]
    const p = nieuwProject({ type: 'toilet', extraArtikelen: [{ sleutel: 'a', id: 'eigen-x1', aantal: 4 }, { sleutel: 'b', id: 'kimband-zk-120', aantal: 2 }, { sleutel: 'c', id: 'onbekend', aantal: 1 }] })
    const { inkoop } = berekenAlles(p, voorbeeldPrijsBron, eigen)
    const a = inkoop.regels.find((r) => r.sleutel === 'extra-a')!
    expect(a).toMatchObject({ naam: 'Inbouwdoos hol', koopAantal: 4, totaal: 6, bron: 'eigen', leverancier: 'TU' })
    expect(inkoop.regels.find((r) => r.sleutel === 'extra-b')).toMatchObject({ totaal: 2 * VOORBEELD_PRIJZEN['kimband-zk-120']!, bron: 'voorbeeld' })
    expect(inkoop.regels.some((r) => r.sleutel === 'extra-c')).toBe(false)
  })
})
