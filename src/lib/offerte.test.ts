import { describe, expect, it } from 'vitest'
import { compressToEncodedURIComponent } from 'lz-string'
import { voorbeeldProjecten } from './defaults'
import { compact, kamerVan, standaardAfwerking, voorstelIndeling, type Ontwerp } from './ontwerp/model'
import { akkoordBericht, codeerOfferte, decodeerOfferte, mailtoLink, waNummer, whatsappLink, type OfferteData } from './offerte'

const data = (): OfferteData => ({
  v: 1,
  nr: 'OF-2026-007',
  datum: '2026-10-01',
  geldigTot: '2026-10-31',
  bedrijf: { naam: 'Van der Kolk Renovatie', contactpersoon: 'Marius', telefoon: '06 12 34 56 78', email: 'info@voorbeeld.nl' },
  klant: 'Fam. Jansen',
  adres: 'Lindenlaan 12, Amersfoort',
  project: 'Badkamer Jansen',
  ruimte: 'Badkamer',
  maten: '2,8 × 2,2 × 2,6 m',
  werk: [['Wandtegels', 'inclusief lijm, voeg en profielen']],
  opp: [['Vloer', '6,16 m²']],
  mat: Array.from({ length: 25 }, (_, i) => [`Artikel ${i} met een redelijk lange omschrijving`, `${i + 1} × zak 25 kg`, 19.95 * (i + 1), (i % 2) as 0 | 1]),
  matTotaal: 1234.56,
  arb: [['Wandtegels zetten', 26.1]],
  tarief: 60,
  arbTotaal: 1566,
  totaal: 2800.56,
  notities: 'Matte tegels — “licht”.',
  betaaltermijn: 'Betaling binnen 14 dagen na oplevering.',
  prijsTekst: 'Materiaalprijzen zijn eigen prijzen.',
})

describe('offerte-link', () => {
  it('codeert en decodeert zonder verlies (ook met speciale tekens)', () => {
    const d = data()
    const code = codeerOfferte(d)
    expect(code).toMatch(/^[A-Za-z0-9+\-$]+$/) // geen '/', '#' of '?': veilig in de hash
    expect(decodeerOfferte(code)).toEqual(d)
  })

  it('blijft compact (past in een WhatsApp-bericht)', () => {
    expect(codeerOfferte(data()).length).toBeLessThan(3000)
  })

  it('geeft een duidelijke fout bij een kapotte of lege link', () => {
    expect(() => decodeerOfferte('')).toThrow(/onvolledig/)
    expect(() => decodeerOfferte('abc')).toThrow(/niet worden gelezen|geen geldige/)
    expect(() => decodeerOfferte(compressToEncodedURIComponent(JSON.stringify({ v: 2 })))).toThrow(/geen geldige offerte/)
  })

  it('neemt een compact ontwerp mee en blijft binnen WhatsApp-lengte', () => {
    const p = voorbeeldProjecten()[0]
    let n = 0
    const o: Ontwerp = { v: 1, items: voorstelIndeling(p, () => `i${n++}`), ...standaardAfwerking(p.type), inOfferte: true, bijgewerkt: 1 }
    const d = { ...data(), ow: compact(o, kamerVan(p)) }
    const code = codeerOfferte(d)
    expect(code.length).toBeLessThan(3600)
    expect(decodeerOfferte(code).ow).toEqual(d.ow)
    // kapot ontwerp wordt weggelaten, de offerte blijft leesbaar
    const kapot = decodeerOfferte(compressToEncodedURIComponent(JSON.stringify({ ...data(), ow: { k: 'x' } })))
    expect(kapot.ow).toBeUndefined()
    expect(kapot.nr).toBe('OF-2026-007')
  })

  it('schoont onverwachte velden en typen op', () => {
    const ruw = { ...data(), mat: [['A', '1×', 'veel', 1], 'onzin'], tarief: 'x', extra: '<script>' }
    const d = decodeerOfferte(compressToEncodedURIComponent(JSON.stringify(ruw)))
    expect(d.mat).toEqual([['A', '1×', 0, 1]])
    expect(d.tarief).toBe(0)
    expect('extra' in d).toBe(false)
  })
})

describe('akkoord', () => {
  it('WhatsApp-nummer: 06 → 316, +31 en 0031 werken', () => {
    expect(waNummer('06 12 34 56 78')).toBe('31612345678')
    expect(waNummer('+31 6-1234 5678')).toBe('31612345678')
    expect(waNummer('0031612345678')).toBe('31612345678')
  })

  it('bericht noemt offertenummer, totaal, naam en datum', () => {
    const t = akkoordBericht(data(), ' Jan Jansen ', 'Graag starten in november', '2026-10-02')
    expect(t).toContain('Beste Marius,')
    expect(t).toContain('offerte OF-2026-007 (Badkamer Jansen)')
    expect(t).toMatch(/€\s?2\.800,56/)
    expect(t).toContain('Naam: Jan Jansen')
    expect(t).toContain('Datum akkoord: 2 oktober 2026')
    expect(t).toContain('Opmerking: Graag starten in november')
  })

  it('links voor WhatsApp en e-mail zijn correct gecodeerd', () => {
    expect(whatsappLink('06 12345678', 'Akkoord & dank')).toBe('https://wa.me/31612345678?text=Akkoord%20%26%20dank')
    expect(whatsappLink('', 'x')).toBe('https://wa.me/?text=x')
    expect(mailtoLink('info@voorbeeld.nl', 'Akkoord offerte', 'a\nb')).toBe('mailto:info@voorbeeld.nl?subject=Akkoord%20offerte&body=a%0Ab')
  })
})

describe('marge in de offerte', async () => {
  const { maakOfferteData } = await import('./offerteMaken')
  const { berekenAlles } = await import('./useCalc')
  const { voorbeeldPrijsBron } = await import('./prices')
  const { standaardBedrijf } = await import('./bedrijf')
  it('verwerkt marge in de materiaalprijzen, niet als aparte regel', () => {
    const p = voorbeeldProjecten()[0]
    const b = berekenAlles(p, voorbeeldPrijsBron, [])
    const zonder = maakOfferteData(p, b, standaardBedrijf(), (x) => x)
    const met = maakOfferteData({ ...p, marge: 10 }, b, standaardBedrijf(), (x) => x)
    expect(met.matTotaal).toBeCloseTo(zonder.matTotaal * 1.1, 0)
    expect(met.mat[0][2]).toBeCloseTo(zonder.mat[0][2] * 1.1, 1)
    expect(JSON.stringify(met)).not.toMatch(/marge/i)
    expect(met.totaal - zonder.totaal).toBeCloseTo((met.matTotaal - zonder.matTotaal) * (1 + (p.onvoorzien ?? 0) / 100), 0)
  })
})
