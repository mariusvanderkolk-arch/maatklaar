// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nieuwProject } from '../lib/defaults'
import { berekenAlles } from '../lib/useCalc'
import { standaardBedrijf } from '../lib/bedrijf'
import { voorbeeldPrijsBron } from '../lib/prices'
import type { Project } from '../lib/types'
import { Quote } from '../screens/Quote'
import { maakOfferteData } from '../lib/offerteMaken'
import { codeerOfferte } from '../lib/offerte'
import { formatDatum, isoDatum } from '../lib/format'

const box = vi.hoisted(() => ({ p: null as unknown as Project, b: null as unknown as ReturnType<typeof berekenAlles>, share: vi.fn(), print: vi.fn(), teken: vi.fn(), whatsapp: vi.fn(), fetch: vi.fn() }))
vi.mock('../lib/useCalc', async (original) => ({ ...await original<typeof import('../lib/useCalc')>(), useBerekening: () => box.b }))
vi.mock('../lib/bedrijf', async (original) => ({ ...await original<typeof import('../lib/bedrijf')>(), useBedrijf: () => standaardBedrijf() }))
vi.mock('../lib/ontwerp/store', () => ({ useOntwerp: () => undefined }))
vi.mock('../lib/ontwerp/beeld', () => ({ use3dBeeld: () => null }))
vi.mock('../lib/cloud/sync', () => ({ toegangsToken: async () => null }))
vi.mock('../lib/store', () => ({ projectStore: { alle: () => [box.p], werkBij: vi.fn() } }))
vi.mock('../lib/analytics', () => ({ track: vi.fn() }))
vi.mock('../lib/reviews', () => ({ reviewStatus: { telOfferte: vi.fn() } }))
vi.mock('../lib/factuurStore', () => ({ useFacturen: () => [], factuurVanOfferte: vi.fn() }))
vi.mock('../lib/ondertekenen', async (original) => ({ ...await original<typeof import('../lib/ondertekenen')>(), deelVoorOndertekening: (...args: unknown[]) => box.teken(...args), haalTekenStatus: async () => ({ ok: false, fout: 'netwerk' }) }))
vi.mock('../lib/whatsapp', async (original) => ({ ...await original<typeof import('../lib/whatsapp')>(), openWhatsapp: (...args: unknown[]) => box.whatsapp(...args) }))
vi.mock('./OfferteDocument', () => ({ OfferteDocument: () => <article data-testid="preview">Bestaande offertepreview</article> }))
vi.mock('./MeerwerkKaart', () => ({ MeerwerkKaart: () => null }))
vi.mock('./Artikelen', () => ({ ArtikelToevoegenKnop: () => null }))
vi.mock('./Toast', () => ({ toast: vi.fn() }))

let host: HTMLDivElement, root: Root
async function render() { await act(async () => root.render(<Quote p={box.p} />)) }
function button(id: string) { return host.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)! }
function textButton(label: string) { return [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)! }
async function click(el: HTMLButtonElement) { expect(el).toBeTruthy(); await act(async () => { el.click(); await new Promise((r) => setTimeout(r, 110)) }) }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.clearAllMocks()
  box.p = nieuwProject({ type: 'schilderwerk', offerte: { nummer: 'TEST', datum: '2026-11-08', metArbeid: false } })
  box.b = berekenAlles(box.p, voorbeeldPrijsBron, [])
  box.b.inkoop.regels = box.b.inkoop.regels.slice(0, 1)
  Object.assign(box.b.inkoop.regels[0], { prijs: undefined, bron: 'geen', totaal: 0 })
  box.share.mockResolvedValue(undefined)
  box.teken.mockResolvedValue({ ok: true, data: { token: 'a'.repeat(48), hash: 'hash', owner_secret: 'secret' } })
  Object.defineProperty(navigator, 'share', { value: box.share, configurable: true })
  vi.stubGlobal('fetch', box.fetch)
  window.print = box.print
  window.open = vi.fn(() => ({ close: vi.fn() })) as never
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })

describe('echte Quote/TekenKaart knoppen door dezelfde offertecheck', () => {
  it('gewone link niet gedeeld vóór bewuste bevestiging; preview blijft bestaan', async () => {
    await render(); expect(host.querySelector('[data-testid="preview"]')).not.toBeNull()
    await click(button('deel-offerte'))
    expect(box.share).not.toHaveBeenCalled(); expect(box.fetch).not.toHaveBeenCalled()
    expect(host.textContent).toContain('Gekozen actie: Offerte-link delen')
    await click(button('offerte-controle-doorgaan'))
    expect(box.share).toHaveBeenCalledOnce()
    await click(button('deel-offerte')); expect(box.share).toHaveBeenCalledTimes(2)
  })
  it('PDF en bijbehorende tekenlink worden pas na bevestiging gemaakt', async () => {
    await render(); await click(button('afdrukken'))
    expect(box.print).not.toHaveBeenCalled(); expect(box.teken).not.toHaveBeenCalled()
    await click(button('offerte-controle-doorgaan'))
    expect(box.teken).toHaveBeenCalledOnce(); expect(box.print).toHaveBeenCalledOnce()
    expect(box.share).not.toHaveBeenCalled(); expect(box.whatsapp).not.toHaveBeenCalled()
  })
  it('WhatsApp opent geen venster of tekenlink vóór controle en stuurt zelf niets', async () => {
    await render(); await click(button('deel-whatsapp'))
    expect(window.open).not.toHaveBeenCalled(); expect(box.teken).not.toHaveBeenCalled(); expect(box.whatsapp).not.toHaveBeenCalled()
    await click(button('offerte-controle-doorgaan'))
    expect(box.teken).toHaveBeenCalledOnce(); expect(box.whatsapp).toHaveBeenCalledOnce()
    expect(box.share).not.toHaveBeenCalled(); expect(box.fetch).not.toHaveBeenCalled()
  })
  it('ook de afzonderlijke knop Tekenlink delen is afgeschermd', async () => {
    await render(); await click(textButton('Tekenlink delen'))
    expect(box.teken).not.toHaveBeenCalled(); expect(box.share).not.toHaveBeenCalled()
    await click(button('offerte-controle-doorgaan'))
    expect(box.teken).toHaveBeenCalledOnce(); expect(box.share).toHaveBeenCalledOnce()
  })
  it('annuleren doet niets; na veranderde hoeveelheid vervalt eerdere bevestiging', async () => {
    await render(); await click(button('deel-offerte')); await click(textButton('Eerst controleren'))
    expect(box.share).not.toHaveBeenCalled()
    await click(button('deel-offerte')); await click(button('offerte-controle-doorgaan'))
    box.b = { ...box.b, inkoop: { ...box.b.inkoop, regels: box.b.inkoop.regels.map((r) => ({ ...r, koopAantal: r.koopAantal + 1 })) } }
    await render(); await click(button('deel-offerte'))
    expect(box.share).toHaveBeenCalledOnce()
    await click(button('offerte-controle-doorgaan')); expect(box.share).toHaveBeenCalledTimes(2)
  })
  it('een pending PDF-actie wordt na inhoudswijziging nooit alsnog uitgevoerd', async () => {
    await render(); await click(button('afdrukken'))
    box.p = { ...box.p, notities: 'Nieuwe afspraak' }; await render()
    expect(button('offerte-controle-doorgaan')).toBeNull()
    await click(button('deel-offerte')); await click(button('offerte-controle-doorgaan'))
    expect(box.share).toHaveBeenCalledOnce(); expect(box.print).not.toHaveBeenCalled(); expect(box.teken).not.toHaveBeenCalled()
  })
  it('ook een bestaande actuele tekenlink opnieuw delen vraagt eerst controle', async () => {
    const d = maakOfferteData(box.p, box.b, standaardBedrijf(), (iso) => formatDatum({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, isoDatum(iso)))
    box.p.offerte!.teken = { token: 'a'.repeat(48), hash: 'hash', nr: d.nr, code: codeerOfferte(d), gedeeldOp: Date.now(), geldigTot: d.geldigTot }
    await render(); await click(textButton('Tekenlink opnieuw delen'))
    expect(box.share).not.toHaveBeenCalled(); expect(box.teken).not.toHaveBeenCalled()
    await click(button('offerte-controle-doorgaan'))
    expect(box.share).toHaveBeenCalledOnce(); expect(box.teken).not.toHaveBeenCalled()
  })
  it('inhoud verandert tijdens async PDF-link: geen ongereviewde nieuwe PDF afdrukken', async () => {
    let klaar!: (value: unknown) => void
    box.teken.mockImplementation(() => new Promise((resolve) => { klaar = resolve }))
    await render(); await click(button('afdrukken')); await click(button('offerte-controle-doorgaan'))
    expect(box.teken).toHaveBeenCalledOnce(); expect(box.print).not.toHaveBeenCalled()
    box.p = { ...box.p, notities: 'Gewijzigd terwijl link gemaakt wordt' }; await render()
    await act(async () => { klaar({ ok: true, data: { token: 'a'.repeat(48), hash: 'hash', owner_secret: 'secret' } }); await new Promise((r) => setTimeout(r, 110)) })
    expect(box.print).not.toHaveBeenCalled(); expect(box.share).not.toHaveBeenCalled()
  })
  it('ander project vraagt opnieuw controle en hergebruikt geen oude actie', async () => {
    await render(); await click(button('deel-offerte')); await click(button('offerte-controle-doorgaan'))
    box.p = { ...box.p, id: 'tweede-project' }; await render(); await click(button('deel-whatsapp'))
    expect(box.whatsapp).not.toHaveBeenCalled(); expect(box.teken).not.toHaveBeenCalled()
    await click(button('offerte-controle-doorgaan')); expect(box.whatsapp).toHaveBeenCalledOnce()
  })
  it('geen extra waarschuwing voor een bewust eigen gratis materiaalregel', async () => {
    Object.assign(box.b.inkoop.regels[0], { prijs: 0, bron: 'eigen', totaal: 0 })
    await render(); await click(button('deel-offerte'))
    expect(button('offerte-controle-doorgaan')).toBeNull(); expect(box.share).toHaveBeenCalledOnce()
  })
})

describe('Stuur via WhatsApp als hoofdknop bij Delen met de klant', () => {
  const tekst = () => decodeURIComponent(String(box.whatsapp.mock.calls[0][0]).split('?text=')[1])
  it('staat boven de gewone deelknop en gaat door dezelfde offertecheck', async () => {
    await render()
    const wa = button('stuur-whatsapp'), deel = button('deel-offerte')
    expect(wa.textContent).toContain('Stuur via WhatsApp')
    expect(wa.compareDocumentPosition(deel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await click(wa)
    expect(window.open).not.toHaveBeenCalled(); expect(box.teken).not.toHaveBeenCalled(); expect(box.whatsapp).not.toHaveBeenCalled()
    expect(host.textContent).toContain('Gekozen actie: Stuur via WhatsApp')
    await click(button('offerte-controle-doorgaan'))
    expect(box.teken).toHaveBeenCalledOnce(); expect(box.whatsapp).toHaveBeenCalledOnce(); expect(box.share).not.toHaveBeenCalled()
  })
  it('opent wa.me zonder telefoonnummer met kant-en-klare tekst en tekenlink', async () => {
    box.p = { ...box.p, klant: 'Fam. Test', naam: 'Woonkamer verven' }
    await render(); await click(button('stuur-whatsapp')); await click(button('offerte-controle-doorgaan'))
    const url = String(box.whatsapp.mock.calls[0][0])
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(tekst()).toContain('Hoi Fam. Test, hierbij de offerte voor Woonkamer verven')
    expect(tekst()).toContain('digitaal ondertekenen')
    expect(tekst()).toContain('#/offerte-tekenen/' + 'a'.repeat(48))
  })
  it('valt terug op de gewone offerte-link als een tekenlink niet lukt', async () => {
    box.teken.mockResolvedValue({ ok: false, fout: 'niet-beschikbaar' })
    await render(); await click(button('stuur-whatsapp')); await click(button('offerte-controle-doorgaan'))
    expect(box.whatsapp).toHaveBeenCalledOnce()
    expect(tekst()).toContain('akkoord geven')
    expect(tekst()).toContain('#/offerte-bekijken/'); expect(tekst()).not.toContain('#/offerte-tekenen/')
  })
  it('hergebruikt een bestaande actuele tekenlink zonder nieuwe aan te maken', async () => {
    Object.assign(box.b.inkoop.regels[0], { prijs: 0, bron: 'eigen', totaal: 0 })
    const d = maakOfferteData(box.p, box.b, standaardBedrijf(), (iso) => formatDatum({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, isoDatum(iso)))
    box.p.offerte!.teken = { token: 'b'.repeat(48), hash: 'hash', nr: d.nr, code: codeerOfferte(d), gedeeldOp: Date.now(), geldigTot: d.geldigTot }
    await render(); await click(button('stuur-whatsapp'))
    expect(box.teken).not.toHaveBeenCalled(); expect(window.open).not.toHaveBeenCalled()
    expect(box.whatsapp).toHaveBeenCalledOnce(); expect(tekst()).toContain('b'.repeat(48))
  })
})

describe('offertecheck bij onveranderde standaardmaten', () => {
  it('toont een maten-waarschuwing met knop naar Opmeten; bewust doorgaan blijft mogelijk', async () => {
    box.p = nieuwProject({ type: 'badkamer', offerte: { nummer: 'TEST', datum: '2026-11-08', metArbeid: false } })
    box.b = berekenAlles(box.p, voorbeeldPrijsBron, [])
    await render()
    const maten = host.querySelector('[data-testid="offerte-controle-maten"]')
    expect(maten?.textContent).toContain('2,5 × 2,0 m')
    expect(maten?.textContent).toContain('Naar Opmeten')
    await click(button('deel-offerte')); expect(box.share).not.toHaveBeenCalled()
    await click(button('offerte-controle-doorgaan')); expect(box.share).toHaveBeenCalledOnce()
  })
  it('geen maten-waarschuwing als de maten zijn aangepast', async () => {
    box.p = nieuwProject({ type: 'badkamer', offerte: { nummer: 'TEST', datum: '2026-11-08', metArbeid: false } })
    box.p.afmetingen = { ...box.p.afmetingen, lengte: 3.2, breedte: 2.1 }
    box.b = berekenAlles(box.p, voorbeeldPrijsBron, [])
    await render()
    expect(host.querySelector('[data-testid="offerte-controle-maten"]')).toBeNull()
  })
})
