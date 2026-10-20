import { describe, expect, it } from 'vitest'
import { btwOverzicht, dagenTeLaat, effectieveStatus, factuurTekst, factuurTotalen, maakFactuur, normaliseerFactuur, volgendFactuurnummer, vervaldatumVoor, type FactuurRegel } from './factuur'
import type { OfferteData } from './offerte'

const regel = (excl: number, btw: 21 | 9 = 21, soort: 'materiaal' | 'arbeid' = 'materiaal'): FactuurRegel => ({ id: String(Math.random()), soort, omschrijving: 'x', detail: '', excl, btw })

describe('factuurnummering', () => {
  it('telt op vanaf de teller', () => {
    expect(volgendFactuurnummer('F-', 1, [], 2026)).toEqual({ nummer: 'F-2026-001', volgendeTeller: 2 })
    expect(volgendFactuurnummer('F-', 12, [], 2026).nummer).toBe('F-2026-012')
  })
  it('daalt nooit: bestaande facturen gaan vóór een lagere teller (bijv. na terugzetten back-up)', () => {
    expect(volgendFactuurnummer('F-', 2, ['F-2026-001', 'F-2026-007'], 2026)).toEqual({ nummer: 'F-2026-008', volgendeTeller: 9 })
    // ook over jaargrenzen heen en ongeacht volgorde
    expect(volgendFactuurnummer('F-', 1, ['F-2025-031', 'F-2026-002'], 2026).nummer).toBe('F-2026-032')
  })
  it('negeert nummers met een ander voorvoegsel (offertes)', () => {
    expect(volgendFactuurnummer('F-', 3, ['OF-2026-050'], 2026).nummer).toBe('F-2026-003')
  })
  it('ongeldige teller valt terug op 1', () => {
    expect(volgendFactuurnummer('F-', NaN, [], 2026).nummer).toBe('F-2026-001')
  })
})

describe('btw-berekening', () => {
  it('21% over de grondslag', () => {
    const o = btwOverzicht([regel(100), regel(23.45)])
    expect(o.perTarief).toEqual([{ tarief: 21, grondslag: 123.45, btw: 25.92 }])
    expect(o.totaalIncl).toBe(149.37)
  })
  it('gemengd 21% en 9% (arbeid)', () => {
    const o = btwOverzicht([regel(500), regel(1000, 9, 'arbeid'), regel(250, 9, 'arbeid')])
    expect(o.perTarief).toEqual([
      { tarief: 21, grondslag: 500, btw: 105 },
      { tarief: 9, grondslag: 1250, btw: 112.5 },
    ])
    expect(o.totaalExcl).toBe(1750)
    expect(o.totaalBtw).toBe(217.5)
    expect(o.totaalIncl).toBe(1967.5)
  })
  it('lege factuur', () => {
    expect(btwOverzicht([])).toEqual({ perTarief: [], totaalExcl: 0, totaalBtw: 0, totaalIncl: 0 })
  })
})

describe('factuur uit offerte', () => {
  const d = {
    nr: 'OF-2026-007', klant: 'Fam. Jansen', adres: 'Lindenlaan 12', project: 'Badkamer', tarief: 55,
    bedrijf: { naam: 'Van der Kolk', iban: 'NL91ABNA0417164300' },
    mat: [['Wandtegels', '5 × doos', 121, 0]], arb: [['Tegelwerk', 10]],
  } as unknown as OfferteData
  let n = 0
  const f = maakFactuur(d, { id: 'f1', nummer: 'F-2026-001', projectId: 'p1', datum: '2026-10-01', betaalDagen: 14, nu: 0, uid: () => `r${n++}` })
  it('neemt materiaal en arbeid over, excl. btw', () => {
    expect(f.regels.map((r) => [r.soort, r.excl, r.btw])).toEqual([
      ['materiaal', 100, 21],
      ['arbeid', 454.55, 21],
    ])
    expect(f.vervaldatum).toBe('2026-10-15')
    expect(f.status).toBe('concept')
    // offertetotaal incl. 21% blijft (op afronding na) gelijk
    expect(btwOverzicht(f.regels).totaalIncl).toBeCloseTo(121 + 550, 1)
  })
  it('arbeid op 9%: prijs excl. gelijk, minder btw', () => {
    const laag = f.regels.map((r) => (r.soort === 'arbeid' ? { ...r, btw: 9 as const } : r))
    expect(btwOverzicht(laag).totaalIncl).toBe(cent(100 * 1.21 + 454.55 + 40.91))
  })
  it('deeltekst met betaalgegevens en kenmerk', () => {
    const t = factuurTekst(f)
    expect(t).toContain('F-2026-001')
    expect(t).toContain('NL91ABNA0417164300')
    expect(t).toContain('o.v.v. F-2026-001')
  })
})
const cent = (n: number) => Math.round(n * 100) / 100

describe('vervaldatum en status', () => {
  it('vervaldatum volgt de betaaltermijn (standaard 14 dagen)', () => {
    expect(vervaldatumVoor('2026-12-25', 14)).toBe('2027-01-08')
    expect(vervaldatumVoor('2026-10-01', 0)).toBe('2026-10-15')
    expect(vervaldatumVoor('2026-10-01', 30)).toBe('2026-10-31')
  })
  it('te laat alleen bij verzonden en na de vervaldatum', () => {
    const f = { vervaldatum: '2026-10-15' }
    expect(effectieveStatus({ ...f, status: 'verzonden' }, '2026-10-15')).toBe('verzonden')
    expect(effectieveStatus({ ...f, status: 'verzonden' }, '2026-10-16')).toBe('te-laat')
    expect(effectieveStatus({ ...f, status: 'betaald' }, '2026-12-01')).toBe('betaald')
    expect(effectieveStatus({ ...f, status: 'concept' }, '2026-12-01')).toBe('concept')
    expect(dagenTeLaat(f, '2026-10-20')).toBe(5)
    expect(dagenTeLaat(f, '2026-10-01')).toBe(0)
  })
  it('totalen open / te laat / betaald', () => {
    const basis = { id: 'x', nummer: 'F', projectId: '', offerteNummer: '', datum: '2026-10-01', bedrijf: {}, klant: '', adres: '', project: '', notitie: '', aangemaakt: 0 }
    const t = factuurTotalen(
      [
        { ...basis, status: 'verzonden', vervaldatum: '2026-10-30', regels: [regel(100)] },
        { ...basis, status: 'verzonden', vervaldatum: '2026-10-05', regels: [regel(200)] },
        { ...basis, status: 'betaald', vervaldatum: '2026-10-05', regels: [regel(50)] },
        { ...basis, status: 'concept', vervaldatum: '2026-10-05', regels: [regel(10)] },
      ],
      '2026-10-10',
    )
    expect(t).toEqual({ open: 363, teLaat: 242, betaald: 60.5, concept: 12.1, aantalTeLaat: 1 })
  })
  it('normaliseert facturen uit een back-up', () => {
    expect(normaliseerFactuur({ id: 'a' })).toBeNull()
    const f = normaliseerFactuur({ id: 'a', nummer: 'F-2026-001', regels: [{ omschrijving: 'x', excl: 10, btw: 9 }, { omschrijving: 'kapot' }], status: 'onzin', datum: '2026-10-01' })!
    expect(f.regels).toHaveLength(1)
    expect(f.regels[0].btw).toBe(9)
    expect(f.status).toBe('concept')
    expect(f.vervaldatum).toBe('2026-10-15')
  })
})

import { geldigeTermijnen, maakTermijnen } from './factuur'
describe('termijnen', () => {
  const d = { nr: 'OF-9', klant: 'K', adres: '', project: 'P', tarief: 50, bedrijf: {}, mat: [['A', '1', 100, 0]], arb: [['T', 3.333]] } as unknown as OfferteData
  let n = 0
  const basis = maakFactuur(d, { id: 'b', nummer: 'X', projectId: 'p', datum: '2026-10-01', betaalDagen: 14, nu: 0, uid: () => `u${n++}` })
  it('validatie', () => {
    expect(geldigeTermijnen([100])).toBe(true)
    expect(geldigeTermijnen([30, 60, 10])).toBe(true)
    expect(geldigeTermijnen([50, 40])).toBe(false)
    expect(geldigeTermijnen([0, 100])).toBe(false)
    expect(geldigeTermijnen([])).toBe(false)
    expect(geldigeTermijnen(Array(7).fill(100 / 7))).toBe(false)
  })
  it('30/60/10: nummers, som exact gelijk, per btw-tarief', () => {
    const fs = maakTermijnen(basis, [30, 60, 10], ['F-1', 'F-2', 'F-3'], () => `t${n++}`)
    expect(fs.map((f) => f.nummer)).toEqual(['F-1', 'F-2', 'F-3'])
    expect(fs[0].id).toBe('b')
    const tot = (fs2: typeof fs) => fs2.reduce((s, f) => s + btwOverzicht(f.regels).totaalExcl, 0)
    expect(tot(fs)).toBeCloseTo(btwOverzicht(basis.regels).totaalExcl, 2)
    expect(fs[0].regels[0].omschrijving).toContain('Termijn 1 van 3')
    expect(fs[0].notitie).toContain('OF-9')
  })
  it('100% = gewone factuur', () => {
    expect(maakTermijnen(basis, [100], ['F-1'], () => 'x')[0].regels).toEqual(basis.regels)
  })
  it('fout bij ongeldige invoer', () => expect(() => maakTermijnen(basis, [50, 40], ['a', 'b'], () => 'x')).toThrow())
})
