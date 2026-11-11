import { describe, expect, it } from 'vitest'
import { afstand, beantwoord, gelijk, normaliseer, woorden, zoek, TIPS } from './matcher'
import { KENNIS, kennisVan } from './kennis'

const top = (v: string) => zoek(v, 1)[0]?.item.id

describe('normaliseren en woorden', () => {
  it('kleine letters, accenten en leestekens weg, stopwoorden eruit, synoniemen', () => {
    expect(normaliseer('Hoe máák ik een Offerte?!')).toBe('hoe maak ik een offerte')
    expect(woorden('Hoe maak ik een prijsopgave voor de wc?')).toEqual(['maak', 'offerte', 'toilet'])
  })
  it('typfouten: afstand en gelijkenis', () => {
    expect(afstand('offerte', 'oferte')).toBe(1)
    expect(afstand('factuur', 'facturu')).toBe(1) // verwisseling
    expect(gelijk('ofertte', 'offerte')).toBeGreaterThan(0.5)
    expect(gelijk('bad', 'bed')).toBe(0) // korte woorden niet fuzzy
  })
})

describe('juiste antwoord', () => {
  const gevallen: [string, string][] = [
    ['Hoe meet ik op?', 'opmeten'],
    ['hoe zet ik mijn prijzen', 'prijzen'],
    ['Hoe maak ik een offerte?', 'offerte'],
    ['3D-ontwerp', 'ontwerp'],
    ['Facturen', 'factuur'],
    ['Account & cloud', 'account'],
    ['Is het gratis?', 'gratis'],
    ['Privacy', 'privacy'],
    ['oferte naar klant sturen via whatsap', 'offerte-link'],
    ['hoe maak ik een factuurr', 'factuur'],
    ['back up maken', 'backup'],
    ['ik heb een nieuwe telefoon', 'nieuwe-telefoon'],
    ['wachtwoord vergeten', 'wachtwoord'],
    ['logo op de offerte', 'bedrijf'],
    ['hoeveel tegellijm per m2', 'rekenregels'],
    ['werkt het zonder internet', 'offline'],
    ['pdf maken', 'pdf'],
    ['gemini api key', 'ai-sleutel'],
    ['item draaien in ontwerp', 'ontwerp-bediening'],
    ['prijzen in excel', 'prijzen-export'],
    ['alle prijzen 5 procent omhoog', 'prijs-bulk'],
    ['op meerdere apparaten werken', 'cloud'],
    ['factuur betaald zetten', 'factuur-betaald'],
    ['droogtijden planning', 'planning'],
    ['hoe word ik snel klaar met een offerte?', 'snel-offerte'],
    ['waar zet ik mijn prijzen?', 'prijzen'],
  ]
  for (const [v, id] of gevallen) it(`"${v}" → ${id}`, () => expect(top(v)).toBe(id))
})

describe('beantwoord', () => {
  it('zekere vraag geeft één antwoord', () => {
    const a = beantwoord('Hoe zet ik mijn prijzen?')
    expect(a.soort).toBe('zeker')
  })
  it('onzin of buiten de app: twijfel zonder verzonnen antwoord', () => {
    expect(beantwoord('wat is de hoofdstad van peru').soort).toBe('twijfel')
    expect(beantwoord('asdkjh qwe').soort).toBe('twijfel')
    expect(beantwoord('hoe laat is het').soort).toBe('twijfel')
    const peru = beantwoord('wat is de hoofdstad van peru')
    expect(peru.soort === 'twijfel' && peru.opties.length).toBe(0)
    expect(beantwoord('').soort).toBe('twijfel')
  })
})

describe('kennisbank', () => {
  it('40-65 unieke items, alle tips bestaan, links zijn geldig', () => {
    expect(KENNIS.length).toBeGreaterThanOrEqual(40)
    expect(KENNIS.length).toBeLessThanOrEqual(65)
    expect(new Set(KENNIS.map((k) => k.id)).size).toBe(KENNIS.length)
    for (const ids of Object.values(TIPS)) for (const id of ids) expect(kennisVan(id), id).toBeTruthy()
    for (const k of KENNIS) for (const l of k.links ?? []) expect(l.pad).toMatch(/^(\/[a-z/-]*|project:(opmeten|ontwerp|berekening|inkoop|offerte|planning))$/)
  })
})

describe('AI-modus (optioneel)', async () => {
  const { maakChatVerzoek, vraagAi, systeemPrompt } = await import('./ai')
  const ai = { provider: { id: 'gemini', soort: 'gemini', naam: 'G', baseUrl: '', model: '', sleutelUrl: '', label: '', notitie: '' }, sleutel: 'k123', model: 'gemini-2.5-flash', baseUrl: 'https://x/v1beta' } as const
  it('prompt bevat de kennisbank en het scherm; sleutel alleen in header', () => {
    expect(systeemPrompt('Prijzen')).toContain('Hoe zet ik mijn prijzen?')
    const v = maakChatVerzoek(ai as never, [{ rol: 'gebruiker', tekst: 'hoi' }], 'Home')
    expect(v.url).toBe('https://x/v1beta/models/gemini-2.5-flash:generateContent')
    expect(v.init.headers['x-goog-api-key']).toBe('k123')
    expect(v.init.body).not.toContain('k123')
  })
  it('leest het antwoord en geeft Nederlandse fout bij limiet', async () => {
    const ok = (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: ' Hallo! ' }] } }] }))) as typeof fetch
    expect(await vraagAi(ai as never, [{ rol: 'gebruiker', tekst: 'hoi' }], 'Home', ok)).toBe('Hallo!')
    const limiet = (async () => new Response('RESOURCE_EXHAUSTED', { status: 429 })) as typeof fetch
    await expect(vraagAi(ai as never, [{ rol: 'gebruiker', tekst: 'hoi' }], 'Home', limiet)).rejects.toThrow(/limiet/)
  })
})

describe('contact', async () => {
  const { whatsappLink } = await import('../feedback')
  it('WhatsApp-link zonder vast nummer', () => expect(whatsappLink('a b')).toBe('https://wa.me/?text=a%20b'))
})

describe('uitleg eigen prijzen en WhatsApp-delen', () => {
  it('legt uit dat een offerte pas snel is na eigen prijzen en uurtarief', () => {
    const a = beantwoord('hoe word ik snel klaar met een offerte?')
    expect(a.soort).toBe('zeker')
    if (a.soort !== 'zeker') return
    expect(a.item.id).toBe('snel-offerte')
    expect(a.item.antwoord).toContain('Prijzen')
    expect(a.item.antwoord).toContain('inkoopprijzen')
    expect(a.item.antwoord).toContain('uurtarief')
    expect(a.item.antwoord).toContain('Offerte')
    expect(a.item.antwoord).not.toMatch(/€|\d+,\d\d/)
  })
  it('wijst "waar zet ik mijn prijzen?" naar Prijzen en noemt het uurtarief bij Offerte', () => {
    const a = beantwoord('waar zet ik mijn prijzen?')
    expect(a.soort).toBe('zeker')
    if (a.soort !== 'zeker') return
    expect(a.item.id).toBe('prijzen')
    expect(a.item.antwoord).toContain('Prijzen')
    expect(a.item.antwoord).toContain('uurtarief')
    expect(a.item.links?.some((l) => l.pad === '/prijzen')).toBe(true)
  })
  it('noemt Stuur via WhatsApp en zegt niet meer "Er is geen server"', () => {
    const a = beantwoord('Hoe stuur ik de offerte naar de klant?')
    expect(a.soort).toBe('zeker')
    if (a.soort !== 'zeker') return
    expect(a.item.id).toBe('offerte-link')
    expect(a.item.antwoord).toContain('Stuur via WhatsApp')
    expect(a.item.antwoord).toContain('Deel offerte-link')
    expect(a.item.antwoord).toContain('tekenlink')
    expect(a.item.antwoord).not.toContain('Er is geen server')
  })
})

describe('nieuwe hulpvragen', async () => {
  const { beantwoord } = await import('./matcher')
  it('contact en eigenaar worden herkend', () => {
    const c = beantwoord('hoe kan ik contact opnemen?'); expect(c.soort === 'zeker' && c.item.id).toBe('contact')
    const e = beantwoord('wie is de eigenaar?'); expect(e.soort === 'zeker' && e.item.id).toBe('eigenaar')
  })
})
