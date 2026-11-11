import { describe, expect, it } from 'vitest'
import { EIGEN_PRIJZEN_TIP, NAAR_PRIJZEN_LABEL, PRIJZEN_PAD, VOORBEELDPRIJZEN_HINT } from './prijzenUitleg'

describe('uitleg eigen prijzen', () => {
  it('noemt het echte scherm Prijzen en geen bedragen of publieke tarieven', () => {
    const alles = [VOORBEELDPRIJZEN_HINT, EIGEN_PRIJZEN_TIP, NAAR_PRIJZEN_LABEL, PRIJZEN_PAD].join(' ')
    expect(VOORBEELDPRIJZEN_HINT).toContain('voorbeeldprijzen')
    expect(VOORBEELDPRIJZEN_HINT).toContain('inkoopprijzen')
    expect(EIGEN_PRIJZEN_TIP).toContain('Prijzen')
    expect(EIGEN_PRIJZEN_TIP).toContain('uurtarief')
    expect(EIGEN_PRIJZEN_TIP).toContain('Offerte')
    expect(NAAR_PRIJZEN_LABEL).toBe('Naar Prijzen')
    expect(PRIJZEN_PAD).toBe('/prijzen')
    expect(alles).not.toMatch(/€|\d+,\d\d|standaardprijzen|afbouw|maatklaar\.nl\/prijs/i)
  })
})
