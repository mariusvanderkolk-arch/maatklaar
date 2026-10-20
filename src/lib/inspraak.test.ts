import { describe, expect, it, vi } from 'vitest'
import { normaliseerSpraak, pasInspraakToe, regelParser, schoon, verwerkInspraak } from './inspraak'
import { nieuwProject } from './defaults'

describe('regelParser', () => {
  it('voorbeeldzin', () => {
    const r = regelParser('badkamer 2 bij 3 meter, tegels tot plafond, inloopdouche, toilet vervangen, container 6 kuub')
    expect(r).toMatchObject({ type: 'badkamer', lengte: 3, breedte: 2, tegelhoogte: 'plafond', container: { maat: 6 } })
    expect(r.aan).toEqual(expect.arrayContaining(['inloopdouche', 'toilet', 'sloopwerk', 'container', 'wandtegels', 'vloertegels']))
    expect(r.aan).not.toContain('bad')
  })
  it('woorden, komma, cm, hoogte, ontkenning en afvalsoort', () => {
    const r = regelParser('Toilet van 90 bij 150 cm, plafond hoogte 2,4, geen fontein, container met puin, klant Jansen')
    expect(r).toMatchObject({ type: 'toilet', lengte: 1.5, breedte: 0.9, hoogte: 2.4, container: { soort: 'puin' }, klant: 'Jansen' })
    expect(r.uit).toContain('fontein')
    expect(regelParser('keuken twee komma vijf bij vier, spatwand en spots').lengte).toBe(4)
    expect(regelParser('woonkamer 5 bij 4 laminaat met plinten').aan).toEqual(expect.arrayContaining(['legvloer', 'plinten']))
    expect(regelParser('woonkamer 5 bij 4 laminaat').type).toBe('vloer')
    expect(regelParser('badkamer met ligbad').aan).toContain('bad')
  })
})

describe('schoon (AI-uitvoer)', () => {
  it('filtert onzin', () => {
    expect(schoon({ type: 'garage', lengte: 999, aan: ['toilet', 'rm -rf'], uit: ['toilet', 'bad'], container: { maat: 7, soort: 'hout' } })).toEqual({ aan: ['toilet'], uit: ['bad'], container: { soort: 'hout' } })
  })
})

describe('verwerkInspraak', () => {
  it('gebruikt AI-resultaat als de functie werkt', async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ resultaat: { type: 'keuken', aan: ['spatwand'], uit: [] } }) }) as Response)
    expect(await verwerkInspraak('keuken', f as unknown as typeof fetch, async () => 'jwt')).toEqual({ r: { type: 'keuken', aan: ['spatwand'], uit: [] }, bron: 'ai' })
  })
  it('valt terug op regels zonder sleutel of offline', async () => {
    const z = await verwerkInspraak('toilet 1 bij 2', (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch, async () => 'jwt')
    expect(z).toMatchObject({ bron: 'regels', reden: 'geen-sleutel', r: { type: 'toilet', lengte: 2 } })
    expect((await verwerkInspraak('toilet', (async () => { throw new Error() }) as unknown as typeof fetch, async () => 'jwt')).reden).toBe('offline')
  })
})

describe('inspreken alleen ingelogd', () => {
  it('stuurt het token van de gebruiker mee', async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ resultaat: { aan: [], uit: [] } }) }) as Response)
    await verwerkInspraak('toilet', f as unknown as typeof fetch, async () => 'jwt-123')
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer jwt-123')
  })
  it('roept de server niet aan zonder login', async () => {
    const f = vi.fn()
    const z = await verwerkInspraak('toilet 1 bij 2', f as unknown as typeof fetch, async () => null)
    expect(f).not.toHaveBeenCalled()
    expect(z).toMatchObject({ bron: 'regels', reden: 'inloggen' })
  })
  it('401 van de server → inloggen', async () => {
    const z = await verwerkInspraak('toilet', (async () => ({ ok: false, status: 401, json: async () => ({}) })) as unknown as typeof fetch, async () => 'oud')
    expect(z.reden).toBe('inloggen')
  })
})

describe('pasInspraakToe', () => {
  it('zet type, maten, tegelhoogte en onderdelen', () => {
    const p = nieuwProject({ type: 'badkamer' })
    const n = pasInspraakToe(p, { type: 'toilet', lengte: 1.5, breedte: 0.9, hoogte: 2.4, tegelhoogte: 'plafond', aan: ['container', 'bad'], uit: ['fontein'], container: { maat: 3 } })
    expect(n.type).toBe('toilet')
    expect(n.afmetingen).toMatchObject({ lengte: 1.5, breedte: 0.9, hoogte: 2.4, tegelhoogte: 2.4 })
    expect(n.scope.container).toBe(true)
    expect(n.scope.bad).toBeFalsy() // past niet bij toilet
    expect(n.scope.fontein).toBe(false)
    expect(n.container).toEqual({ maat: 3 })
  })
})

describe('tegelmaten en Android-spraakfouten', () => {
  const ANDROID = 'badkamer 2 bij 3 tegels tot het plafond ongeveer 240 hoog tegels maat van de tegels worden 60 bij 60 Floor en 3060 wandtegels'
  it('normaliseert Floor en 3060', () => {
    expect(normaliseerSpraak(ANDROID)).toContain('60 bij 60 vloer en 30 bij 60 wandtegels')
    expect(normaliseerSpraak('tegels 60120 en 3030')).toBe('tegels 60 bij 120 en 30 bij 30')
    expect(normaliseerSpraak('container 6 kuub, 2024')).toBe('container 6 kuub, 2024')
  })
  it('exacte Android-zin → ruimte, hoogte en tegelmaten', () => {
    const r = regelParser(ANDROID)
    expect(r).toMatchObject({ type: 'badkamer', lengte: 3, breedte: 2, hoogte: 2.4, tegelhoogte: 'plafond', vloertegel: { lengte: 60, breedte: 60 }, wandtegel: { lengte: 60, breedte: 30 } })
    expect(r.aan).toEqual(expect.arrayContaining(['wandtegels', 'vloertegels']))
  })
  it('andere volgordes', () => {
    expect(regelParser('wandtegels 30 x 60, vloertegels 60 bij 60 cm, badkamer 2,5 bij 3')).toMatchObject({ lengte: 3, breedte: 2.5, wandtegel: { lengte: 60, breedte: 30 }, vloertegel: { lengte: 60, breedte: 60 } })
    expect(regelParser('toilet 1 bij 1,5 met tegels 30 bij 30')).toMatchObject({ lengte: 1.5, wandtegel: { lengte: 30 }, vloertegel: { lengte: 30 } })
  })
  it('tegelmaten komen in het project (en dus in de berekening)', () => {
    const n = pasInspraakToe(nieuwProject({ type: 'badkamer' }), regelParser(ANDROID))
    expect(n.wandtegel).toMatchObject({ lengte: 60, breedte: 30 })
    expect(n.vloertegel).toMatchObject({ lengte: 60, breedte: 60 })
    expect(n.afmetingen.hoogte).toBe(2.4)
    expect(n.afmetingen.tegelhoogte).toBe(2.4)
    expect(schoon({ aan: [], uit: [], wandtegel: { lengte: 600, breedte: 30 } }).wandtegel).toBeUndefined()
  })
})

describe('AI-uitslag aanvullen', () => {
  it('tegelmaten uit de notitie van Gemini komen alsnog in de velden', async () => {
    const zin = 'badkamer 2 bij 3 tegels tot het plafond ongeveer 240 hoog tegels maat van de tegels worden 60 bij 60 Floor en 3060 wandtegels'
    const ai = { aan: ['wandtegels', 'vloertegels'], uit: [], breedte: 2, hoogte: 2.4, lengte: 3, notitie: 'vloertegels 60x60, wandtegels 30x60', tegelhoogte: 'plafond', type: 'badkamer' }
    const f = (async () => ({ ok: true, status: 200, json: async () => ({ resultaat: ai }) })) as unknown as typeof fetch
    const { r, bron } = await verwerkInspraak(zin, f, async () => 'jwt')
    expect(bron).toBe('ai')
    expect(r).toMatchObject({ wandtegel: { lengte: 60, breedte: 30 }, vloertegel: { lengte: 60, breedte: 60 } })
    expect(r.notitie).toBeUndefined()
  })
})
