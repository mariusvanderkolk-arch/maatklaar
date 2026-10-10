import { describe, expect, it, vi } from 'vitest'
import { opslag } from './veiligeOpslag'
import { sleutel } from './modus'
import { _resetCache, haalReviews, maakRij, reviewStatus, samenvatting, verstuurReview, type Review } from './reviews'

const res = (status: number, body: unknown = null) => ({ ok: status < 300, status, json: async () => body }) as Response

describe('reviews', () => {
  it('valideert invoer', () => {
    expect(maakRij({ stars: 0, text: '', consent: false })).toBe('Kies 1 tot 5 sterren.')
    expect(maakRij({ stars: 5, text: 'x'.repeat(301), consent: false })).toMatch(/300/)
    expect(maakRij({ stars: 4, text: ' Top ', name: '  ', company: 'Bouw BV', consent: true })).toEqual({ site: 'main', stars: 4, text: 'Top', name: null, company: 'Bouw BV', consent: true })
  })
  it('versturen: ok, ontbrekende tabel en netwerkfout', async () => {
    const f = vi.fn(async () => res(201))
    expect(await verstuurReview({ stars: 5, text: 'Goed', consent: true }, f as unknown as typeof fetch)).toBe('ok')
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).not.toHaveProperty('approved')
    expect(await verstuurReview({ stars: 5, text: '', consent: false }, (async () => res(404)) as unknown as typeof fetch)).toBe('geen-tabel')
    expect(await verstuurReview({ stars: 5, text: '', consent: false }, (async () => { throw new Error('x') }) as unknown as typeof fetch)).toBe('fout')
  })
  it('ophalen faalt stil', async () => {
    _resetCache()
    expect(await haalReviews((async () => res(404)) as unknown as typeof fetch)).toEqual([])
  })
  it('samenvatting: null zonder reviews, anders gemiddelde en max 3 citaten', () => {
    expect(samenvatting([])).toBeNull()
    const r = (id: number, stars: number, text: string): Review => ({ id, stars, text, created_at: `2026-10-0${id}`, name: null, company: null })
    const s = samenvatting([r(1, 5, 'Heel handig voor offertes'), r(2, 4, 'Prima app, snel'), r(3, 3, 'ok'), r(4, 4, 'Scheelt mij uren werk')])!
    expect(s.gemiddelde).toBe(4)
    expect(s.quotes).toHaveLength(3)
    expect(s.quotes[0].stars).toBe(5)
  })
  it('vraagt pas na een paar offertes en niet meer na versturen', () => {
    opslag.removeItem(sleutel('review'))
    expect(reviewStatus.moetVragen()).toBe(false)
    reviewStatus.telOfferte(); reviewStatus.telOfferte(); reviewStatus.telOfferte()
    expect(reviewStatus.moetVragen()).toBe(true)
    reviewStatus.later(1000)
    expect(reviewStatus.moetVragen(2000)).toBe(false)
    reviewStatus.zetVerstuurd()
    expect(reviewStatus.moetVragen(Date.now() + 99e9)).toBe(false)
  })
})
