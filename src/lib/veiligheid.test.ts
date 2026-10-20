import { describe, expect, it } from 'vitest'
import { VEILIG_PUNTEN } from './veiligheid'

describe('Veilig & AVG-teksten', () => {
  it('geen loze beloftes, prijzen of persoonlijke naam', () => {
    const t = VEILIG_PUNTEN.join(' ')
    expect(t).not.toMatch(/100\s*%|gecertificeerd|ISO|€|marius|onkraakbaar/i)
    expect(VEILIG_PUNTEN.length).toBeGreaterThanOrEqual(3)
  })
})
