import { describe, expect, it } from 'vitest'
import { compact, familieVan, ITEMS, nieuwItem, normaliseerOntwerp, overlapt, uitCompact, voegKleur, kleurVan, KLEUREN, type Kamer, type ItemType } from './model'

const k: Kamer = { L: 300, B: 240, H: 260, tegelH: 260, type: 'badkamer' }
const nieuw: ItemType[] = ['kolomkast', 'spiegelkast', 'bad-vrijstaand', 'waskom', 'badmeubel-dubbel', 'douchewand', 'nis', 'ombouw']

describe('badkamer-uitbreiding', () => {
  it('nieuwe meubels zijn beschikbaar in de badkamer en passen binnen hun min/max', () => {
    for (const t of nieuw) {
      const def = ITEMS[t]
      expect(def.ruimtes).toContain('badkamer')
      expect(def.w).toBeGreaterThanOrEqual(def.min[0])
      expect(def.w).toBeLessThanOrEqual(def.max[0])
      const it = nieuwItem(t, k, 'x')
      expect(it.x).toBeGreaterThanOrEqual(0)
      expect(it.x).toBeLessThanOrEqual(k.L)
    }
  })

  it('vrijstaand bad blijft vrij in de ruimte; wastafel-varianten wisselbaar', () => {
    expect(ITEMS['bad-vrijstaand'].montage).toBe('vrij')
    expect(familieVan('badmeubel')).toEqual(expect.arrayContaining(['waskom', 'badmeubel-dubbel', 'wastafel']))
    expect(familieVan('kast')).toContain('kolomkast')
  })

  it('spiegelkast en nis hangen boven een badmeubel zonder overlap; douchewand overlapt nooit', () => {
    const m = { id: 'm', type: 'badmeubel' as const, x: 50, y: 23, w: 80, d: 46, rot: 0 }
    expect(overlapt(m, { id: 's', type: 'spiegelkast', x: 50, y: 8, w: 80, d: 15, rot: 0 })).toBe(false)
    expect(overlapt(m, { id: 'n', type: 'nis', x: 50, y: 5, w: 60, d: 10, rot: 0 })).toBe(false)
    expect(overlapt({ id: 'd', type: 'douche-inloop', x: 100, y: 60, w: 100, d: 120, rot: 0 }, { id: 'g', type: 'douchewand', x: 100, y: 110, w: 100, d: 2, rot: 0 })).toBe(false)
  })

  it('nieuwe items gaan heen-en-weer door de offerte-link', () => {
    const o = normaliseerOntwerp({ items: nieuw.map((t, i) => ({ id: `i${i}`, type: t, x: 100, y: 100, w: ITEMS[t].w, d: ITEMS[t].d, rot: 0 })) }, 'badkamer')
    const terug = uitCompact(JSON.parse(JSON.stringify(compact(o, k))))!
    expect(terug.ontwerp.items.map((i) => i.type)).toEqual(nieuw)
  })
})

describe('tegel-uitbreiding', () => {
  it('meer kleuren, unieke ids', () => {
    expect(KLEUREN.length).toBeGreaterThanOrEqual(19)
    expect(new Set(KLEUREN.map((c) => c.id)).size).toBe(KLEUREN.length)
  })

  it('visgraat en voegkleur worden bewaard en gaan mee in de link', () => {
    const o = normaliseerOntwerp({ vloer: { kleur: 'eiken', formaat: 'plank', verband: 'visgraat', voeg: 'antraciet' }, wand: { kleur: 'kalk', formaat: 'metro', verband: 'halfsteens' } }, 'badkamer')
    expect(o.vloer).toEqual({ kleur: 'eiken', formaat: 'plank', verband: 'visgraat', voeg: 'antraciet' })
    const c = compact(o, k)
    expect(c.w).toHaveLength(3) // zonder voegkeuze blijft de link even kort
    const terug = uitCompact(JSON.parse(JSON.stringify(c)))!
    expect(terug.ontwerp.vloer.verband).toBe('visgraat')
    expect(terug.ontwerp.vloer.voeg).toBe('antraciet')
    expect(terug.ontwerp.wand.voeg).toBeUndefined()
  })

  it('oude ontwerpen zonder voeg blijven ongewijzigd; onbekende waarden vallen terug', () => {
    const oud = normaliseerOntwerp({ vloer: { kleur: 'travertin', formaat: '60x60', verband: 'recht' } }, 'badkamer')
    expect(oud.vloer).toEqual({ kleur: 'travertin', formaat: '60x60', verband: 'recht' })
    expect(voegKleur(oud.vloer, kleurVan('travertin'))).toBe(kleurVan('travertin').voeg)
    const raar = normaliseerOntwerp({ vloer: { kleur: 'x', formaat: 'y', verband: 'kruis', voeg: 'paars' } }, 'badkamer')
    expect(raar.vloer.verband).toBe('recht')
    expect(raar.vloer.voeg).toBeUndefined()
  })
})
