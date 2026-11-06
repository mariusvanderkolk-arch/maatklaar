import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ApparaatKeuze } from './KlantVoorbeeld'
import { OnlineVoet } from './OfferteDocument'
import { APPARATEN, isVoorbeeld, schaalVoor, voorbeeldUrl } from '../lib/voorbeeld'
import { qrSvg, MAX_QR_LENGTE } from '../lib/qr'
import { parse } from '../lib/router'
import type { OfferteData } from '../lib/offerte'

describe('klant-voorbeeld per apparaat', () => {
  it('heeft desktop, tablet en mobiel met oplopend smallere breedtes', () => {
    expect(APPARATEN.map((a) => a.id)).toEqual(['desktop', 'tablet', 'mobiel'])
    expect(APPARATEN[0].breedte).toBeGreaterThan(APPARATEN[1].breedte)
    expect(APPARATEN[1].breedte).toBeGreaterThan(APPARATEN[2].breedte)
  })
  it('markeert het gekozen apparaat als geselecteerde tab', () => {
    const html = renderToStaticMarkup(<ApparaatKeuze waarde="tablet" onChange={() => {}} />)
    expect(html).toMatch(/aria-selected="true"[^>]*data-apparaat="tablet"/)
    expect(html.match(/aria-selected="false"/g)).toHaveLength(2)
    expect(html).toContain('Mobiel')
  })
  it('gebruikt de echte klantroute, met voorbeeld-vlag', () => {
    const url = voorbeeldUrl({ nr: 'T1' } as unknown as OfferteData, '/app/')
    expect(url.startsWith('/app/#/offerte-bekijken/')).toBe(true)
    const hash = url.slice(url.indexOf('#'))
    expect(isVoorbeeld(hash)).toBe(true)
    expect(parse(hash).naam).toBe('offerte-bekijken')
  })
  it('schaalt nooit groter dan 1', () => {
    expect(schaalVoor(390, 900)).toBe(1)
    expect(schaalVoor(1280, 640)).toBe(0.5)
  })
})

describe('PDF-voet met link en QR', () => {
  const url = 'https://maatklaar.nl/#/offerte-tekenen/' + 'a'.repeat(48)
  it('toont uitleg, url en een QR-code', () => {
    const html = renderToStaticMarkup(<OnlineVoet url={url} />)
    expect(html).toContain('data-testid="online-voet"')
    expect(html).toContain(url)
    expect(html).toContain('<svg')
    expect(html).toContain('direct tekenen')
    expect(html).toContain('print:flex')
  })
  it('QR alleen voor leesbare lengtes', () => {
    expect(qrSvg(url)).toContain('<svg')
    expect(qrSvg('x'.repeat(MAX_QR_LENGTE + 1))).toBeNull()
  })
})
