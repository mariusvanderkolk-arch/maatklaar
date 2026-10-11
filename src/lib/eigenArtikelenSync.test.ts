import { describe, expect, it } from 'vitest'
import { combineerArtikelen, leesBackup, maakBackup, samenvatting } from './backup'
import { importeerPrijzen, naarCsv, naarJson } from './eigenPrijzen'
import { voorbeeldPrijsBron } from './prices'
import { verwerkRemote } from './cloud/kern'
import type { EigenArtikel } from './eigenArtikelen'

const A: EigenArtikel = { id: 'eigen-abc', groep: 'elektra', naam: 'Inbouwdoos hol; 60 mm', eenheid: 'per stuk', prijs: 1.25, leverancier: 'TU', bijgewerkt: '2026-10-11T10:00:00.000Z' }

describe('eigen artikelen in prijsbestanden', () => {
  it('JSON heen en terug', () => {
    const r = importeerPrijzen(naarJson({}, new Date(), [A]), voorbeeldPrijsBron)
    expect(r.artikelen).toEqual([A])
  })
  it('CSV heen en terug, plus nieuwe regel zonder id', () => {
    let csv = naarCsv({}, voorbeeldPrijsBron, [A])
    expect(csv).toContain('eigen-abc')
    csv += ';Rookmelder 230V;24,95;per stuk;Gamma;;;;;;Elektra, verlichting & ventilatie\r\n'
    const r = importeerPrijzen(csv, voorbeeldPrijsBron)
    expect(r.artikelen?.[0]).toMatchObject({ id: 'eigen-abc', naam: A.naam, prijs: 1.25, groep: 'elektra', leverancier: 'TU' })
    expect(r.artikelen?.[1]).toMatchObject({ naam: 'Rookmelder 230V', prijs: 24.95, groep: 'elektra' })
    expect(r.artikelen?.[1].id.startsWith('eigen-')).toBe(true)
  })
})

describe('eigen artikelen in back-ups', () => {
  it('worden bewaard en teruggezet', () => {
    const b = leesBackup(JSON.stringify(maakBackup({ projecten: [], fotos: [], prijzen: {}, artikelen: [A] })))
    expect(b.artikelen).toEqual([A])
    expect(samenvatting(b).artikelen).toBe(1)
    const B = { ...A, id: 'eigen-b' as const, naam: 'Ander' }
    expect(combineerArtikelen([B], b.artikelen, 'samenvoegen').map((x) => x.id)).toEqual(['eigen-b', 'eigen-abc'])
    expect(combineerArtikelen([B], b.artikelen, 'vervangen')).toEqual([A])
    expect(combineerArtikelen([B], undefined, 'vervangen')).toEqual([B])
  })
})

describe('cloud', () => {
  it("rij met kind 'artikel' wordt verwerkt", () => {
    const { acties } = verwerkRemote({}, [{ kind: 'artikel', id: A.id, data: A, updated_at: '2026-10-11T10:00:00Z', deleted: false }], { eersteKeer: false, lokaalAanwezig: () => false })
    expect(acties).toHaveLength(1)
    expect(acties[0]).toMatchObject({ soort: 'artikel', id: A.id })
  })
})
