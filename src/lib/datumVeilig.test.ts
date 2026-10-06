import { describe, expect, it } from 'vitest'
import { datum, formatDatum, isoDatum, kortDatum } from './format'
import { prijsTekstVoor } from './offerteMaken'
import { plusDagen } from './planning'

const nl = (iso: string) => formatDatum({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, isoDatum(iso))

describe('datums gooien nooit', () => {
  it('ongeldige datum geeft — in plaats van een RangeError', () => {
    expect(datum(NaN)).toBe('—')
    expect(kortDatum(Number.NaN)).toBe('—')
    expect(formatDatum({ year: 'numeric' }, new Date('onzin'))).toBe('—')
  })
  it('volledige ISO-tijd (zoals bij eigen prijzen) wordt een gewone datum', () => {
    expect(nl('2026-10-06T18:03:00.000Z')).toBe('6 oktober 2026')
    expect(nl('2026-10-06')).toBe('6 oktober 2026')
  })
  it('offerte met alleen eigen prijzen crasht niet meer (regressie)', () => {
    const tekst = prijsTekstVoor({ eigen: 10, voorbeeld: 0, laatstBijgewerkt: '2026-10-06T18:03:00.000Z' } as never, nl)
    expect(tekst).toContain('6 oktober 2026')
  })
  it('plusDagen met een ongeldige datum geeft geen RangeError', () => {
    expect(() => plusDagen('onzin', 3)).not.toThrow()
    expect(plusDagen('2026-10-06', 30)).toBe('2026-11-05')
  })
})
