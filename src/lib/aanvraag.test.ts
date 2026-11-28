import { describe, expect, it } from 'vitest'
import { aanvraagLink, aanvraagTekst, aanvraagUitHash, aanvraagWaUrl, codeerAanvraag, leesAanvraag, leesProfiel, projectVanAanvraagLink, projectVelden, waNummer, type Aanvraag } from './aanvraag'

const a = (x: Partial<Aanvraag> = {}): Aanvraag => ({ type: 'badkamer', keuzes: ['Inloopdouche', 'Hangtoilet'], m2: '6', wanneer: 'Binnen 3 maanden', plaats: 'Dorpsstraat 1, Zwolle', wensen: 'Graag lichte tegels', naam: 'Petra de Vries', telefoon: '06 12345678', ...x })

describe('aanvraaglink', () => {
  it('telefoonnummer naar wa.me-formaat', () => {
    expect(waNummer('06-12345678')).toBe('31612345678')
    expect(waNummer('+31 6 1234 5678')).toBe('31612345678')
    expect(waNummer('+31 (0)6 12345678')).toBe('31612345678')
    expect(waNummer('0031612345678')).toBe('31612345678')
    expect(waNummer('+32 470 12 34 56')).toBe('32470123456')
    expect(waNummer('12345')).toBeNull()
    expect(waNummer('')).toBeNull()
  })
  it('profiel reist veilig in de link', () => {
    const link = aanvraagLink({ n: 'Bouwbedrijf Jansen', t: '31612345678' }, 'https://maatklaar.nl/')
    expect(link.startsWith('https://maatklaar.nl/#/aanvraag/')).toBe(true)
    const code = link.split('#/aanvraag/')[1]
    expect(leesProfiel(code)).toEqual({ n: 'Bouwbedrijf Jansen', t: '31612345678' })
    expect(leesProfiel('rommel')).toBeNull()
  })
  it('aanvraag heen en terug, onbekende keuzes en type worden genegeerd', () => {
    expect(leesAanvraag(codeerAanvraag(a()))).toEqual(a())
    const raar = leesAanvraag(codeerAanvraag({ ...a(), type: 'zwembad' as never, keuzes: ['<script>'] }))
    expect(raar?.type).toBe('anders')
    expect(raar?.keuzes).toEqual([])
    expect(leesAanvraag('x')).toBeNull()
  })
  it('bericht aan de aannemer met projectlink en zonder lege dubbele regels', () => {
    const link = projectVanAanvraagLink(a(), 'https://maatklaar.nl/')
    const t = aanvraagTekst(a(), 'Bouwbedrijf Jansen', link)
    expect(t).toMatch(/^Hoi Bouwbedrijf Jansen, ik heb een aanvraag/)
    expect(t).toMatch(/Klus: Badkamer\nWat erbij hoort: Inloopdouche, Hangtoilet\nVloeroppervlak badkamer: 6 m²/)
    expect(t).toMatch(/Naam: Petra de Vries/)
    expect(t).toContain(link)
    expect(t).not.toMatch(/\n\n\n/)
    expect(aanvraagWaUrl('31612345678', 'hoi')).toBe('https://wa.me/31612345678?text=hoi')
    expect(aanvraagTekst(a({ type: 'keuken', keuzes: [], m2: '3,2' }), '', 'x')).toMatch(/Lengte keukenblok: 3,2 m\n/)
  })
  it('projectlink vult een nieuw project', () => {
    const hash = projectVanAanvraagLink(a(), 'https://maatklaar.nl/').split('maatklaar.nl/')[1]
    const terug = aanvraagUitHash(hash)
    expect(terug).toEqual(a())
    const v = projectVelden(terug!)
    expect(v).toMatchObject({ type: 'badkamer', klant: 'Petra de Vries', adres: 'Dorpsstraat 1, Zwolle', naam: 'Badkamer Vries' })
    expect(v.aanvraag.tekst).toMatch(/Telefoon klant: 06 12345678/)
    expect(v.aanvraag.tekst).toMatch(/^Soort klus: Badkamer/)
    expect(v.aanvraag.tekst).toMatch(/Omvang: 6 m²/)
    expect(aanvraagUitHash('#/nieuw')).toBeNull()
  })
})
