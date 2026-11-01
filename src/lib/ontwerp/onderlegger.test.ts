import { describe, expect, it } from 'vitest'
import { controleerBestand, formaatCm, herkenBestand, kalibreer, MAX_BESTAND, nieuweOnderlegger, normaliseerOnderlegger } from './onderlegger'
import { ITEMS, normaliseerOntwerp } from './model'

const bytes = (...b: number[]) => new Uint8Array(b)
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')

describe('bestandscontrole', () => {
  it('herkent PNG, JPG en PDF aan de inhoud', () => {
    expect(herkenBestand(PNG)).toBe('png')
    expect(herkenBestand(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpg')
    expect(herkenBestand(new TextEncoder().encode('%PDF-1.7'))).toBe('pdf')
  })
  it('weigert SVG, leeg en te groot', () => {
    expect(controleerBestand(100, SVG)).toHaveProperty('fout')
    expect(controleerBestand(100, new TextEncoder().encode('<?xml version="1.0"?><svg'))).toHaveProperty('fout')
    expect(controleerBestand(0, PNG)).toHaveProperty('fout')
    expect(controleerBestand(MAX_BESTAND + 1, PNG)).toHaveProperty('fout')
    expect(controleerBestand(MAX_BESTAND, PNG)).toEqual({ soort: 'png' })
  })
})

describe('kalibreren', () => {
  it('schaalt om punt 1 naar de echte afstand', () => {
    const o = nieuweOnderlegger(1000, 500, { L: 400, B: 300 }, 'a.png') // 2,5 px/cm, midden 200,150
    expect(formaatCm(o).w).toBeCloseTo(400)
    const p1 = { x: 100, y: 150 }
    const n = kalibreer(o, p1, { x: 300, y: 150 }, 400)! // getekend 200 cm, echt 400 → 2× groter
    expect(formaatCm(n).w).toBeCloseTo(800)
    expect(n.x).toBeCloseTo(300)
    expect(n.y).toBeCloseTo(150)
    expect(n.gekalibreerd).toBe(true)
    // punt 1 blijft op dezelfde plek in de afbeelding: (p1 − midden) × schaal blijft gelijk in px
    expect((p1.x - n.x) * n.schaal).toBeCloseTo((p1.x - o.x) * o.schaal)
  })
  it('weigert punten op elkaar of geen afstand', () => {
    const o = nieuweOnderlegger(100, 100, { L: 100, B: 100 }, 'a')
    expect(kalibreer(o, { x: 1, y: 1 }, { x: 1, y: 1 }, 100)).toBeNull()
    expect(kalibreer(o, { x: 0, y: 0 }, { x: 50, y: 0 }, 0)).toBeNull()
  })
})

describe('normaliseren', () => {
  it('ruimt ongeldige onderlegger op en begrenst waarden', () => {
    expect(normaliseerOnderlegger({ pxB: 'x' })).toBeUndefined()
    const n = normaliseerOnderlegger({ pxB: 10, pxH: 10, schaal: 1, x: 0, y: 0, rot: -90, opacity: 9, naam: 'a'.repeat(500) })!
    expect(n.rot).toBe(270)
    expect(n.opacity).toBe(1)
    expect(n.naam.length).toBe(120)
  })
  it('bewaart de onderlegger in het ontwerp en kent kozijn/schuifpui', () => {
    const o = normaliseerOntwerp({ items: [{ id: 'k', type: 'schuifpui', x: 100, y: 0, w: 300, d: 10, rot: 0 }], onderlegger: { pxB: 10, pxH: 10, schaal: 1, x: 5, y: 5 } }, 'aanbouw')
    expect(o.onderlegger?.zichtbaar).toBe(true)
    expect(o.items.some((i) => i.type === 'schuifpui')).toBe(true)
    expect(ITEMS.kozijn.montage).toBe('in')
  })
})
