import { describe, expect, it } from 'vitest'
import { aftelling, LANCERING_EINDE } from './lancering'

describe('aftelling lancering', () => {
  it('eindigt op 1 januari 2027 00:00 Nederlandse tijd', () => {
    expect(LANCERING_EINDE.toISOString()).toBe('2026-12-31T23:00:00.000Z')
  })
  it('rekent dagen, uren en minuten uit', () => {
    expect(aftelling(new Date('2026-12-30T21:30:00Z'))).toEqual({ klaar: false, dagen: 1, uren: 1, minuten: 30 })
    expect(aftelling(new Date('2026-12-31T22:59:30Z'))).toEqual({ klaar: false, dagen: 0, uren: 0, minuten: 1 })
  })
  it('geeft nooit negatieve getallen na afloop', () => {
    expect(aftelling(LANCERING_EINDE)).toEqual({ klaar: true, dagen: 0, uren: 0, minuten: 0 })
    expect(aftelling(new Date('2027-03-01T12:00:00Z'))).toEqual({ klaar: true, dagen: 0, uren: 0, minuten: 0 })
  })
})
