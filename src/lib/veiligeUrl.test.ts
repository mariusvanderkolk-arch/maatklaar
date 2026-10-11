import { describe, expect, it } from 'vitest'
import { inVreemdFrame, veiligeUrl } from './veiligeUrl'

describe('veiligeUrl', () => {
  it('laat alleen http(s) door', () => {
    expect(veiligeUrl('https://www.gamma.nl/x?a=1')).toBe('https://www.gamma.nl/x?a=1')
    expect(veiligeUrl(' http://a.nl ')).toBe('http://a.nl/')
    for (const slecht of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', 'gamma.nl', '', null, undefined])
      expect(veiligeUrl(slecht as string)).toBeUndefined()
  })
  it('herkent een vreemd frame', () => {
    const zelf = { location: { origin: 'https://maatklaar.nl' } } as unknown as Window
    expect(inVreemdFrame({ ...zelf, top: zelf, self: zelf } as unknown as Window)).toBe(false)
    const boven = { get location(): Location { throw new Error('cross-origin') } }
    expect(inVreemdFrame({ location: { origin: 'https://maatklaar.nl' }, top: boven, self: {} } as unknown as Window)).toBe(true)
  })
})
