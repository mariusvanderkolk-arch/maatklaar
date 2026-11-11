// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { INVOER_TEKSTKLASSE } from '../components/ui'
import { isTekstveld } from '../components/hulp/HulpKnop'
import { STAPPEN } from '../screens/ProjectScreen'

describe('invoer 16px', () => {
  it('gebruikt text-base (16px) op alle standaardvelden', () => {
    expect(INVOER_TEKSTKLASSE).toBe('text-base')
  })
})

describe('hulpknop: invoerfocus', () => {
  it('herkent tekstvelden, geen checkbox of knop', () => {
    const input = document.createElement('input')
    input.type = 'text'
    expect(isTekstveld(input)).toBe(true)
    const tel = document.createElement('input')
    tel.type = 'tel'
    expect(isTekstveld(tel)).toBe(true)
    const ta = document.createElement('textarea')
    expect(isTekstveld(ta)).toBe(true)
    const sel = document.createElement('select')
    expect(isTekstveld(sel)).toBe(true)
    const box = document.createElement('input')
    box.type = 'checkbox'
    expect(isTekstveld(box)).toBe(false)
    const btn = document.createElement('button')
    expect(isTekstveld(btn)).toBe(false)
  })
})

describe('stappennav', () => {
  it('houdt korte labels voor smalle schermen (tot lg)', () => {
    expect(STAPPEN.map((s) => s.kort)).toEqual(['Opmeten', 'Ontwerp', 'Bereken', 'Inkoop', 'Offerte', 'Planning'])
    expect(STAPPEN.find((s) => s.id === 'planning')?.label).toBe('Planning & uren')
  })
})
