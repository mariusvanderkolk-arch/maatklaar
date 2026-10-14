import { describe, expect, it } from 'vitest'
import { whatsappTekst, whatsappUrl } from './whatsapp'

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
