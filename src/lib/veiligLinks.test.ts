import { describe, expect, it, vi } from 'vitest'
import { deelVoorOndertekening, haalTekenStatus, trekLinkIn, FOUT_TEKST } from './ondertekenen'
import { opvolgstatus, herinneringNodig, teControleren } from './opvolging'
import type { Project } from './types'

const antwoord = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }) as Response
const TOKEN = 'b'.repeat(64)
const kop = (f: ReturnType<typeof vi.fn>) => ((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>).authorization

describe('eigenaar-gebonden links', () => {
  it('delen zonder account: anon-sleutel, eigenaarsgeheim komt terug', async () => {
    const f = vi.fn(async () => antwoord(200, { token: TOKEN, hash: 'h', owner_secret: 's'.repeat(48) }))
    const r = await deelVoorOndertekening({ v: 1 } as never, f as unknown as typeof fetch)
    expect(r.ok && r.data.owner_secret).toBe('s'.repeat(48))
    expect(kop(f)).not.toContain('jwt-x')
  })
  it('delen ingelogd: met de JWT van de gebruiker', async () => {
    const f = vi.fn(async () => antwoord(200, { token: TOKEN, hash: 'h' }))
    await deelVoorOndertekening({ v: 1 } as never, f as unknown as typeof fetch, 'jwt-x')
    expect(kop(f)).toBe('Bearer jwt-x')
  })
  it('oude server zonder owner_secret blijft werken', async () => {
    const r = await deelVoorOndertekening({ v: 1 } as never, (async () => antwoord(200, { token: TOKEN, hash: 'h' })) as unknown as typeof fetch)
    expect(r.ok).toBe(true)
  })
  it('intrekken stuurt token + geheim', async () => {
    const f = vi.fn(async () => antwoord(200, { revoked_at: '2026-10-20T01:00:00Z' }))
    const r = await trekLinkIn(TOKEN, 'g'.repeat(48), f as unknown as typeof fetch)
    expect(r.ok).toBe(true)
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/rpc\/offerte_intrekken$/)
    expect(JSON.parse(init.body as string)).toEqual({ p_token: TOKEN, p_geheim: 'g'.repeat(48) })
  })
  it('intrekken: fouten vertaald, SQL nog niet gedraaid = niet-beschikbaar', async () => {
    expect(await trekLinkIn(TOKEN, undefined, (async () => antwoord(400, { message: 'niet gevonden of geen eigenaar' })) as unknown as typeof fetch)).toEqual({ ok: false, fout: 'geen-eigenaar' })
    expect(await trekLinkIn(TOKEN, undefined, (async () => antwoord(400, { message: 'al getekend' })) as unknown as typeof fetch)).toEqual({ ok: false, fout: 'al-getekend' })
    expect(await trekLinkIn(TOKEN, undefined, (async () => antwoord(404, { code: 'PGRST202', message: 'Could not find the function' })) as unknown as typeof fetch)).toEqual({ ok: false, fout: 'niet-beschikbaar' })
    const f = vi.fn()
    expect((await trekLinkIn('kort', 'x', f as unknown as typeof fetch)).ok).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })
  it('ingetrokken link: klant krijgt vriendelijke melding, geen offerte', async () => {
    expect(await haalTekenStatus(TOKEN, (async () => antwoord(200, { revoked: true, revoked_at: 'x' })) as unknown as typeof fetch)).toEqual({ ok: false, fout: 'ingetrokken' })
    expect(FOUT_TEKST.ingetrokken).toMatch(/ingetrokken/)
    expect(await haalTekenStatus(TOKEN, (async () => antwoord(400, { message: 'ingetrokken' })) as unknown as typeof fetch)).toEqual({ ok: false, fout: 'ingetrokken' })
  })
  it('opvolging: ingetrokken = eigen status, geen herinnering, niet meer controleren', () => {
    const p = { offerte: { teken: { token: TOKEN, hash: 'h', nr: '1', code: 'c', gedeeldOp: Date.now() - 10 * 864e5, ingetrokkenOp: '2026-10-20' } } } as unknown as Project
    expect(opvolgstatus(p)).toBe('ingetrokken')
    expect(herinneringNodig(p.offerte!.teken)).toBe(false)
    expect(teControleren([p])).toHaveLength(0)
  })
})

describe('SQL-bestand', async () => {
  const { readFileSync } = await import('node:fs')
  const sql = readFileSync(new URL('../../supabase/fotos-en-links.sql', import.meta.url), 'utf8')
  it('is idempotent en houdt bestaande signaturen', () => {
    expect(sql).toMatch(/add column if not exists owner_id uuid references auth\.users on delete cascade/)
    expect(sql).toMatch(/create or replace function public\.offerte_delen\(p_snapshot jsonb, p_site text default 'main'\)/)
    expect(sql).toMatch(/on conflict \(id\) do update set public = false/)
    expect(sql).toMatch(/delete from public\.offerte_signatures where owner_id = auth\.uid\(\)/)
    expect(sql).not.toMatch(/500, interval '1 day'/)
    expect(sql).not.toMatch(/sb_secret|service_role|eyJ/)
  })
})
