import { describe, expect, it } from 'vitest'
import { aannamesVoor, maakOfferteData, SANITAIR_KLANT_TEKST } from './offerteMaken'
import { nieuwProject } from './defaults'
import { berekenAlles } from './useCalc'
import { voorbeeldPrijsBron } from './prices'
import { standaardBedrijf } from './bedrijf'

describe('sanitair door de klant geleverd', () => {
  const basis = nieuwProject({ type: 'badkamer' })
  basis.scope = { ...basis.scope, toilet: true, wastafelmeubel: true, inloopdouche: true }

  it('haalt sanitairregels uit materiaal, laat arbeid staan', () => {
    const met = berekenAlles(basis, voorbeeldPrijsBron, [])
    const zonder = berekenAlles({ ...basis, sanitairDoorKlant: true }, voorbeeldPrijsBron, [])
    expect(met.materialen.some((r) => r.groep === 'sanitair')).toBe(true)
    expect(zonder.materialen.some((r) => r.groep === 'sanitair')).toBe(false)
    expect(zonder.inkoop.totaal).toBeLessThan(met.inkoop.totaal)
    expect(zonder.uren).toBe(met.uren)
  })

  it('zet de regel bij de aannames op de offerte', () => {
    expect(aannamesVoor({ aannames: 'Vloer vlak', sanitairDoorKlant: true })).toBe(`${SANITAIR_KLANT_TEKST}\nVloer vlak`)
    expect(aannamesVoor({ aannames: ' ', sanitairDoorKlant: false })).toBe('')
    const p = { ...basis, sanitairDoorKlant: true }
    const d = maakOfferteData(p, berekenAlles(p, voorbeeldPrijsBron, []), { ...standaardBedrijf(), naam: 'Bouw BV' }, (x) => x)
    expect(d.aannames).toContain('door de klant geleverd')
  })
})
