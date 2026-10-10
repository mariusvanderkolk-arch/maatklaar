import { describe, expect, it } from 'vitest'
import { berekenMaterialen } from './calc'
import { voorbeeldProjecten } from './defaults'
import { voorbeeldPrijsBron, type PrijsBron } from './prices'
import { maakInkooplijst } from './shopping'

describe('inkooplijst', () => {
  const p = voorbeeldProjecten()[0]
  const lijst = maakInkooplijst(berekenMaterialen(p), voorbeeldPrijsBron)

  it('markeert voorbeeldprijzen als voorbeeld', () => {
    expect(lijst.bron.isVoorbeeld).toBe(true)
    expect(lijst.prijsStatus.eigen).toBe(0)
  })

  it('elke regel heeft een prijs en het totaal klopt', () => {
    expect(lijst.zonderPrijs).toBe(0)
    expect(lijst.totaal).toBeCloseTo(lijst.regels.reduce((s, r) => s + r.totaal, 0), 1)
  })

  it('tegels worden per m² geprijsd (dozen × m² per doos)', () => {
    const r = lijst.regels.find((x) => x.id === 'wandtegel')!
    expect(r.totaal).toBeCloseTo(23.99 * r.aantal * p.wandtegel.m2PerDoos, 2)
  })

  it('eigen verpakkingsgrootte rekent het aantal om', () => {
    const bron: PrijsBron = { id: 't', naam: 'T', isVoorbeeld: false, peildatum: '2026-01-01', aanbod: (id) => (id === 'tegellijm' ? { prijs: 10, bron: 'eigen', inhoud: 5 } : voorbeeldPrijsBron.aanbod(id)) }
    const l = maakInkooplijst(berekenMaterialen(p), bron)
    const r = l.regels.find((x) => x.id === 'tegellijm')!
    expect(r.koopAantal).toBeGreaterThanOrEqual(r.aantal)
    expect(r.totaal).toBe(r.koopAantal * 10)
  })

  it('artikel zonder prijs telt als zonderPrijs', () => {
    const bron: PrijsBron = { id: 't', naam: 'T', isVoorbeeld: false, peildatum: '2026-01-01', aanbod: () => undefined }
    const l = maakInkooplijst(berekenMaterialen(p), bron)
    expect(l.zonderPrijs).toBe(l.regels.length)
    expect(l.totaal).toBe(0)
  })
})
