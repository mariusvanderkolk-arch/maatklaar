import { describe, expect, it } from 'vitest'
import {
  importeerPrijzen,
  isOudFormaat,
  metEigenPrijzen,
  naarCsv,
  naarJson,
  normaliseerPrijzen,
  pasPercentageToe,
  telEigenPrijzen,
  vanOudFormaat,
  voorbeeldAlsEigen,
  vulVoorbeeldenAan,
  zetEigenPrijs,
  type EigenPrijzen,
} from './eigenPrijzen'
import { berekenMaterialen } from './calc'
import { CATALOGUS } from './catalogus'
import { nieuwProject } from './defaults'
import { VOORBEELD_PRIJZEN, voorbeeldPrijsBron } from './prices'
import { maakInkooplijst } from './shopping'

const NU = new Date('2026-10-10T10:00:00Z')

describe('eigen prijslijst', () => {
  it('elk catalogusartikel heeft een voorbeeldprijs', () => {
    for (const c of CATALOGUS) expect(VOORBEELD_PRIJZEN[c.id], c.id).toBeGreaterThan(0)
  })

  it('eigen prijs gaat vóór voorbeeld, leverancier komt mee', () => {
    const e = zetEigenPrijs({}, 'kit', { prijs: 6.5, leverancier: ' Bouwvoordeel Barneveld ' }, NU)
    const bron = metEigenPrijzen(voorbeeldPrijsBron, e)
    expect(bron.aanbod('kit')).toMatchObject({ prijs: 6.5, bron: 'eigen', leverancier: 'Bouwvoordeel Barneveld' })
    expect(bron.aanbod('primer')?.bron).toBe('voorbeeld')
    expect(bron.isVoorbeeld).toBe(false)
  })

  it('leeg maken ruimt op; alleen leverancier blijft bewaard', () => {
    let e = zetEigenPrijs({}, 'kit', { prijs: 6.5 }, NU)
    e = zetEigenPrijs(e, 'kit', { prijs: null }, NU)
    expect(e.kit).toBeUndefined()
    e = zetEigenPrijs(e, 'kit', { leverancier: 'X' }, NU)
    expect(e.kit?.leverancier).toBe('X')
    expect(telEigenPrijzen(e)).toBe(0)
    expect(metEigenPrijzen(voorbeeldPrijsBron, e).aanbod('kit')).toMatchObject({ bron: 'voorbeeld', leverancier: 'X' })
  })

  it('voorbeeld overnemen en bijvullen', () => {
    const alles = voorbeeldAlsEigen(voorbeeldPrijsBron, NU)
    expect(telEigenPrijzen(alles)).toBe(CATALOGUS.length)
    const deel = zetEigenPrijs({}, 'kit', { prijs: 1 }, NU)
    const bij = vulVoorbeeldenAan(deel, voorbeeldPrijsBron, NU)
    expect(bij.kit?.prijs).toBe(1)
    expect(telEigenPrijzen(bij)).toBe(CATALOGUS.length)
  })

  it('percentage per categorie en leverancier', () => {
    let e: EigenPrijzen = zetEigenPrijs({}, 'kit', { prijs: 10, leverancier: 'A' }, NU)
    e = zetEigenPrijs(e, 'primer', { prijs: 20, leverancier: 'B' }, NU)
    expect(pasPercentageToe(e, 10, {}, NU).kit?.prijs).toBe(11)
    const alleenA = pasPercentageToe(e, -10, { leverancier: 'a' }, NU)
    expect(alleenA.kit?.prijs).toBe(9)
    expect(alleenA.primer?.prijs).toBe(20)
  })
})

describe('omzetting oud formaat (prijzen per winkel)', () => {
  const oud = {
    kit: { gamma: { prijs: 8, bijgewerkt: '2026-01-01T00:00:00Z' }, praxis: { prijs: 7, bijgewerkt: '2026-01-02T00:00:00Z' } },
    primer: { praxis: { prijs: 15, bijgewerkt: '2026-01-02T00:00:00Z' } },
    voegmiddel: { praxis: { prijs: 11, bijgewerkt: '2026-01-02T00:00:00Z' } },
    tegellijm: { gamma: { nietLeverbaar: true, bijgewerkt: '2026-01-02T00:00:00Z' }, karwei: { prijs: 19, bijgewerkt: '2026-01-02T00:00:00Z' } },
  }
  it('herkent oud formaat', () => {
    expect(isOudFormaat(oud)).toBe(true)
    expect(isOudFormaat({ kit: { prijs: 1, bijgewerkt: 'x' } })).toBe(false)
  })
  it('kiest de meest ingevulde winkel, vult aan uit andere, verliest geen artikel', () => {
    const o = vanOudFormaat(oud, undefined, NU)
    expect(o.winkel).toBe('praxis')
    expect(o.prijzen.kit).toMatchObject({ prijs: 7, leverancier: 'Praxis' })
    expect(o.prijzen.tegellijm).toMatchObject({ prijs: 19, leverancier: 'Karwei' })
    expect(o.uitHoofd).toBe(3)
    expect(o.uitAndere).toBe(1)
    expect(o.meerdere).toBe(1)
  })
  it('gekozen winkel wint', () => {
    expect(vanOudFormaat(oud, 'gamma', NU).prijzen.kit?.prijs).toBe(8)
  })
  it('normaliseerPrijzen accepteert oud en nieuw', () => {
    expect(normaliseerPrijzen(oud).kit?.prijs).toBe(7)
    expect(normaliseerPrijzen({ kit: { prijs: '6,50', bijgewerkt: '2026-01-01' }, onzin: { prijs: 1 } })).toEqual({ kit: { prijs: 6.5, bijgewerkt: '2026-01-01T00:00:00.000Z' } })
  })
})

describe('import/export', () => {
  const e = zetEigenPrijs(zetEigenPrijs({}, 'kit', { prijs: 6.5, leverancier: 'Bouw; "Voordeel"' }, NU), 'primer', { prijs: 12 }, NU)
  it('JSON heen en terug', () => {
    expect(importeerPrijzen(naarJson(e, NU), voorbeeldPrijsBron).prijzen).toEqual(e)
  })
  it('CSV heen en terug (voorbeeldregels worden overgeslagen)', () => {
    const csv = naarCsv(e, voorbeeldPrijsBron)
    expect(csv.split('\r\n')[0]).toContain('leverancier')
    expect(importeerPrijzen(csv, voorbeeldPrijsBron).prijzen).toEqual(e)
  })
  it('oud JSON-bestand (versie 1) met keuze van winkel', () => {
    const v1 = JSON.stringify({ app: 'slimmer-wonen', type: 'prijzen', versie: 1, prijzen: { kit: { gamma: { prijs: 8, bijgewerkt: '2026-01-01T00:00:00Z' }, hornbach: { prijs: 9, bijgewerkt: '2026-01-01T00:00:00Z' } } } })
    const r = importeerPrijzen(v1, voorbeeldPrijsBron)
    expect(r.oud?.winkels.map((w) => w.id)).toEqual(['gamma', 'hornbach'])
    expect(r.prijzen.kit?.prijs).toBe(8)
    expect(importeerPrijzen(v1, voorbeeldPrijsBron, 'hornbach').prijzen.kit).toMatchObject({ prijs: 9, leverancier: 'Hornbach' })
  })
  it('oude CSV met winkelkolom', () => {
    const csv = 'product_id;artikel;winkel;prijs_incl_btw;bron\nkit;Kit;Gamma;8,10;eigen\nkit;Kit;Praxis;;voorbeeld\nprimer;Primer;Praxis;14;eigen\nvoegmiddel;V;Praxis;10;eigen\n'
    const r = importeerPrijzen(csv, voorbeeldPrijsBron)
    expect(r.oud?.gekozen).toBe('praxis')
    expect(r.prijzen.kit).toMatchObject({ prijs: 8.1, leverancier: 'Gamma' })
    expect(r.prijzen.primer?.prijs).toBe(14)
  })
})

describe('inkooplijst met één prijslijst', () => {
  it('totaal = som van regels, gegroepeerd per categorie', () => {
    const p = nieuwProject({ type: 'badkamer' })
    const lijst = maakInkooplijst(berekenMaterialen(p), metEigenPrijzen(voorbeeldPrijsBron, zetEigenPrijs({}, 'kit', { prijs: 1, leverancier: 'A' }, NU)))
    expect(lijst.zonderPrijs).toBe(0)
    expect(lijst.totaal).toBeCloseTo(lijst.groepen.reduce((s, g) => s + g.totaal, 0), 1)
    expect(lijst.metLeverancier).toBe(true)
    expect(lijst.regels.find((r) => r.id === 'kit')).toMatchObject({ prijs: 1, bron: 'eigen' })
  })
})
