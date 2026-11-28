import { describe, expect, it } from 'vitest'
import { leesOplevering, nieuweOplevering, opleverStand, opleverTekst, openRestpunten, puntenVoor, type Oplevering } from './oplevering'
import { nieuwProject } from './defaults'
import type { MeerwerkItem } from './meerwerk'

let n = 0
const uid = () => `id${++n}`
const hand = { naam: 'X', handtekening: 'data:image/png;base64,AA', op: '2026-11-28T10:00:00Z' }

describe('oplevering', () => {
  it('checklist komt uit de werkzaamheden van het project, zonder container', () => {
    const p = nieuwProject({ type: 'badkamer' })
    const punten = puntenVoor(p, uid)
    expect(punten.length).toBeGreaterThan(2)
    expect(punten.every((x) => x.status === 'open')).toBe(true)
    expect(punten.some((x) => /container/i.test(x.onderdeel))).toBe(false)
    const uit = puntenVoor({ ...p, scope: Object.fromEntries(Object.keys(p.scope).map((k) => [k, false])) as typeof p.scope }, uid)
    expect(uit).toEqual([])
  })
  it('getekend meerwerk komt erbij, concepten niet', () => {
    const mw = (x: Partial<MeerwerkItem>): MeerwerkItem => ({ id: 'm', nr: 1, datum: '2026-11-01', soort: 'meer', omschrijving: 'Extra stopcontact', reden: '', modus: 'bedrag', bedrag: 50, materiaal: 0, uren: 0, ...x })
    const getekend = mw({ teken: { token: 't', hash: 'h', nr: '1', code: '', gedeeldOp: 1, getekend: { naam: 'K', op: 'x', handtekening: 'data:' } } })
    const p = { ...nieuwProject({ type: 'toilet' }), meerwerk: [getekend, mw({ id: 'n', omschrijving: 'Concept' })] }
    const punten = puntenVoor(p, uid)
    expect(punten.filter((x) => x.onderdeel.startsWith('Meerwerk')).map((x) => x.onderdeel)).toEqual(['Meerwerk: Extra stopcontact'])
  })
  it('stand: bezig, klaar om te tekenen, getekend met restpunt, afgerond', () => {
    const o = nieuweOplevering(nieuwProject({ type: 'toilet' }), '2026-11-28', uid)
    expect(opleverStand(undefined)).toBe('leeg')
    expect(opleverStand(o)).toBe('bezig')
    const alles = { ...o, punten: o.punten.map((x, i) => ({ ...x, status: i === 0 ? ('restpunt' as const) : ('goed' as const), notitie: i === 0 ? 'Kitnaad bijwerken' : undefined })) }
    expect(opleverStand(alles)).toBe('klaar-om-te-tekenen')
    const ondertekend: Oplevering = { ...alles, aannemer: hand, klant: hand }
    expect(opleverStand(ondertekend)).toBe('getekend')
    expect(openRestpunten(ondertekend)).toHaveLength(1)
    const af = { ...ondertekend, punten: ondertekend.punten.map((x) => ({ ...x, afgerondOp: x.status === 'restpunt' ? '2026-12-02' : undefined })) }
    expect(opleverStand(af)).toBe('afgerond')
  })
  it('WhatsApp-tekst noemt restpunten en bevat geen telefoonnummer', () => {
    const o: Oplevering = {
      datum: '2026-11-28',
      punten: [
        { id: 'a', onderdeel: 'Wandtegels', status: 'goed' },
        { id: 'b', onderdeel: 'Kitwerk', status: 'restpunt', notitie: 'Naad bij douche opnieuw', uiterlijk: '2026-12-05' },
      ],
    }
    const t = opleverTekst({ naam: 'Badkamer Jansen', klant: 'Jansen' }, o, 'Bouwbedrijf X')
    expect(t).toMatch(/^Hoi Jansen, hierbij de oplevering van Badkamer Jansen op 28 november 2026\./)
    expect(t).toMatch(/In orde \(1\): Wandtegels\./)
    expect(t).toMatch(/- Kitwerk: Naad bij douche opnieuw \(uiterlijk 5 december 2026\)/)
    expect(t).toMatch(/Groet,\nBouwbedrijf X$/)
    expect(t).not.toMatch(/\n\n\n/)
    expect(opleverTekst({ naam: '', klant: '' }, { datum: '2026-11-28', punten: [] })).toMatch(/geen restpunten/)
  })
  it('leest kapotte data veilig in', () => {
    expect(leesOplevering(null)).toBeUndefined()
    expect(leesOplevering({ datum: 'gisteren' })).toBeUndefined()
    const o = leesOplevering({ datum: '2026-11-28', punten: [{ id: 'a', onderdeel: 'X', status: 'raar' }, { kapot: true }], klant: { naam: 'K', handtekening: 'javascript:alert(1)', op: 'x' } })
    expect(o?.punten).toEqual([{ id: 'a', onderdeel: 'X', status: 'open' }])
    expect(o?.klant).toBeUndefined()
  })
})
