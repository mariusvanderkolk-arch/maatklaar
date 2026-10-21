import { describe, expect, it } from 'vitest'
import { berekenArbeid, berekenMaterialen } from './calc'
import { nieuwProject } from './defaults'
import { keukenVan, standaardKeuken } from './keuken'
import { scopeItems, scopeVoor } from './ruimtes'
import { VOORBEELD_PRIJZEN } from './prices'
import { CATALOGUS } from './catalogus'

const keuken = (extra = {}) => nieuwProject({ type: 'keuken', ...extra })
const ids = (p: ReturnType<typeof keuken>) => berekenMaterialen(p).map((r) => r.id)

describe('keukenwerkzaamheden', () => {
  it('nieuwe keuken heeft de keukenmontage standaard aan', () => {
    const s = scopeVoor('keuken')
    expect(s.keukenDemontage && s.keukenMontage && s.werkblad && s.uitsparingen && s.apparatuur).toBe(true)
    expect(s.perilex).toBe(false)
    expect(scopeItems('keuken').map((i) => i.key)).toEqual(expect.arrayContaining(['perilex', 'plinten', 'stucwerk', 'kitwerk', 'leidingwerk']))
  })

  it('kastlengte volgt standaard de werkbladlengte (strekkende meter)', () => {
    const p = keuken()
    expect(keukenVan(p).onderkastM).toBe(p.afmetingen.spatwand.lengte)
    expect(standaardKeuken(3.6).bovenkastM).toBe(2.2)
  })

  it('montage-uren schalen per strekkende meter', () => {
    const kort = berekenArbeid(keuken({ keuken: { ...standaardKeuken(2), bovenkastM: 0 } })).find((r) => r.scope === 'keukenMontage')!
    const lang = berekenArbeid(keuken({ keuken: { ...standaardKeuken(4), bovenkastM: 0 } })).find((r) => r.scope === 'keukenMontage')!
    expect(lang.uren - kort.uren).toBeCloseTo(3, 1)
  })

  it('laminaat werkblad: zelf zagen; steen: per meter en uitsparingen per stuk', () => {
    const lam = keuken()
    expect(ids(lam)).toContain('werkblad-laminaat')
    expect(ids(lam)).not.toContain('uitsparing-steen')
    expect(berekenArbeid(lam).some((r) => r.scope === 'uitsparingen')).toBe(true)
    const gr = keuken({ keuken: { ...standaardKeuken(3), werkblad: 'graniet' } })
    const m = berekenMaterialen(gr)
    expect(m.find((r) => r.id === 'werkblad-graniet')?.aantal).toBe(3)
    expect(m.find((r) => r.id === 'uitsparing-steen')?.aantal).toBe(2)
  })

  it('afzuigkap naar buiten geeft kernboring en muurdoorvoer, recirculatie niet', () => {
    expect(ids(keuken())).toEqual(expect.arrayContaining(['kernboring', 'afzuig-muurdoorvoer', 'vaatwasser-aansluitset']))
    expect(ids(keuken({ keuken: { ...standaardKeuken(3), afzuigBuiten: false } }))).not.toContain('kernboring')
  })

  it('perilex voegt twee groepen en kookgroepmateriaal toe', () => {
    const p = keuken()
    p.scope.perilex = true
    const m = berekenMaterialen(p)
    expect(m.find((r) => r.id === 'aardlekgroep')?.aantal).toBe(2)
    expect(m.some((r) => r.id === 'kookgroep-materiaal')).toBe(true)
  })

  it('alle nieuwe keukenartikelen hebben een richtprijs en staan in de catalogus', () => {
    for (const id of ['keuken-afvoer', 'werkblad-laminaat', 'werkblad-composiet', 'werkblad-graniet', 'uitsparing-steen', 'vaatwasser-aansluitset', 'afzuig-muurdoorvoer', 'afzuig-kanaal', 'kernboring', 'kookgroep-materiaal'] as const) {
      expect(VOORBEELD_PRIJZEN[id]).toBeGreaterThan(0)
      expect(CATALOGUS.some((c) => c.id === id)).toBe(true)
    }
  })

  it('oude keukenprojecten (zonder nieuwe werkzaamheden) blijven gelijk', () => {
    const p = keuken()
    for (const k of ['keukenDemontage', 'keukenMontage', 'werkblad', 'uitsparingen', 'apparatuur', 'perilex'] as const) p.scope[k] = false
    expect(berekenArbeid(p).some((r) => ['keukenMontage', 'werkblad', 'apparatuur'].includes(r.scope))).toBe(false)
    expect(ids(p).some((i) => String(i).startsWith('werkblad-') || i === 'kernboring')).toBe(false)
  })

  it('andere ruimtes krijgen geen keukenregels', () => {
    const b = nieuwProject({ type: 'badkamer' })
    b.scope.apparatuur = true
    expect(berekenArbeid(b).some((r) => r.scope === 'apparatuur')).toBe(false)
  })
})

describe('werkbladkeuze', () => {
  it('heeft minstens acht soorten met diktes en prijzen', async () => {
    const { WERKBLADEN, werkbladPrijs } = await import('./keuken')
    expect(WERKBLADEN.map((w) => w.id)).toEqual(['laminaat', 'hout', 'composiet', 'graniet', 'keramiek', 'rvs', 'beton', 'marmer'])
    for (const w of WERKBLADEN) {
      expect(w.diktes.length).toBeGreaterThan(0)
      expect(VOORBEELD_PRIJZEN[`werkblad-${w.id}` as never]).toBe(w.diktes[w.diktes.length - 1].prijs)
    }
    expect(werkbladPrijs({ werkblad: 'composiet', dikte: 12 }).prijs).toBe(420)
  })
  it('dunner werkblad rekent naar verhouding goedkoper', () => {
    const p = keuken({ keuken: { ...standaardKeuken(3), werkblad: 'composiet', dikte: 20 } })
    const r = berekenMaterialen(p).find((x) => x.id === 'werkblad-composiet')!
    expect(r.aantal).toBe(3)
    expect(r.prijsAantal).toBeCloseTo((3 * 450) / 520, 2)
    expect(r.spec).toContain('20 mm')
  })
})

describe('audit: aanvullingen per ruimte', () => {
  it('badkamer: voorzetwand en accessoires standaard, nis optioneel', () => {
    const b = nieuwProject({ type: 'badkamer' })
    expect(b.scope.voorzetwand && b.scope.accessoires).toBe(true)
    expect(b.scope.nis).toBe(false)
    const m = berekenMaterialen(b).map((r) => r.id)
    expect(m).toEqual(expect.arrayContaining(['metalstud', 'gipsplaat', 'toiletrolhouder', 'douchemand']))
  })
  it('toilet: voorzetwand over de breedte', () => {
    const t = nieuwProject({ type: 'toilet' })
    expect(berekenArbeid(t).some((r) => r.scope === 'voorzetwand')).toBe(true)
  })
  it('vloer: deuren inkorten met overgangsprofielen', () => {
    const v = nieuwProject({ type: 'vloer' })
    expect(berekenMaterialen(v).find((r) => r.id === 'vloer-overgang')?.aantal).toBeGreaterThan(0)
  })
})

describe('achterwand', () => {
  const met = (achterwand: string, extra = {}) => keuken({ keuken: { ...standaardKeuken(3), achterwand, ...extra } })
  it('twaalf soorten met prijs per m² in de catalogus', async () => {
    const { ACHTERWANDEN } = await import('./keuken')
    expect(ACHTERWANDEN.length).toBe(12)
    for (const a of ACHTERWANDEN) expect(VOORBEELD_PRIJZEN[`achterwand-${a.id}` as never]).toBe(a.prijs)
  })
  it('oud project zonder keuze rekent als voorheen met wandtegels', () => {
    expect(ids(keuken())).toContain('wandtegel')
  })
  it('glas: paneel op maat, uitsparingen door leverancier, geen tegellijm', () => {
    const m = berekenMaterialen(met('glas', { glasKleur: 'salie' }))
    const r = m.find((x) => x.id === 'achterwand-glas')!
    expect(r.aantal).toBeCloseTo(3 * 0.6 * 1.05, 2)
    expect(r.spec).toBe('Saliegroen')
    expect(m.find((x) => x.id === 'achterwand-uitsparing')?.aantal).toBe(3)
    expect(m.some((x) => x.id === 'wandtegel' || x.id === 'achterwand-metro')).toBe(false)
    const u = berekenArbeid(met('glas')).find((x) => x.scope === 'spatwand')!
    expect(u.omschrijving).toContain('glazen achterwand')
    expect(u.uren).toBeCloseTo(1.8 * 0.6 + 1.5, 1)
  })
  it('HPL: zelf uitsparen kost uren', () => {
    const u = berekenArbeid(met('hpl')).find((x) => x.scope === 'spatwand')!
    expect(u.uren).toBeCloseTo(1.8 * 0.6 + 1.5 + 3 * 0.3, 1)
  })
  it('metro: tegelen met eigen artikel en tegelmaat', () => {
    const r = berekenMaterialen(met('metro')).find((x) => x.id === 'achterwand-metro')!
    expect(r.spec).toContain('15')
    expect(berekenArbeid(met('metro')).find((x) => x.scope === 'spatwand')!.omschrijving).toBe('Achterwand tegelen')
  })
})
