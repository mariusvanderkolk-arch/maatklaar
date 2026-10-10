import { describe, expect, it } from 'vitest'
import { combineerPrijzenNieuwste, hashVan, markeerWijzigingen, soortFout, verwerkRemote, type Meta } from './kern'

const T = (s: string) => Date.parse(s)

describe('markeerWijzigingen', () => {
  it('markeert nieuwe en gewijzigde documenten als vuil', () => {
    const { meta, gewijzigd } = markeerWijzigingen({}, [{ soort: 'project', id: 'a', data: { x: 1 }, tijd: 100 }], 500)
    expect(gewijzigd).toBe(1)
    expect(meta['project/a']).toMatchObject({ vuil: true, tijd: 100 })
    const again = markeerWijzigingen(meta, [{ soort: 'project', id: 'a', data: { x: 1 }, tijd: 100 }], 600)
    expect(again.gewijzigd).toBe(0)
    const changed = markeerWijzigingen({ 'project/a': { ...meta['project/a'], vuil: false } }, [{ soort: 'project', id: 'a', data: { x: 2 } }], 700)
    expect(changed.meta['project/a']).toMatchObject({ vuil: true, tijd: 700 })
  })

  it('markeert lokaal verwijderde documenten als tombstone', () => {
    const meta: Meta = { 'factuur/f1': { hash: hashVan({}), tijd: 1, vuil: false, server: 'x' } }
    const { meta: m } = markeerWijzigingen(meta, [], 900)
    expect(m['factuur/f1']).toMatchObject({ weg: true, vuil: true, tijd: 900 })
  })
})

describe('verwerkRemote', () => {
  const rij = (id: string, updated: string, data: unknown = { id }, deleted = false) => ({ kind: 'project', id, data, updated_at: updated, deleted })

  it('neemt nieuwe documenten uit de cloud over', () => {
    const { acties, meta } = verwerkRemote({}, [rij('a', '2026-10-01T10:00:00Z')], { eersteKeer: false, lokaalAanwezig: () => false })
    expect(acties).toEqual([{ soort: 'project', id: 'a', type: 'zet', data: { id: 'a' } }])
    expect(meta['project/a'].vuil).toBe(false)
  })

  it('laatste wijziging wint: lokaal nieuwer blijft staan', () => {
    const meta: Meta = { 'project/a': { hash: 'h', tijd: T('2026-10-02T10:00:00Z'), vuil: true } }
    const { acties } = verwerkRemote(meta, [rij('a', '2026-10-01T10:00:00Z')], { eersteKeer: false, lokaalAanwezig: () => true })
    expect(acties).toEqual([])
  })

  it('laatste wijziging wint: cloud nieuwer overschrijft', () => {
    const meta: Meta = { 'project/a': { hash: 'h', tijd: T('2026-10-01T09:00:00Z'), vuil: true } }
    const { acties } = verwerkRemote(meta, [rij('a', '2026-10-01T10:00:00Z')], { eersteKeer: false, lokaalAanwezig: () => true })
    expect(acties[0].type).toBe('zet')
  })

  it('verwijdert lokaal bij een tombstone, maar nooit bij de eerste keer', () => {
    const r = rij('a', '2026-10-01T10:00:00Z', null, true)
    expect(verwerkRemote({}, [r], { eersteKeer: false, lokaalAanwezig: () => true }).acties).toEqual([{ soort: 'project', id: 'a', type: 'verwijder' }])
    expect(verwerkRemote({}, [r], { eersteKeer: true, lokaalAanwezig: () => true }).acties).toEqual([])
  })

  it('eerste keer: aan beide kanten → samenvoegen', () => {
    const meta: Meta = { 'bedrijf/profiel': { hash: 'h', tijd: 1, vuil: true } }
    const r = { kind: 'bedrijf', id: 'profiel', data: { naam: 'X' }, updated_at: '2026-10-01T10:00:00Z', deleted: false }
    expect(verwerkRemote(meta, [r], { eersteKeer: true, lokaalAanwezig: () => true }).acties[0].type).toBe('samenvoegen')
  })

  it('negeert rijen van de testversie (andere prefix) en al verwerkte rijen', () => {
    const r = { kind: 'test-project', id: 'a', data: {}, updated_at: '2026-10-01T10:00:00Z', deleted: false }
    expect(verwerkRemote({}, [r], { eersteKeer: false, lokaalAanwezig: () => false }).acties).toEqual([])
    expect(verwerkRemote({}, [r], { eersteKeer: false, prefix: 'test-', lokaalAanwezig: () => false }).acties).toHaveLength(1)
    const meta: Meta = { 'project/a': { hash: 'h', tijd: 1, vuil: false, server: '2026-10-01T10:00:00Z' } }
    expect(verwerkRemote(meta, [rij('a', '2026-10-01T10:00:00Z')], { eersteKeer: false, lokaalAanwezig: () => true }).acties).toEqual([])
  })
})

describe('combineerPrijzenNieuwste', () => {
  it('kiest per artikel de meest recente prijs', () => {
    const a = { kit: { prijs: 7, bijgewerkt: '2026-10-01T00:00:00Z' }, primer: { prijs: 8, bijgewerkt: '2026-10-03T00:00:00Z' } }
    const b = { kit: { prijs: 6, bijgewerkt: '2026-10-02T00:00:00Z' }, verf: { prijs: 30, bijgewerkt: '2026-09-01T00:00:00Z' } }
    const uit = combineerPrijzenNieuwste(a, b)
    expect(uit.kit?.prijs).toBe(6)
    expect(uit.primer?.prijs).toBe(8)
    expect(uit.verf?.prijs).toBe(30)
  })
  it('zet oud cloudformaat (per winkel) om', () => {
    const oud = { kit: { gamma: { prijs: 7, bijgewerkt: '2026-10-01T00:00:00Z' } } }
    expect(combineerPrijzenNieuwste(oud, {}).kit).toMatchObject({ prijs: 7, leverancier: 'Gamma' })
  })
})

describe('soortFout', () => {
  it('herkent een ontbrekende tabel, offline en overige fouten', () => {
    expect(soortFout({ code: 'PGRST205', message: "Could not find the table 'public.user_data' in the schema cache" })).toBe('geen-tabel')
    expect(soortFout({ code: '42P01', message: 'relation "public.user_data" does not exist' })).toBe('geen-tabel')
    expect(soortFout(new TypeError('Failed to fetch'))).toBe('offline')
    expect(soortFout({ code: '42501', message: 'permission denied' })).toBe('fout')
  })
})
