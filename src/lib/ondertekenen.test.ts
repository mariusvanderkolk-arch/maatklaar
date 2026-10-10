import { describe, expect, it, vi } from 'vitest'
import { deelVoorOndertekening, haalTekenStatus, teken, tekenLink, TOKEN_RE } from './ondertekenen'
import { maakOfferteData } from './offerteMaken'
import { nieuwProject } from './defaults'
import { berekenAlles } from './useCalc'
import { voorbeeldPrijsBron } from './prices'
import { standaardBedrijf } from './bedrijf'

const antwoord = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }) as Response
const TOKEN = 'a'.repeat(64)

describe('ondertekenen', () => {
  it('maakt een token via RPC en valideert het', async () => {
    const f = vi.fn(async () => antwoord(200, { token: TOKEN, hash: 'h' }))
    const r = await deelVoorOndertekening({ v: 1, nr: 'O-1' } as never, f as unknown as typeof fetch)
    expect(r.ok && r.data.token).toBe(TOKEN)
    expect((f.mock.calls[0] as unknown as [string])[0]).toMatch(/rpc\/offerte_delen$/)
    expect(TOKEN_RE.test('kort')).toBe(false)
  })
  it('degradeert als de functie nog niet bestaat', async () => {
    const r = await deelVoorOndertekening({ v: 1 } as never, (async () => antwoord(404, { code: 'PGRST202', message: 'Could not find the function' })) as unknown as typeof fetch)
    expect(r).toEqual({ ok: false, fout: 'niet-beschikbaar' })
  })
  it('ongeldig token wordt niet eens opgevraagd', async () => {
    const f = vi.fn()
    expect(await haalTekenStatus('../../etc', f as unknown as typeof fetch)).toEqual({ ok: false, fout: 'niet-gevonden' })
    expect(f).not.toHaveBeenCalled()
  })
  it('leest status en valideert de momentopname', async () => {
    const p = nieuwProject({ type: 'badkamer' })
    const d = maakOfferteData(p, berekenAlles(p, voorbeeldPrijsBron), { ...standaardBedrijf(), naam: 'Bouw BV' }, (x) => x)
    const r = await haalTekenStatus(TOKEN, (async () => antwoord(200, { snapshot: d, hash: 'h', created_at: 'x', signed_at: null, signer_name: null, signature: null })) as unknown as typeof fetch)
    expect(r.ok && r.data.snapshot.nr).toBe(d.nr)
    expect(await haalTekenStatus(TOKEN, (async () => antwoord(200, null)) as unknown as typeof fetch)).toEqual({ ok: false, fout: 'niet-gevonden' })
  })
  it('tekenen: controle vooraf en foutvertaling', async () => {
    expect(await teken(TOKEN, 'A', 'data:image/png;base64,xx', 'h')).toEqual({ ok: false, fout: 'ongeldig' })
    expect(await teken(TOKEN, 'Jan', 'javascript:x', 'h')).toEqual({ ok: false, fout: 'ongeldig' })
    expect(await teken(TOKEN, 'Jan', 'data:image/png;base64,xx', 'h', (async () => antwoord(400, { message: 'al getekend' })) as unknown as typeof fetch)).toEqual({ ok: false, fout: 'al-getekend' })
    const ok = await teken(TOKEN, ' Jan ', 'data:image/png;base64,xx', 'h', (async () => antwoord(200, { signed_at: '2026-10-11T10:00:00Z', signer_name: 'Jan' })) as unknown as typeof fetch)
    expect(ok.ok).toBe(true)
  })
  it('link heeft de tekenroute', () => {
    expect(tekenLink(TOKEN, 'https://maatklaar.nl/')).toBe(`https://maatklaar.nl/#/offerte-tekenen/${TOKEN}`)
  })
})
