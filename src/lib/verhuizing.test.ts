import { describe, expect, it } from 'vitest'
import { doelUitHash, isOverzetBericht, isOverzetOk, opNieuwAdres, overzetUrl, OUDE_ORIGIN } from './verhuizing'

describe('verhuizing naar maatklaar.nl', () => {
  it('stuurt alleen naar toegestane origins', () => {
    expect(doelUitHash('#van=https%3A%2F%2Fmaatklaar.nl')).toBe('https://maatklaar.nl')
    expect(doelUitHash('#van=https%3A%2F%2Fwww.maatklaar.nl')).toBe('https://www.maatklaar.nl')
    expect(doelUitHash('#van=https%3A%2F%2Fevil.example')).toBeNull()
    expect(doelUitHash('#van=https%3A%2F%2Fmaatklaar.nl.evil.example')).toBeNull()
    expect(doelUitHash('')).toBeNull()
    expect(doelUitHash('#van=%E0%A4%A')).toBeNull()
  })
  it('url en berichten', () => {
    expect(overzetUrl('https://maatklaar.nl')).toBe(`${OUDE_ORIGIN}/maatklaar-overzetten/#van=https%3A%2F%2Fmaatklaar.nl`)
    expect(isOverzetBericht({ type: 'maatklaar-overzetten', versie: 1, backup: '{}' })).toBe(true)
    expect(isOverzetBericht({ type: 'maatklaar-overzetten', versie: 2, backup: '{}' })).toBe(false)
    expect(isOverzetBericht('x')).toBe(false)
    expect(isOverzetOk({ type: 'maatklaar-overzetten-ok', projecten: 2 })).toBe(true)
  })
  it('kaart alleen op het nieuwe adres, niet op github.io of in de testversie', () => {
    expect(opNieuwAdres('https://maatklaar.nl', false)).toBe(true)
    expect(opNieuwAdres('https://mariusvanderkolk-arch.github.io', false)).toBe(false)
    expect(opNieuwAdres('https://maatklaar.nl', true)).toBe(false)
  })
})
