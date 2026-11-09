import { describe, expect, it, vi } from 'vitest'
import { nieuwProject, standaardScope } from './defaults'
import { standaardBedrijf } from './bedrijf'
import { berekenAlles } from './useCalc'
import { voorbeeldPrijsBron } from './prices'
import { maakOfferteData } from './offerteMaken'
import { offerteControle, OffertePoort, standaardMatenOngewijzigd } from './offerteControle'
import { vergeetPunten } from './vergeetCheck'
import type { Project, ProjectType } from './types'

function fixture() {
  const p = nieuwProject({ type: 'schilderwerk', offerte: { nummer: 'TEST', metArbeid: false } })
  const b = berekenAlles(p, voorbeeldPrijsBron, [])
  b.inkoop.regels = b.inkoop.regels.slice(0, 1)
  const d = maakOfferteData(p, b, standaardBedrijf(), (s) => s)
  const check = () => offerteControle(p, b, d)
  return { p, b, d, check, r: b.inkoop.regels[0] }
}
describe('offertebedragen controleren zonder rekenen te wijzigen', () => {
  it('waarschuwt voor positieve aantallen zonder prijs en muteert niets', () => {
    const f = fixture(); f.r.prijs = undefined; f.r.bron = 'geen'; f.r.totaal = 0
    const voor = JSON.stringify(f.p); const rows = JSON.stringify(f.b.inkoop.regels); const document = JSON.stringify(f.d)
    expect(f.check().punten[0].tekst).toContain('geen prijs bekend')
    expect(JSON.stringify(f.p)).toBe(voor); expect(JSON.stringify(f.b.inkoop.regels)).toBe(rows); expect(JSON.stringify(f.d)).toBe(document)
  })
  it('signaleert voorbeeld-nulprijs en onverwacht nulbedrag bij positief aantal', () => {
    const f = fixture(); f.r.prijs = 0; f.r.totaal = 0
    expect(f.check().punten[0].tekst).toContain('positief aantal')
    f.r.prijs = 20; f.r.prijsAantal = 0
    expect(f.check().punten).toHaveLength(1)
  })
  it('eigen nulprijs, lege nulregel en afronding naar nul zijn legitiem', () => {
    const f = fixture(); f.r.prijs = 0; f.r.bron = 'eigen'; f.r.totaal = 0
    expect(f.check().punten).toEqual([])
    f.r.koopAantal = 0; f.r.nodig = 0; f.r.prijsAantal = 0
    expect(f.check().punten).toEqual([])
    f.r.koopAantal = 1; f.r.prijsAantal = 1; f.r.prijs = .001; f.r.bron = 'voorbeeld'
    expect(f.check().punten).toEqual([])
  })
  it('behoefte met nul te kopen aantal vraagt controle, maar container zonder sloop mag behoefte 0 hebben', () => {
    const f = fixture(); f.r.koopAantal = 0; f.r.nodig = 2
    expect(f.check().punten[0].tekst).toContain('aantal is 0')
    f.r.nodig = 0; f.r.koopAantal = 1
    expect(f.check().punten).toEqual([])
  })
  it('korting en negatief minderwerk zijn geen ontbrekende prijs', () => {
    const f = fixture(); f.r.prijs = -20; f.r.totaal = -20
    f.d.mat[0][2] = -20; f.d.totaal = -20
    f.p.meerwerk = [{ bedrag: -50 } as never]
    expect(f.check().punten).toEqual([])
  })
  it.each([NaN, Infinity, -Infinity])('ongeldige prijs/aantal %s wordt veilig als invoerfout gemeld', (n) => {
    const f = fixture(); f.r.prijs = n
    expect(f.check().punten[0].soort).toBe('waarde')
    f.r.prijs = 10; f.r.koopAantal = n
    expect(f.check().punten[0].soort).toBe('waarde')
  })
  it.each([NaN, -1])('vindt ongeldig extra aantal %s ook als de berekening het heeft weggefilterd', (aantal) => {
    const f = fixture(); f.p.extraArtikelen = [{ sleutel: 'x', id: 'verf', aantal }]
    expect(f.check().punten.some((x) => x.id === 'extra-0')).toBe(true)
  })
  it('controleert uren/uurtarief alleen als arbeid in de offerte staat', () => {
    const f = fixture(); f.p.uurtarief = 0; f.p.offerte!.metArbeid = true
    expect(f.check().punten.some((x) => x.id === 'arbeid')).toBe(true)
    f.p.offerte!.metArbeid = false
    expect(f.check().punten).toEqual([])
  })
  it('controleert ook niet-eindige offertetotalen en geprojecteerde regels', () => {
    const f = fixture(); f.d.mat[0][2] = NaN
    expect(f.check().punten.some((x) => x.id === 'totaal')).toBe(true)
  })
  it('reviewversie volgt inhoud, prijsstatus, btw, scope en project; niet deelstatus', () => {
    const f = fixture(); const key = f.check().sleutel
    f.p.offerte!.gedeeldOp = 123
    expect(f.check().sleutel).toBe(key)
    f.r.bron = 'geen'; expect(f.check().sleutel).not.toBe(key)
    f.r.bron = 'voorbeeld'; f.d.notities += 'extra afspraak'; expect(f.check().sleutel).not.toBe(key)
    f.d.notities = ''; f.d.tarieven = { mat: [9], arb: [] }; expect(f.check().sleutel).not.toBe(key)
    f.p.id = 'ander'; expect(f.check().sleutel).not.toBe(key)
  })
})

describe('bestaande vergeetcheck, nu scope-afhankelijk', () => {
  const maak = (type: ProjectType, scope: Partial<Project['scope']> = {}) => {
    const leeg = standaardScope()
    for (const key of Object.keys(leeg) as (keyof typeof leeg)[]) leeg[key] = false
    return nieuwProject({ type, scope: { ...leeg, ...scope } })
  }
  it.each(['schilderwerk', 'stucwerk', 'badkamer', 'toilet', 'keuken', 'vloer', 'aanbouw'] as const)('geen generieke naglijst voor %s zonder gekozen afhankelijk werk', (type) => {
    expect(vergeetPunten(maak(type))).toEqual([])
  })
  it('kitwerk alleen bij relevant tegel-/sanitairwerk, niet bij los sauswerk', () => {
    expect(vergeetPunten(maak('badkamer', { toilet: true })).map((r) => r.key)).toContain('kitwerk')
    expect(vergeetPunten(maak('badkamer', { sauswerk: true })).map((r) => r.key)).not.toContain('kitwerk')
  })
  it('afvoer niet vergeten noemen als bigbags/stort al berekend zijn', () => {
    expect(vergeetPunten(maak('badkamer', { sloopwerk: true, container: false })).map((r) => r.key)).not.toContain('container')
  })
  it('afvoer bij keukendemontage wel als bespreekpunt indien niet begroot', () => {
    expect(vergeetPunten(maak('keuken', { keukenDemontage: true })).map((r) => r.key)).toContain('container')
  })
  it('respecteert bewust niet nodig en bestaande voorbeelden', () => {
    const p = maak('badkamer', { toilet: true }); p.offerte = { vergeetNietNodig: ['kitwerk', 'leidingwerk'] }
    expect(vergeetPunten(p)).toEqual([])
    p.voorbeeld = true; p.offerte = undefined
    expect(vergeetPunten(p)).toEqual([])
  })
})
describe('expliciete actiepoort', () => {
  it.each(['delen', 'PDF', 'tekenlink', 'WhatsApp'])('%s pas na bevestiging; annuleren heeft geen side effects', () => {
    const gate = new OffertePoort(true); const send = vi.fn()
    gate.vraag(send); expect(send).not.toHaveBeenCalled()
    gate.annuleer(); gate.bevestig(); expect(send).not.toHaveBeenCalled()
    gate.vraag(send); gate.bevestig(); expect(send).toHaveBeenCalledOnce()
    gate.bevestig(); expect(send).toHaveBeenCalledOnce()
    gate.vraag(send); expect(send).toHaveBeenCalledTimes(2)
    new OffertePoort(true).vraag(send); expect(send).toHaveBeenCalledTimes(2)
  })
  it('zonder punten geen extra klik', () => {
    const send = vi.fn(); new OffertePoort(false).vraag(send); expect(send).toHaveBeenCalledOnce()
  })
})

describe('waarschuwing bij onveranderde standaardmaten', () => {
  const metData = (p: Project) => {
    const b = berekenAlles(p, voorbeeldPrijsBron, [])
    return offerteControle(p, b, maakOfferteData(p, b, standaardBedrijf(), (s) => s))
  }
  it.each(['badkamer', 'toilet', 'keuken', 'vloer', 'aanbouw'] as const)('%s met standaardmaten geeft één maten-waarschuwing (geen invoerfout)', (type) => {
    const p = nieuwProject({ type })
    expect(standaardMatenOngewijzigd(p)).not.toBeNull()
    const maten = metData(p).punten.filter((x) => x.soort === 'maten')
    expect(maten).toHaveLength(1)
    expect(maten[0].id).toBe('standaardmaten')
    expect(maten[0].tekst).toContain('standaardmaten')
  })
  it('noemt de standaardmaten van het type in Nederlandse notatie', () => {
    expect(metData(nieuwProject({ type: 'badkamer' })).punten.find((x) => x.soort === 'maten')!.tekst).toContain('2,5 × 2,0 m')
    expect(metData(nieuwProject({ type: 'toilet' })).punten.find((x) => x.soort === 'maten')!.tekst).toContain('1,3 × 0,9 m')
  })
  it('geen waarschuwing zodra lengte óf breedte is aangepast', () => {
    const p = nieuwProject({ type: 'badkamer' })
    p.afmetingen = { ...p.afmetingen, lengte: 2.4 }
    expect(standaardMatenOngewijzigd(p)).toBeNull()
    expect(metData(p).punten.some((x) => x.soort === 'maten')).toBe(false)
    p.afmetingen = { ...p.afmetingen, lengte: 2.5, breedte: 1.8 }
    expect(standaardMatenOngewijzigd(p)).toBeNull()
  })
  it('alleen de hoogte op standaard laten is geen reden voor een waarschuwing', () => {
    const p = nieuwProject({ type: 'badkamer' })
    p.afmetingen = { ...p.afmetingen, lengte: 3.1, breedte: 2.2 }
    expect(standaardMatenOngewijzigd(p)).toBeNull()
  })
  it('afrondingsruis telt als ongewijzigd, echte afwijking niet', () => {
    const p = nieuwProject({ type: 'badkamer' })
    p.afmetingen = { ...p.afmetingen, lengte: 2.5000001 }
    expect(standaardMatenOngewijzigd(p)).not.toBeNull()
    p.afmetingen = { ...p.afmetingen, lengte: 2.51 }
    expect(standaardMatenOngewijzigd(p)).toBeNull()
  })
  it('geen waarschuwing voor losse stuc-/schilderprojecten en voorbeeldprojecten', () => {
    expect(standaardMatenOngewijzigd(nieuwProject({ type: 'schilderwerk' }))).toBeNull()
    expect(standaardMatenOngewijzigd(nieuwProject({ type: 'stucwerk' }))).toBeNull()
    expect(standaardMatenOngewijzigd({ ...nieuwProject({ type: 'badkamer' }), voorbeeld: true })).toBeNull()
  })
  it('ongeldige maten crashen niet', () => {
    const p = nieuwProject({ type: 'badkamer' })
    p.afmetingen = { ...p.afmetingen, lengte: NaN }
    expect(standaardMatenOngewijzigd(p)).toBeNull()
  })
  it('alleen waarschuwen: project, maten en berekening blijven ongewijzigd; poort laat bewust doorgaan toe', () => {
    const p = nieuwProject({ type: 'badkamer' })
    const voor = JSON.stringify(p)
    const c = metData(p)
    expect(JSON.stringify(p)).toBe(voor)
    expect(c.heeftPunten).toBe(true)
    const gate = new OffertePoort(c.heeftPunten, c.sleutel); const send = vi.fn()
    gate.vraag(send); expect(send).not.toHaveBeenCalled()
    gate.bevestig(); expect(send).toHaveBeenCalledOnce()
  })
  it('nieuwe maten geven een nieuwe controleversie', () => {
    const p = nieuwProject({ type: 'badkamer' })
    const key = metData(p).sleutel
    p.afmetingen = { ...p.afmetingen, lengte: 3 }
    expect(metData(p).sleutel).not.toBe(key)
  })
})
