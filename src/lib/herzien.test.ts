import { describe, expect, it } from 'vitest'
import { codeerOfferte, decodeerOfferte, leesOfferte, metVorige, type OfferteData } from './offerte'
import { herziening } from './herzien'

const basis: OfferteData = {
  v: 1, nr: 'OFF-1', datum: '2026-10-01', geldigTot: '2026-10-31', bedrijf: { naam: 'Test BV' }, klant: 'K', adres: '', project: 'Badkamer', ruimte: 'badkamer', maten: '',
  werk: [], opp: [], mat: [['Tegels · 60x60', '10 m²', 400, 0], ['Kit', '2 st', 20, 0], ['Voegmiddel', '3 zakken', 30, 0]], matTotaal: 450,
  arb: [['Tegelen', 10]], tarief: 50, arbTotaal: 500, totaal: 950, notities: '', betaaltermijn: '', prijsTekst: '',
}

describe('herziene offerte', () => {
  it('markeert nieuw, gewijzigd en vervallen per regel', () => {
    const nieuw: OfferteData = { ...basis, mat: [['Tegels · 60x60', '12 m²', 480, 0], ['Kit', '2 st', 20, 0], ['Montagebox', '1 st', 15, 0]], matTotaal: 515, arb: [['Tegelen', 12]], arbTotaal: 600, totaal: 1115 }
    const d = metVorige(nieuw, codeerOfferte(basis))
    const h = herziening(leesOfferte(JSON.parse(JSON.stringify(d))))!
    expect(h.mat.map((m) => m.soort)).toEqual(['gewijzigd', 'gelijk', 'nieuw'])
    expect(h.mat[0].was).toEqual({ aantal: '10 m²', bedrag: 400 })
    expect(h.matWeg.map((m) => m[0])).toEqual(['Voegmiddel'])
    expect(h.arb[0]).toEqual({ soort: 'gewijzigd', wasUren: 10 })
    expect(h.verschil).toBe(165)
  })
  it('geen vergelijking bij gelijke versie of ongeldige code', () => {
    expect(metVorige(basis, codeerOfferte(basis)).vorige).toBeUndefined()
    expect(metVorige(basis, 'onzin').vorige).toBeUndefined()
    expect(herziening(basis)).toBeNull()
  })
  it('vorige gaat mee door de link (round-trip)', () => {
    const d = metVorige({ ...basis, totaal: 1000 }, codeerOfferte(basis))
    expect(decodeerOfferte(codeerOfferte(d)).vorige?.totaal).toBe(950)
  })
})
