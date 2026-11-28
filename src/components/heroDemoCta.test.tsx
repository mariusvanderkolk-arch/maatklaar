// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const box = vi.hoisted(() => ({ track: vi.fn(), ga: vi.fn(), voegToe: vi.fn() }))
vi.mock('../lib/analytics', () => ({ track: (...a: unknown[]) => box.track(...a) }))
vi.mock('../lib/router', () => ({ ga: (...a: unknown[]) => box.ga(...a) }))
vi.mock('../lib/store', () => ({ projectStore: { voegToe: (...a: unknown[]) => box.voegToe(...a) } }))
vi.mock('../lib/billing/store', () => ({ useProjectToegang: () => ({ mag: true }) }))
vi.mock('./Plattegrond', () => ({ Plattegrond: () => <svg data-testid="plattegrond" /> }))

import { HeroDemo } from './HeroDemo'

let root: Root
let el: HTMLElement
beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  box.track.mockClear(); box.ga.mockClear(); box.voegToe.mockClear()
  el = document.createElement('div')
  document.body.appendChild(el)
  root = createRoot(el)
})
afterEach(() => { act(() => root.unmount()); el.remove() })

describe('homepage-demo: duidelijke start-CTA + analytics', () => {
  it('toont de gratis start-knop direct onder de demo', () => {
    act(() => root.render(<HeroDemo />))
    expect(el.querySelector('[data-testid="hero-demo-start"]')?.textContent).toBe('Start je eerste project – gratis')
  })
  it('wijst de eerste tik aan met een hint en vuurt demo_interactie één keer af', () => {
    act(() => root.render(<HeroDemo />))
    expect(el.querySelector('[data-hint="tik-hier"]')).not.toBeNull()
    const plus = el.querySelector<HTMLButtonElement>('button[aria-label="Lengte 10 cm groter"]')!
    act(() => plus.click())
    act(() => plus.click())
    expect(el.querySelector('[data-hint="tik-hier"]')).toBeNull()
    const ev = box.track.mock.calls.filter((c) => c[0] === 'demo_interactie')
    expect(ev).toEqual([['demo_interactie', { detail: 'maat' }]])
  })
  it('klik op de start-knop vuurt demo_cta af, maakt een project en gaat naar opmeten', () => {
    act(() => root.render(<HeroDemo />))
    act(() => el.querySelector<HTMLButtonElement>('[data-testid="hero-demo-start"]')!.click())
    expect(box.track).toHaveBeenCalledWith('demo_cta')
    expect(box.track).toHaveBeenCalledWith('project_created')
    expect(box.voegToe).toHaveBeenCalledTimes(1)
    expect(box.ga).toHaveBeenCalledWith(expect.stringMatching(/^\/project\/.+\/opmeten$/))
  })
})
