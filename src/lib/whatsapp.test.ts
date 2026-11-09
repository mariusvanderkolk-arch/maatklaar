import { describe, expect, it } from 'vitest'
import { offerteWhatsappTekst, whatsappTekst, whatsappUrl } from './whatsapp'

describe('whatsapp', () => {
  it('maakt een kort bericht met klant, project en link', () => {
    expect(whatsappTekst('Fam. Jansen', 'Badkamer', 'https://maatklaar.nl/#/t/abc')).toBe(
      'Hoi Fam. Jansen, hierbij de offerte voor Badkamer. Je kunt hem hier bekijken en digitaal ondertekenen: https://maatklaar.nl/#/t/abc',
    )
  })
  it('zonder klantnaam geen dubbele spatie', () => {
    expect(whatsappTekst('  ', 'Toilet', 'x')).toMatch(/^Hoi, hierbij/)
  })
  it('codeert de tekst voor wa.me', () => {
    const u = whatsappUrl('Hoi & tot ziens: https://a.b/#/t?x=1')
    expect(u.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(u.slice(20))).toBe('Hoi & tot ziens: https://a.b/#/t?x=1')
    expect(u).not.toContain('#')
  })
})

describe('offerteWhatsappTekst', () => {
  it('tekenlink: bekijken en digitaal ondertekenen, met link en bedrijfsnaam', () => {
    const t = offerteWhatsappTekst(' Jan ', 'Badkamer', 'https://x.nl/t/abc', true, 'Klusbedrijf B')
    expect(t).toContain('Hoi Jan, hierbij de offerte voor Badkamer.')
    expect(t).toContain('digitaal ondertekenen')
    expect(t).toContain('\nhttps://x.nl/t/abc\n')
    expect(t.endsWith('Groet,\nKlusbedrijf B')).toBe(true)
  })
  it('gewone link: akkoord geven; zonder klant/bedrijf nette fallback', () => {
    const t = offerteWhatsappTekst('', '', 'https://x.nl/#o', false)
    expect(t.startsWith('Hoi, hierbij de offerte voor je project.')).toBe(true)
    expect(t).toContain('akkoord geven')
    expect(t).not.toContain('Groet')
  })
  it('wa.me-link bevat nooit een telefoonnummer', () => {
    expect(whatsappUrl(offerteWhatsappTekst('A', 'B', 'https://x.nl', true)).startsWith('https://wa.me/?text=')).toBe(true)
  })
})
