import { describe, expect, it } from 'vitest'
import { isAndroid, plakVast, transcriptUit, type SpraakResultaat } from './spraak'

const r = (transcript: string, isFinal = true): SpraakResultaat => Object.assign([{ transcript }], { isFinal })

describe('desktop (incrementeel)', () => {
  it('voegt losse finals samen, met lopende tussentekst', () => {
    expect(transcriptUit([r('badkamer 2 bij 3 meter'), r(' tegels tot plafond'), r(' inloop', false)])).toEqual({ definitief: 'badkamer 2 bij 3 meter tegels tot plafond', tussen: 'inloop' })
  })
  it('elke onresult opnieuw opbouwen geeft geen dubbelingen', () => {
    const events = [[r('badkamer', false)], [r('badkamer 2 bij 3')], [r('badkamer 2 bij 3'), r(' inloopdouche', false)], [r('badkamer 2 bij 3'), r(' inloopdouche')]]
    const laatste = events.map((e) => transcriptUit(e)).at(-1)!
    expect(laatste.definitief).toBe('badkamer 2 bij 3 inloopdouche')
  })
})

describe('Android (cumulatief)', () => {
  it('cumulatieve finals worden niet herhaald', () => {
    const res = [r('badkamer'), r('badkamer 2 bij 3'), r('badkamer 2 bij 3 meter tegels tot plafond')]
    expect(transcriptUit(res).definitief).toBe('badkamer 2 bij 3 meter tegels tot plafond')
  })
  it('herhaalde identieke finals en tussentekst met het definitieve begin', () => {
    const res = [r('toilet vervangen'), r('toilet vervangen'), r('toilet vervangen container 6 kuub', false)]
    expect(transcriptUit(res)).toEqual({ definitief: 'toilet vervangen', tussen: 'container 6 kuub' })
  })
  it('herstart-sessies (onend) plakken zonder dubbel', () => {
    let vast = ''
    for (const sessie of ['badkamer 2 bij 3 meter', 'badkamer 2 bij 3 meter tegels tot plafond', 'inloopdouche', 'inloopdouche']) vast = plakVast(vast, sessie)
    expect(vast).toBe('badkamer 2 bij 3 meter tegels tot plafond inloopdouche')
  })
  it('overlap aan de randen wordt één keer opgenomen', () => {
    expect(plakVast('tegels tot plafond', 'plafond inloopdouche')).toBe('tegels tot plafond inloopdouche')
    expect(plakVast('Badkamer', 'badkamer 2 bij 3')).toBe('badkamer 2 bij 3')
  })
  it('herkent Android', () => {
    expect(isAndroid('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129')).toBe(true)
    expect(isAndroid('Mozilla/5.0 (Windows NT 10.0) Chrome/129')).toBe(false)
  })
})

describe('geen onterecht wegvallen', () => {
  it('kort woord dat al ergens in de tekst voorkomt blijft staan', () => {
    expect(plakVast('inloopdouche en toilet', 'douche')).toBe('inloopdouche en toilet douche')
  })
})
