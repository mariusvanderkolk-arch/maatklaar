import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { nieuwProject, normaliseerProject } from './defaults'
import { afwerkingVan, nieuwVlak, vlakBtw, afwerkRegelBtw, type AfwerkVlak } from './afwerking'
import { berekenAlles } from './useCalc'
import { berekenArbeid, berekenMaterialen } from './calc'
import { voorbeeldPrijsBron } from './prices'
import { standaardBedrijf } from './bedrijf'
import { maakOfferteData } from './offerteMaken'
import { codeerOfferte, decodeerOfferte, leesOfferte, offerteBtwTekst } from './offerte'
import { btwOverzicht, maakFactuur, maakTermijnen } from './factuur'
import { nieuweSchilderKamer, schilderKamers, schilderM2, KLEUR_SELECTIE, KLEUR_DISCLAIMER, leesKleur } from './schilderplan'
import { AfwerkingForm } from '../components/AfwerkingForm'
import { OfferteDocument } from '../components/OfferteDocument'
import { Plattegrond } from '../components/Plattegrond'
import { kamerVan, compact, leegOntwerp, uitCompact } from './ontwerp/model'
import type { Project, ProjectType } from './types'
const quote = (p: Project) => maakOfferteData(p, berekenAlles(p, voorbeeldPrijsBron, []), standaardBedrijf(), (s) => s)
const invoice = (p: Project) => maakFactuur(quote(p), { id: 'test', nummer: 'TEST', projectId: p.id, datum: '2026-11-07', betaalDagen: 14, nu: 1, uid: () => Math.random().toString() })
const maak = (type: ProjectType = 'stucwerk') => nieuwProject({ type, onvoorzien: 0, afwerking: { woning: true, ouderDan2: true, locatie: 'binnen', vlakken: [nieuwVlak(type === 'stucwerk', 'wand', 'a', 10)] } })

describe('aparte Stucwerk en Schilderwerk projecten', () => {
  it.each(['stucwerk', 'schilderwerk'] as const)('%s roundtrip behoudt type, instellingen en eigen normen', (type) => {
    const p = maak(type), terug = normaliseerProject(JSON.parse(JSON.stringify(p)))
    expect(terug.type).toBe(type)
    expect(afwerkingVan(terug)).toEqual(afwerkingVan(p))
    expect(terug.aannames).not.toContain('Niet inbegrepen: schilderwerk')
    expect(quote(p).ruimte).toBe(type === 'stucwerk' ? 'Stucwerk' : 'Schilderwerk')
  })
  it('behoudt legacy projecttype, defaults en offertes zonder nieuwe metadata', () => {
    expect(normaliseerProject({ id: 'old' }).type).toBe('badkamer')
    const d = quote(nieuwProject())
    expect(d.tarieven).toBeUndefined()
    expect(offerteBtwTekst(d)).toBe('incl. 21% btw')
    expect(invoice(nieuwProject()).regels.every((r) => r.btw === 21)).toBe(true)
  })
  it('stuc rekent dikte en verbruik; nooit automatisch schilderen', () => {
    const p = maak()
    expect(berekenMaterialen(p).map((r) => r.id)).toEqual(['primer', 'pleister'])
    expect(berekenMaterialen(p)[1].nodig).toBe(24)
    expect(berekenMaterialen(p)[1].aantal).toBe(2)
    expect(berekenArbeid(p)[0].uren).toBe(6)
    p.afwerking!.vlakken[0].dikte = 5
    expect(berekenMaterialen(p)[1].nodig).toBe(60)
  })
  it('schilderwerk rekent lagen en productverbruik en geen pleister', () => {
    const p = maak('schilderwerk')
    expect(berekenMaterialen(p).map((r) => r.id)).toEqual(['primer', 'verf'])
    expect(berekenMaterialen(p)[1].nodig).toBe(2)
    p.afwerking!.vlakken[0].lagen = 3
    expect(berekenMaterialen(p)[1].nodig).toBe(3)
    expect(berekenArbeid(p)[0].uren).toBe(3)
  })
  it('respecteert uitgevinkte werkzaamheden', () => {
    const p = maak(); p.scope.stucwerk = false
    expect(berekenMaterialen(p)).toEqual([]); expect(berekenArbeid(p)).toEqual([])
  })
  it('eigen product, verpakking en prijs zijn per vlak instelbaar, ook gratis materiaal', () => {
    const p = maak('schilderwerk'); const v = p.afwerking!.vlakken[0]
    v.verpakking = 1; v.product = 'TEST eigen lak'; v.eigenPrijs = true; v.prijs = 17
    const b = berekenAlles(p, voorbeeldPrijsBron, [])
    expect(b.inkoop.regels[1]).toMatchObject({ koopAantal: 2, prijs: 17, totaal: 34, bron: 'eigen' })
    expect(quote(p).mat[1][0]).toContain('TEST eigen lak')
    v.prijs = 0
    expect(berekenAlles(p, voorbeeldPrijsBron, []).inkoop.regels[1].totaal).toBe(0)
    expect(afwerkingVan(normaliseerProject(JSON.parse(JSON.stringify(p)))).vlakken[0].eigenPrijs).toBe(true)
  })
  it('beschadigde vlakgegevens en negatieve normen blijven veilig', () => {
    const p = maak(); p.schilderPlan = { kamers: [nieuweSchilderKamer('k')] }; p.type = 'schilderwerk'
    p.afwerking!.vlakken = [null, { m2: -1 }] as unknown as AfwerkVlak[]
    expect(() => afwerkingVan(p)).not.toThrow()
    const q = maak(); q.afwerking!.vlakken[0].m2 = -100
    expect(berekenMaterialen(q)).toEqual([])
  })
  it('0 m² geeft geen verpakkingen, materiaal of uren', () => {
    const p = maak(); p.afwerking!.vlakken[0].m2 = 0
    expect(berekenMaterialen(p)).toEqual([]); expect(berekenArbeid(p)).toEqual([])
  })
})
describe('btw veilig en per regel', () => {
  it.each([[false, false, 21], [true, false, 21], [false, true, 21], [true, true, 9]] as const)('woning %s ouder %s = %s op arbeid én materiaal', (woning, ouderDan2, tarief) => {
    for (const type of ['stucwerk', 'schilderwerk'] as const) {
      const p = maak(type); p.afwerking!.woning = woning; p.afwerking!.ouderDan2 = ouderDan2
      const s = afwerkingVan(p)
      expect(vlakBtw(s, s.vlakken[0])).toBe(tarief)
      const d = quote(p)
      expect(d.tarieven?.mat.every((n) => n === tarief)).toBe(true)
      expect(d.tarieven?.arb).toEqual([tarief])
    }
  })
  it('nieuwe projecten starten zonder onbevestigde 9% aannames', () => {
    expect(afwerkingVan(nieuwProject({ type: 'stucwerk' })).woning).toBe(false)
    expect(quote(nieuwProject({ type: 'stucwerk' })).tarieven?.mat.every((r) => r === 21)).toBe(true)
  })
  it('mixed werk en handmatige 21%-correctie blijven in link, preview en factuur', () => {
    const p = maak(); p.afwerking!.vlakken.push({ ...nieuwVlak(true, 'wand', 'b', 3), btw: '21' }, nieuwVlak(true, 'overig', 'c', 2)); p.onvoorzien = 5
    const d = decodeerOfferte(codeerOfferte(quote(p)))
    expect(d.tarieven?.mat).toEqual([9, 9, 21, 21]); expect(d.tarieven?.arb).toEqual([9, 21, 21])
    expect(offerteBtwTekst(d)).toContain('9% en 21%')
    const f = invoice(p), o = btwOverzicht(f.regels)
    expect(f.regels.filter((r) => r.btw === 9).length).toBe(4)
    expect(f.regels.at(-1)?.btw).toBe(21)
    expect(Math.abs(o.totaalIncl - d.totaal)).toBeLessThanOrEqual(.03)
    const terms = maakTermijnen(f, [30, 70], ['T1', 'T2'], () => Math.random().toString())
    expect(terms.every((t) => t.regels.some((r) => r.btw === 9) && t.regels.some((r) => r.btw === 21))).toBe(true)
    expect(afwerkRegelBtw(p, 'extra-onbekend')).toBe(21)
  })
  it('onvoorzien volgt bij kwalificerend werk ook 9% en blijft behouden in offerte-link', () => {
    const p = maak(); p.onvoorzien = 5
    const d = decodeerOfferte(codeerOfferte(quote(p)))
    expect(d.tarieven?.onv).toEqual([[9, d.onv![1]]])
    expect(invoice(p).regels.every((r) => r.btw === 9)).toBe(true)
    expect(offerteBtwTekst(d)).toBe('incl. 9% btw')
  })
  it('tariefmetadata blijft uitgelijnd als ongeldige materiaalregels worden weggefilterd', () => {
    const d = quote(maak())
    const terug = leesOfferte({ ...d, mat: [null, ...d.mat], tarieven: { mat: [21, 9, 21], arb: [9], onv: [[9, 9999]] } })
    expect(terug.tarieven?.mat).toEqual([9, 21])
    expect(terug.tarieven?.onv).toBeUndefined()
  })
  it('slechte tariefmetadata valt terug op 21%', () => {
    const d = quote(maak())
    expect(leesOfferte({ ...d, tarieven: { mat: ['9', 0], arb: [8] } }).tarieven).toEqual({ mat: [21, 21], arb: [21] })
    expect(leesOfferte({ ...d, tarieven: [] }).tarieven?.mat).toEqual([21, 21])
  })
})
describe('schilderplattegrond en kleuren', () => {
  const planProject = () => { const p = maak('schilderwerk'); p.schilderPlan = { kamers: [nieuweSchilderKamer('k', 'TEST ruimte', 4, 3, 2.5)] }; return p }
  it('netto per-wand m² en plafond vervangen handmatige wanden zonder dubbeltelling', () => {
    const p = planProject(), k = p.schilderPlan!.kamers[0]
    k.wanden[0].aftrek = 2; k.wanden[1].schilderen = false
    const vlakken = afwerkingVan(p).vlakken
    expect(vlakken).toHaveLength(4)
    expect(vlakken.map((v) => v.m2)).toEqual([8, 10, 7.5, 12])
    expect(vlakken.reduce((s, v) => s + v.m2, 0)).toBe(37.5)
    expect(schilderM2(k, { ...k.wanden[0], aftrek: 100 })).toBe(0)
    p.schilderPlan!.kamers.push(nieuweSchilderKamer('k2', 'TEST 2', 2, 2, 2))
    expect(afwerkingVan(p).vlakken).toHaveLength(9)
  })
  it('per-wand fan/code en illustratiekleur blijven bij opslaan en wijzigen van maten', () => {
    const p = planProject(); p.schilderPlan!.kamers[0].wanden[0].kleur = KLEUR_SELECTIE[0]
    const terug = normaliseerProject(JSON.parse(JSON.stringify(p)))
    expect(schilderKamers(terug)[0].wanden[0].kleur).toEqual(KLEUR_SELECTIE[0])
    terug.schilderPlan!.kamers[0].lengte = 5
    expect(afwerkingVan(terug).vlakken[0].m2).toBe(12.5)
    expect(afwerkingVan(terug).vlakken[0].kleur).toContain('RAL 9010')
  })
  it('materiaal, uren en klantquote/PDF tonen kleurcode en goedgekeurde disclaimer', () => {
    const p = planProject(); p.schilderPlan!.kamers[0].wanden[0].kleur = KLEUR_SELECTIE[0]
    const d = decodeerOfferte(codeerOfferte(quote(p)))
    expect(d.werk[0][1]).toContain('RAL 9010'); expect(d.aannames).toContain(KLEUR_DISCLAIMER)
    expect(d.mat[0][0]).toContain('RAL 9010'); expect(d.arb[0][0]).toContain('RAL 9010')
    const html = renderToStaticMarkup(createElement(OfferteDocument, { d }))
    expect(html).toContain('RAL 9010'); expect(html).toContain(KLEUR_DISCLAIMER); expect(html).toContain('incl. 9% btw')
    const ui = renderToStaticMarkup(createElement(AfwerkingForm, { p }))
    expect(ui).toContain(KLEUR_DISCLAIMER); expect(ui).toContain('Wand A'); expect(ui).toContain('Sikkens'); expect(ui).toContain('geen volledige waaier')
  })
  it('wijzigen afwerking/uren per planvlak behoudt geometrie en geen dubbele regels', () => {
    const p = planProject(); p.afwerking = { ...afwerkingVan(p), vlakken: afwerkingVan(p).vlakken.map((v) => ({ ...v, urenPerM2: 1 })) }
    p.schilderPlan!.kamers[0].lengte = 5
    expect(afwerkingVan(p).vlakken).toHaveLength(5)
    expect(berekenArbeid(p)[0].uren).toBe(12.5)
  })
  it('veilige kleurwaarden, eigen codes en ontbrekende plannen', () => {
    expect(leesKleur({ hex: 'url(javascript:alert(1))' }).hex).toBe('#dedbd5')
    expect(schilderKamers(nieuwProject())).toEqual([])
    expect(leesKleur({ waaier: 'flexa', code: 'Eigen waaiercode', naam: 'Mijn gekozen kleur', hex: '#123456' }).code).toBe('Eigen waaiercode')
    const old = nieuwProject(); const html = renderToStaticMarkup(createElement(Plattegrond, { afmetingen: old.afmetingen, scope: old.scope }))
    expect(html).toContain('Plattegrond'); expect(html).not.toContain('RAL 9010')
  })
  it('ontwerp compact ondersteunt nieuwe types zonder oude plannen te wijzigen', () => {
    for (const type of ['badkamer', 'stucwerk', 'schilderwerk'] as const) {
      const p = nieuwProject({ type }); const k = kamerVan(p)
      expect(uitCompact(compact(leegOntwerp(type), k))?.kamer.type).toBe(type)
    }
  })
})
