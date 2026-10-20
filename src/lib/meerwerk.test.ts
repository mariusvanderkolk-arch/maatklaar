import { describe, expect, it } from 'vitest'
import { bedragVan, bonNummer, leesMeerwerkInfo, maakMeerwerkData, meerwerkFactuurRegels, meerwerkStatus, meerwerkTotaal, metTeken, volgendNr, waarschuwing, type MeerwerkItem } from './meerwerk'
import { leesOfferte, codeerOfferte, decodeerOfferte } from './offerte'
import { maakFactuur, maakTermijnen } from './factuur'
import { standaardBedrijf } from './bedrijf'
import { nieuwProject } from './defaults'

const item = (x: Partial<MeerwerkItem> = {}): MeerwerkItem => ({ id: 'a', nr: 1, datum: '2026-10-21', soort: 'meer', omschrijving: 'Extra stopcontact', reden: 'Wens klant', modus: 'bedrag', bedrag: 121, materiaal: 0, uren: 0, ...x })
const getekend = (x: Partial<MeerwerkItem> = {}) => item({ teken: { token: 't'.repeat(64), hash: 'h', nr: 'x', code: '', gedeeldOp: 1, getekend: { naam: 'Klant', op: '2026-10-22T10:00:00Z', handtekening: 'data:image/png;base64,AA' } }, ...x })

describe('meerwerk', () => {
  const p = { ...nieuwProject(), uurtarief: 60.5, marge: 10 }
  it('bedrag: vast of materiaal (met marge) + uren', () => {
    expect(bedragVan(item(), p)).toBe(121)
    expect(bedragVan(item({ modus: 'berekend', materiaal: 100, uren: 2 }), p)).toBe(110 + 121)
    expect(metTeken(item({ soort: 'minder', bedrag: 50 }), p)).toBe(-50)
    expect(bedragVan(item({ bedrag: -5 }), p)).toBe(0)
  })
  it('alleen getekende bonnen tellen mee; oude projecten 0', () => {
    expect(meerwerkTotaal(nieuwProject())).toBe(0)
    expect(meerwerkTotaal({ ...p, meerwerk: [item(), getekend({ id: 'b', bedrag: 242 }), getekend({ id: 'c', soort: 'minder', bedrag: 100 })] })).toBe(142)
    expect(meerwerkStatus(item())).toBe('concept')
    expect(meerwerkStatus(getekend())).toBe('getekend')
    expect(volgendNr({ meerwerk: [item({ nr: 3 })] })).toBe(4)
    expect(bonNummer('OF-2026-001', 2)).toBe('OF-2026-001-MW2')
  })
  it('waarschuwing noemt de prijsstijging', () => {
    expect(waarschuwing('meer', 242, (n) => `€${n}`)).toMatch(/prijs €242 hoger/)
  })
  it('bon reist veilig mee in de bestaande offerte-snapshot', () => {
    const d = maakMeerwerkData({ ...p, klant: 'Fam. X', naam: 'Badkamer' }, item({ foto: 'data:image/jpeg;base64,AAAA' }), standaardBedrijf(), 'OF-1')
    const terug = leesOfferte(JSON.parse(JSON.stringify(d)))
    expect(terug.mw).toMatchObject({ soort: 'meer', bedrag: 121, offerteNr: 'OF-1', foto: 'data:image/jpeg;base64,AAAA' })
    expect(decodeerOfferte(codeerOfferte(d)).mw?.omschrijving).toBe('Extra stopcontact')
    expect(terug.totaal).toBe(121)
  })
  it('weigert onveilige foto en rommel', () => {
    expect(leesMeerwerkInfo({ soort: 'meer', foto: 'javascript:alert(1)' })?.foto).toBeUndefined()
    expect(leesMeerwerkInfo({ soort: 'x' })).toBeUndefined()
    expect(leesOfferte({ v: 1, nr: '1', totaal: 1, mat: [] }).mw).toBeUndefined()
  })
  it('getekend meerwerk op de eindfactuur (excl. btw)', () => {
    const pp = { ...p, meerwerk: [item(), getekend({ id: 'b', bedrag: 242 }), getekend({ id: 'c', soort: 'minder', bedrag: 121 })] }
    const r = meerwerkFactuurRegels(pp, () => 'id')
    expect(r.map((x) => x.excl)).toEqual([200, -100])
    expect(r[0].omschrijving).toMatch(/^Meerwerk:/)
  })
  it('termijnen: extra regels alleen op de laatste termijn', () => {
    const d = maakMeerwerkData(p, item(), standaardBedrijf(), 'OF-1')
    let n = 0
    const basis = maakFactuur({ ...d, mw: undefined }, { id: 'f', nummer: 'F1', projectId: p.id, datum: '2026-10-21', betaalDagen: 14, nu: 1, uid: () => String(n++) })
    const lijst = maakTermijnen(basis, [50, 50], ['F1', 'F2'], () => String(n++))
    expect(lijst).toHaveLength(2)
  })
})

describe('factuurVanOfferte met meerwerk', () => {
  it('zet meerwerk op de laatste termijnfactuur', async () => {
    const { factuurVanOfferte, factuurStore } = await import('./factuurStore')
    const p = { ...nieuwProject(), uurtarief: 60.5 }
    const d = { ...maakMeerwerkData(p, item(), standaardBedrijf(), 'OF-1'), mw: undefined }
    const extra = meerwerkFactuurRegels({ ...p, meerwerk: [getekend({ bedrag: 242 })] }, () => 'x')
    const f = factuurVanOfferte(d, p.id, [30, 70], extra)!
    const lijst = factuurStore.get().filter((x) => x.projectId === p.id)
    expect(f).toBeTruthy()
    expect(lijst).toHaveLength(2)
    const laatste = lijst.find((x) => x.regels.some((r) => r.omschrijving.startsWith('Meerwerk')))
    expect(laatste?.nummer).not.toBe(f.nummer)
    expect(lijst.filter((x) => x.regels.some((r) => r.omschrijving.startsWith('Meerwerk')))).toHaveLength(1)
  })
})
