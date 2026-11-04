import { describe, expect, it, vi } from 'vitest'
vi.mock('../cloud/config', () => ({ SUPABASE_URL: 'https://x', SUPABASE_KEY: 'k' }))
import { _reset, MAX_PER_SESSIE, meldHulpvraag, meldingBody } from './melding'

describe('hulp-melding', () => {
  it('anonimiseert mail en nummers', () => {
    const b = meldingBody('bel me 06 12345678 of a@b.nl', false, 'Home')
    expect(b.vraag).not.toMatch(/12345678|a@b\.nl/)
  })
  it('stuurt hoogstens MAX_PER_SESSIE meldingen', () => {
    _reset()
    const f = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch
    for (let i = 0; i < 9; i++) meldHulpvraag('vraag', false, 'Home', f, true)
    expect((f as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(MAX_PER_SESSIE)
  })
  it('doet niets als niet actief', () => {
    _reset()
    expect(meldHulpvraag('vraag', false, 'Home', vi.fn() as never, false)).toBe(false)
  })
})
