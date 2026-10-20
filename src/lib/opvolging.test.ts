import { describe, expect, it } from 'vitest'
import { aantalNieuwGetekend, geldigTot, herinneringNodig, herinneringTekst, opvolgstatus, teControleren } from './opvolging'
import { verwerkStatus } from './opvolgingSync'
import type { Project } from './types'

const DAG = 86_400_000
const T0 = Date.parse('2026-10-01T10:00:00Z')
const proj = (teken?: object, akkoord?: object) => ({ id: 'p', naam: 'Badkamer', klant: 'Jansen', offerte: { teken: teken && { token: 'x'.repeat(32), hash: 'h', nr: 'OF-1', code: 'c', gedeeldOp: T0, ...teken }, akkoord } }) as unknown as Project

describe('opvolgstatus', () => {
  it('concept zonder tekenlink', () => expect(opvolgstatus(proj())).toBe('concept'))
  it('getekend via akkoord zonder link', () => expect(opvolgstatus(proj(undefined, { naam: 'J', datum: '2026-10-01' }))).toBe('getekend'))
  it('verstuurd → bekeken → getekend', () => {
    expect(opvolgstatus(proj({}), T0 + DAG)).toBe('verstuurd')
    expect(opvolgstatus(proj({ bekekenOp: '2026-10-02T08:00:00Z' }), T0 + DAG)).toBe('bekeken')
    expect(opvolgstatus(proj({ getekend: { naam: 'J', op: 'x', handtekening: 'y' } }), T0 + 99 * DAG)).toBe('getekend')
  })
  it('verlopen na geldigTot, standaard 30 dagen', () => {
    expect(geldigTot(proj({}).offerte!.teken!)).toBe('2026-10-31')
    expect(opvolgstatus(proj({}), T0 + 31 * DAG)).toBe('verlopen')
    expect(opvolgstatus(proj({ geldigTot: '2026-10-05' }), T0 + 5 * DAG)).toBe('verlopen')
  })
})

describe('herinnering', () => {
  const t = (x = {}) => proj(x).offerte!.teken!
  it('pas na 5 dagen', () => {
    expect(herinneringNodig(t(), T0 + 4 * DAG)).toBe(false)
    expect(herinneringNodig(t(), T0 + 5 * DAG)).toBe(true)
  })
  it('"Later"/verstuurd zet de klok opnieuw', () => expect(herinneringNodig(t({ herinnerdOp: T0 + 5 * DAG }), T0 + 7 * DAG)).toBe(false))
  it('niet als getekend of verlopen', () => {
    expect(herinneringNodig(t({ getekend: { naam: 'J', op: 'x', handtekening: 'y' } }), T0 + 9 * DAG)).toBe(false)
    expect(herinneringNodig(t(), T0 + 40 * DAG)).toBe(false)
  })
  it('tekst bevat link en naam, geen bedragen', () => {
    const s = herinneringTekst('Jansen', 'Badkamer', 'https://l/x', true)
    expect(s).toContain('Beste Jansen'); expect(s).toContain('https://l/x'); expect(s).toContain('bekeken'); expect(s).not.toMatch(/€/)
  })
})

describe('sync', () => {
  it('teControleren: alleen open, niet verlopen', () => {
    const lijst = [proj(), proj({}), proj({ getekend: { naam: 'J', op: 'x', handtekening: 'y' } })]
    expect(teControleren(lijst, T0 + DAG)).toHaveLength(1)
    expect(teControleren(lijst, T0 + 40 * DAG)).toHaveLength(0)
  })
  it('verwerkStatus: bekeken en getekend met badge', () => {
    const b = verwerkStatus(proj({}), { viewed_at: '2026-10-02T08:00:00Z' } as never, false)
    expect(b.nieuwGetekend).toBe(false)
    expect(b.project.offerte!.teken!.bekekenOp).toBe('2026-10-02T08:00:00Z')
    const g = verwerkStatus(b.project, { signed_at: '2026-10-03T09:00:00Z', signature: 'data:x', signer_name: 'J. Jansen' } as never, false)
    expect(g.nieuwGetekend).toBe(true)
    expect(g.project.offerte!.akkoord).toEqual({ naam: 'J. Jansen', datum: '2026-10-03' })
    expect(aantalNieuwGetekend([g.project])).toBe(1)
    expect(verwerkStatus(g.project, { signed_at: 'z', signature: 'q' } as never, false).nieuwGetekend).toBe(false)
  })
  it('gezien: geen badge', () => {
    const g = verwerkStatus(proj({}), { signed_at: '2026-10-03T09:00:00Z', signature: 's' } as never, true)
    expect(g.project.offerte!.teken!.nieuwGetekend).toBe(false)
  })
  it('zonder wijziging hetzelfde object', () => {
    const p = proj({})
    expect(verwerkStatus(p, {} as never, false).project).toBe(p)
  })
})
