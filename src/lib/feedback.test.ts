import { describe, expect, it } from 'vitest'
import { feedbackIngevuld, feedbackTekst, legeFeedback, mailtoLink, whatsappLink } from './feedback'

const nu = new Date(2026, 9, 2)

describe('feedback', () => {
  it('lege feedback is niet verstuurbaar', () => {
    expect(feedbackIngevuld(legeFeedback())).toBe(false)
    expect(feedbackIngevuld({ ...legeFeedback(), cijfer: 7 })).toBe(true)
    expect(feedbackIngevuld({ ...legeFeedback(), indruk: '   ' })).toBe(false)
  })

  it('bouwt een nette tekst met alleen ingevulde velden', () => {
    const t = feedbackTekst({ indruk: 'Handig!', mist: '', gebruiken: 'ja', cijfer: 8, naam: ' Piet ' }, nu)
    expect(t).toContain('Cijfer: 8/10')
    expect(t).toContain('Zou je het gebruiken? Ja')
    expect(t).toContain('Wat vind je ervan?\nHandig!')
    expect(t).not.toContain('Wat mis je nog?')
    expect(t).toContain('Van: Piet')
    expect(t).toContain('2 oktober 2026')
  })

  it('zonder naam is de afzender anoniem', () => {
    expect(feedbackTekst({ ...legeFeedback(), cijfer: 5 }, nu)).toContain('Van: anoniem')
  })

  it('maakt WhatsApp-link naar Marius en maillink zonder ontvanger', () => {
    const w = whatsappLink('Hoi & doei\n10/10')
    expect(w.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(w.split('text=')[1])).toBe('Hoi & doei\n10/10')
    const m = mailtoLink('regel 1\nregel 2')
    expect(m.startsWith('mailto:?subject=')).toBe(true)
    expect(m).toContain('body=regel%201%0Aregel%202')
  })
})
