import { describe, expect, it } from 'vitest'
import { afstanden, compact, halveMaat, ITEMS, kamerVan, leegOntwerp, nieuwItem, normaliseerOntwerp, overlapt, snap, uitCompact, voorstelIndeling, vrijePlek, wandVan, WAND_DIKTE, wisselType, type Kamer, type OntwerpItem } from './model'
import { nieuwProject, voorbeeldProjecten } from '../defaults'

const k: Kamer = { L: 280, B: 220, H: 260, tegelH: 260, type: 'badkamer' }
let n = 0
const id = () => `t${++n}`

describe('ontwerp-model', () => {
  it('kamer komt uit de projectmaten (cm)', () => {
    const p = voorbeeldProjecten()[0]
    expect(kamerVan(p)).toEqual({ L: 280, B: 220, H: 260, tegelH: 260, type: 'badkamer' })
  })

  it('rotatie wisselt de omhullende maten', () => {
    expect(halveMaat({ w: 100, d: 50, rot: 0 })).toEqual({ hx: 50, hy: 25 })
    const r = halveMaat({ w: 100, d: 50, rot: 90 })
    expect(r.hx).toBeCloseTo(25)
    expect(r.hy).toBeCloseTo(50)
  })

  it('wandobject wordt tegen de dichtstbijzijnde wand gezet en naar binnen gedraaid', () => {
    const t = snap({ id: 'a', type: 'toilet-hangend', x: 30, y: 120, w: 37, d: 54, rot: 0 }, k)
    expect(t.rot).toBe(270) // linkerwand
    expect(t.x).toBe(27) // halve diepte van de wand af
    expect(wandVan(t, k)).toBe('links')
    expect(afstanden(t, k).links).toBe(0)
  })

  it('vrij object in het midden blijft vrij en binnen de ruimte', () => {
    const b = snap({ id: 'b', type: 'bad', x: 140, y: 110, w: 170, d: 75, rot: 0 }, k)
    expect(b.rot).toBe(0)
    const a = afstanden(b, k)
    expect(Object.values(a).every((v) => v >= 0)).toBe(true)
    const buiten = snap({ id: 'c', type: 'kast', x: 900, y: -50, w: 60, d: 40, rot: 0 }, k)
    expect(buiten.x).toBeLessThanOrEqual(k.L)
    expect(buiten.y).toBeGreaterThanOrEqual(0)
  })

  it('deur en raam zitten altijd in een wand', () => {
    const d = snap({ id: 'd', type: 'deur', x: 150, y: 200, w: 83, d: 40, rot: 0 }, k)
    expect(d.y).toBe(k.B + WAND_DIKTE / 2)
    expect(d.rot).toBe(180)
    expect(d.d).toBe(WAND_DIKTE)
    const r = snap({ id: 'r', type: 'raam', x: 275, y: 100, w: 100, d: 12, rot: 0 }, k)
    expect(r.rot).toBe(90)
    expect(wandVan(r, k)).toBe('rechts')
  })

  it('voorstel-indeling voor de voorbeeldbadkamer: alles binnen de ruimte en zonder overlap', () => {
    const p = voorbeeldProjecten()[0]
    const items = voorstelIndeling(p, id)
    const types = items.map((i) => i.type)
    expect(types).toEqual(expect.arrayContaining(['douche-inloop', 'badmeubel', 'toilet-hangend', 'deur', 'raam', 'spiegel']))
    for (const it of items) {
      if (ITEMS[it.type].montage === 'in') continue
      const a = afstanden(it, k)
      expect(Math.min(...Object.values(a))).toBeGreaterThanOrEqual(0)
    }
    for (const a of items) for (const b of items) if (a !== b) expect(overlapt(a, b), `${a.type} ↔ ${b.type}`).toBe(false)
  })

  it('voorstel voor keuken, toilet en vloer werkt ook', () => {
    for (const type of ['keuken', 'toilet', 'vloer'] as const) {
      const p = nieuwProject({ type })
      const items = voorstelIndeling(p, id)
      expect(items.length).toBeGreaterThan(0)
      expect(items.some((i) => i.type === 'deur')).toBe(true)
    }
  })

  it('vrije plek: tweede wastafel komt niet over de eerste', () => {
    const eerste = nieuwItem('wastafel', k, 'w1')
    const tweede = vrijePlek('wastafel', k, [eerste], 'w2')
    expect(overlapt(eerste, tweede)).toBe(false)
  })

  it('wissel type behoudt de plek (hangend → staand toilet)', () => {
    const t = snap({ id: 'a', type: 'toilet-hangend', x: 30, y: 120, w: 37, d: 54, rot: 0 }, k)
    const s = wisselType(t, 'toilet-staand', k)
    expect(s.type).toBe('toilet-staand')
    expect(s.rot).toBe(270)
    expect(s.d).toBe(67)
  })

  it('normaliseren gooit rommel weg en begrenst maten', () => {
    const o = normaliseerOntwerp({ items: [{ type: 'bad', x: 1, y: 2, w: 9999, d: 1, rot: 450 }, { type: 'onzin' }, null], vloer: { kleur: 'xx' } }, 'badkamer')
    expect(o.items).toHaveLength(1)
    expect(o.items[0].w).toBe(ITEMS.bad.max[0])
    expect(o.items[0].d).toBe(ITEMS.bad.min[1])
    expect(o.items[0].rot).toBe(90)
    expect(o.vloer.kleur).toBe(leegOntwerp('badkamer').vloer.kleur)
  })

  it('compact ↔ uitgebreid (voor de offerte-link) is verliesvrij genoeg', () => {
    const p = voorbeeldProjecten()[0]
    const o = { ...leegOntwerp('badkamer'), items: voorstelIndeling(p, id) }
    const c = compact(o, k)
    const terug = uitCompact(JSON.parse(JSON.stringify(c)))!
    expect(terug.kamer).toEqual(k)
    expect(terug.ontwerp.items.map((i: OntwerpItem) => [i.type, Math.round(i.x), Math.round(i.y), i.rot])).toEqual(o.items.map((i) => [i.type, Math.round(i.x), Math.round(i.y), i.rot]))
    expect(JSON.stringify(c).length).toBeLessThan(700)
    expect(uitCompact({ k: 'x' })).toBeNull()
  })
})

import { deurCode as dc, normaliseerOntwerp as no2, compact as co2, uitCompact as uc2, kamerVan as kv2 } from './model'
import { describe as d2, it as i2, expect as e2 } from 'vitest'
d2('deur draairichting en scharnier', () => {
  const deur = { id: 'd', type: 'deur', x: 100, y: 220, w: 83, d: 10, rot: 180 }
  i2('bestaande deuren blijven naar binnen, scharnier links', () => {
    const it = no2({ items: [deur] }, 'badkamer').items[0]
    e2(it.draai).toBeUndefined()
    e2(it.scharnier).toBeUndefined()
    e2(dc(it)).toBe(0)
  })
  i2('keuze blijft bewaard en onzin wordt genegeerd', () => {
    const [a, b, c] = no2({ items: [{ ...deur, draai: 'buiten', scharnier: 'rechts' }, { ...deur, id: 'e', draai: 'raar' }, { ...deur, id: 'f', type: 'raam', d: 10, draai: 'buiten' }] }, 'badkamer').items
    e2([a.draai, a.scharnier]).toEqual(['buiten', 'rechts'])
    e2(b.draai).toBeUndefined()
    e2(c.draai).toBeUndefined()
  })
  i2('gaat mee in de compacte offerte-link (en oude links zonder code werken nog)', () => {
    const o = no2({ items: [{ ...deur, draai: 'buiten' }, { ...deur, id: 'g', scharnier: 'rechts' }, deur] }, 'badkamer')
    const k = { L: 280, B: 220, H: 260, tegelH: 260, type: 'badkamer' as const }
    const c = co2(o, k)
    e2(c.i.map((t) => t.length)).toEqual([7, 7, 6])
    const terug = uc2(JSON.parse(JSON.stringify(c)))!.ontwerp.items
    e2(terug.map(dc)).toEqual([1, 2, 0])
    void kv2
  })
})

describe('vrij plaatsen', () => {
  it('bad blijft vrij staan op 20 cm van de wand bij zachte snap (8 cm)', () => {
    const it0: OntwerpItem = { id: 'v1', type: 'bad', x: 140, y: 60, w: 170, d: 75, rot: 0 }
    const r = snap(it0, k, { wandAfstand: 8 })
    expect(r.y).toBe(it0.y)
  })
  it('klikt zacht vast binnen 8 cm', () => {
    const it0: OntwerpItem = { id: 'v2', type: 'toilet-hangend', x: 140, y: 27 + 5, w: 37, d: 54, rot: 0 }
    const r = snap(it0, k, { wandAfstand: 8 })
    expect(Math.abs(r.y - 27) < 0.01 || Math.abs(k.B - r.y - 27) < 0.01 || r.y !== it0.y).toBe(true)
  })
  it('wandAfstand -1 = helemaal vrij, deur blijft in de wand', () => {
    const it0: OntwerpItem = { id: 'v3', type: 'bad', x: 140, y: 40, w: 170, d: 75, rot: 0 }
    expect(snap(it0, k, { wandAfstand: -1 }).y).toBe(40)
    const deur = Object.keys(ITEMS).find((t) => ITEMS[t as keyof typeof ITEMS].montage === 'in')!
    const d = snap({ id: 'v4', type: deur as any, x: 140, y: 100, w: 80, d: 10, rot: 0 }, k, { wandAfstand: -1 })
    expect([-WAND_DIKTE / 2, k.B + WAND_DIKTE / 2, -WAND_DIKTE / 2, k.L + WAND_DIKTE / 2]).toContain(d.x === 140 ? d.y : d.x)
  })
})
