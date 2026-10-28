import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _zetOmgeving, anonimiseer, flush, padVoor, track } from './analytics'

const calls: { url: string; body: unknown[] }[] = []
const okFetch = (status = 201) => vi.fn(async (url: string, init: RequestInit) => {
  calls.push({ url, body: JSON.parse(String(init.body)) })
  return new Response(null, { status })
}) as unknown as typeof fetch

beforeEach(() => { calls.length = 0 })
const wacht = () => new Promise((r) => setTimeout(r, 0))

describe('analytics', () => {
  it('bundelt events, ontdubbelt page_view per pad en stuurt naar /rest/v1/events', async () => {
    _zetOmgeving({ actief: true, dnt: false, fetch: okFetch() })
    track('page_view', { path: '/' })
    track('page_view', { path: '/' })
    track('page_view', { path: '/prijzen' })
    track('offerte_shared')
    flush()
    await wacht()
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toMatch(/\/rest\/v1\/events$/)
    const b = calls[0].body as Record<string, unknown>[]
    expect(b.map((e) => e.name)).toEqual(['page_view', 'page_view', 'offerte_shared'])
    expect(b[0]).toMatchObject({ site: 'main', path: '/' })
    expect(typeof b[0].session).toBe('string')
  })
  it('stopt stil als de tabel ontbreekt (404) en gooit nooit', async () => {
    const f = okFetch(404)
    _zetOmgeving({ actief: true, dnt: false, fetch: f })
    track('chat_opened'); flush(); await wacht()
    track('chat_opened'); flush(); await wacht()
    expect(f).toHaveBeenCalledTimes(1)
    _zetOmgeving({ actief: true, dnt: false, fetch: (() => { throw new Error('geblokkeerd') }) as unknown as typeof fetch })
    expect(() => { track('signup'); flush() }).not.toThrow()
  })
  it('Do Not Track of niet actief: niets versturen', async () => {
    const f = okFetch()
    _zetOmgeving({ actief: true, dnt: true, fetch: f }); track('signup'); flush()
    _zetOmgeving({ actief: false, dnt: false, fetch: f }); track('signup'); flush()
    await wacht()
    expect(f).not.toHaveBeenCalled()
  })
  it('anonimiseert vrije tekst en paden bevatten geen ID of offerte-inhoud', () => {
    expect(anonimiseer('mail jan@x.nl of bel 06 12345678 aub')).toBe('mail [mail] of bel [nummer] aub')
    expect(anonimiseer('a'.repeat(300))).toHaveLength(120)
    expect(padVoor({ naam: 'project', stap: 'offerte' })).toBe('/project/offerte')
    expect(padVoor({ naam: 'offerte-bekijken' })).toBe('/offerte-bekijken')
    expect(padVoor({ naam: 'home' })).toBe('/')
  })
})

describe('funnel-events', () => {
  it('telt funnel-events één keer per sessie en laat alleen vaste details door', async () => {
    _zetOmgeving({ actief: true, dnt: false, fetch: okFetch() })
    track('opmeten_gestart'); track('opmeten_gestart')
    track('maat_ingevuld', { detail: 'lengte' }); track('maat_ingevuld', { detail: 'breedte' })
    track('offerte_bekeken')
    track('snelstart_gestart')
    track('snelstart_offerte_klaar', { detail: 'jan@x.nl Badkamer Jansen' })
    track('offerte_shared', { detail: 'whatsapp' })
    track('offerte_shared', { detail: 'Familie de Vries' })
    flush(); await wacht()
    const b = calls[0].body as Record<string, unknown>[]
    expect(b.map((e) => e.name)).toEqual(['opmeten_gestart', 'maat_ingevuld', 'offerte_bekeken', 'snelstart_gestart', 'snelstart_offerte_klaar', 'offerte_shared', 'offerte_shared'])
    expect(b.map((e) => e.detail)).toEqual([null, 'lengte', null, null, null, 'whatsapp', null])
    for (const e of b) expect(Object.keys(e).sort()).toEqual(['detail', 'device', 'inapp', 'name', 'path', 'referrer_host', 'session', 'site'])
  })
  it('EVENT_NAMEN en VASTE_DETAILS komen overeen met de RLS-policy in supabase/analytics.sql', async () => {
    const { EVENT_NAMEN, VASTE_DETAILS } = await import('./analytics')
    const sql = (await import('../../supabase/analytics.sql?raw')).default
    for (const n of EVENT_NAMEN) expect(sql).toContain(`'${n}'`)
    for (const [n, ws] of Object.entries(VASTE_DETAILS)) for (const w of ws!) expect(sql).toMatch(new RegExp(`${n}[^\\n]*'${w}'|'${w}'[^\\n]*${n}`))
  })
})
