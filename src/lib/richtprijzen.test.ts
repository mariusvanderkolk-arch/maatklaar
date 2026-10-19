import { describe, expect, it } from 'vitest'
import { voorbeeldPrijsBron } from './prices'
import { metEigenPrijzen } from './eigenPrijzen'
import { nieuwProject, normaliseerProject } from './defaults'

describe('richtprijzen oktober 2026', () => {
  it('nieuwe standaardprijzen voor badkamer', () => {
    expect(voorbeeldPrijsBron.aanbod('wandtegel')?.prijs).toBe(45)
    expect(voorbeeldPrijsBron.aanbod('regendouche')?.prijs).toBe(389)
    expect(nieuwProject().uurtarief).toBe(72.5)
  })
  it('eigen prijzen gaan altijd voor de standaardprijs', () => {
    const b = metEigenPrijzen(voorbeeldPrijsBron, { wandtegel: { prijs: 19.99, bijgewerkt: '2026-01-01' } })
    expect(b.aanbod('wandtegel')?.prijs).toBe(19.99)
  })
  it('bestaand project houdt zijn eigen uurtarief', () => {
    const p = normaliseerProject({ ...nieuwProject(), id: 'x', uurtarief: 55 })
    expect(p.uurtarief).toBe(55)
  })
})
