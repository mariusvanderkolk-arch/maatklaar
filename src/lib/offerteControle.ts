/** Voorcontrole verandert nooit hoeveelheden, bedragen of btw. Expliciet doorgaan blijft mogelijk. */
import type { Project } from './types'
import type { OfferteData } from './offerte'
import type { berekenAlles } from './useCalc'
import { vergeetPunten } from './vergeetCheck'

type Berekening = ReturnType<typeof berekenAlles>
export interface ControlePunt { id: string; soort: 'waarde' | 'prijs'; tekst: string }
export type ControleActie = () => void | Promise<unknown>

export function offerteControle(p: Project, b: Berekening, d: OfferteData) {
  const punten: ControlePunt[] = []
  const meld = (id: string, soort: ControlePunt['soort'], tekst: string) => punten.push({ id, soort, tekst })
  for (const [i, r] of b.inkoop.regels.entries()) {
    const id = `materiaal-${i}`
    if (![r.nodig, r.koopAantal, r.prijsAantal, r.totaal].every(Number.isFinite) || (r.prijs != null && !Number.isFinite(r.prijs))) {
      meld(id, 'waarde', `${r.naam}: een aantal of bedrag is ongeldig. Controleer Inkooplijst en Prijzen.`)
    } else if (r.koopAantal < 0 || r.prijsAantal < 0) {
      meld(id, 'waarde', `${r.naam}: negatief aantal. Controleer de invoer; een korting kan als negatief bedrag worden opgegeven.`)
    } else if (r.koopAantal === 0 && (r.nodig > 0 || r.prijsAantal > 0 || r.totaal !== 0)) {
      meld(id, 'prijs', `${r.naam}: wel een behoefte of bedrag, maar het te kopen aantal is 0. Controleer de verpakking en hoeveelheid.`)
    } else if (r.koopAantal > 0 && (r.prijs == null || r.bron === 'geen')) {
      meld(id, 'prijs', `${r.naam}: ${r.koopAantal} aanwezig, maar geen prijs bekend. De regel telt nu als € 0 mee; vul een prijs in of bevestig dat dit inbegrepen is.`)
    } else if (r.koopAantal > 0 && r.totaal === 0 && !(r.bron === 'eigen' && r.prijs === 0) && !(r.prijs! > 0 && r.prijsAantal > 0 && Math.round(r.prijs! * r.prijsAantal * 100) === 0)) {
      meld(id, 'prijs', `${r.naam}: positief aantal, maar € 0 op de regel. Controleer prijs en prijshoeveelheid; gratis of inbegrepen mag bewust zo blijven.`)
    }
  }
  for (const [i, x] of (p.extraArtikelen ?? []).entries()) if (!Number.isFinite(x.aantal) || x.aantal < 0) {
    meld(`extra-${i}`, 'waarde', 'Een zelf toegevoegd artikel heeft een ongeldig of negatief aantal en kan uit de berekening zijn weggelaten. Controleer Artikelen; gebruik voor minderwerk de aparte meer-/minderwerkbon.')
  }
  if (p.offerte?.metArbeid !== false && b.arbeid.length) {
    if (!Number.isFinite(p.uurtarief) || b.arbeid.some((r) => !Number.isFinite(r.uren))) {
      meld('arbeid', 'waarde', 'Uurtarief of arbeidsuren zijn ongeldig. Controleer de arbeidsberekening.')
    } else if (p.uurtarief === 0 && b.arbeid.some((r) => r.uren > 0)) {
      meld('arbeid', 'prijs', 'Er zijn arbeidsuren, maar het uurtarief is € 0. Controleer of arbeid bewust gratis of elders inbegrepen is.')
    }
  }
  if (![d.totaal, d.matTotaal, d.arbTotaal, ...d.mat.map((r) => r[2]), ...d.arb.map((r) => r[1]), ...(d.onv ? [d.onv[1]] : [])].every(Number.isFinite)) {
    meld('totaal', 'waarde', 'Een offertetotaal is ongeldig. Herstel de invoer vóór je een klantversie gebruikt.')
  }
  const herinneringen = vergeetPunten(p)
  // Deel-/tekenstatus en opslagmoment zijn bewust uitgesloten; inhoud en onderliggende prijsstatus niet.
  const sleutel = JSON.stringify({ id: p.id, d, scope: p.scope, punten, herinneringen, regels: b.inkoop.regels.map((r) => [r.sleutel, r.koopAantal, r.prijsAantal, r.prijs, r.bron, r.totaal]), extra: p.extraArtikelen },
    (_key, value) => typeof value === 'number' && !Number.isFinite(value) ? String(value) : value)
  return { punten, herinneringen, sleutel, heeftPunten: !!(punten.length || herinneringen.length) }
}

/** Eén bewuste bevestiging per onveranderde offerte in deze schermsessie. Geen side effects vóór bevestigen. */
export class OffertePoort {
  bevestigd = false
  wachtend: ControleActie | null = null
  label = ''
  actief = true
  readonly versie: string
  readonly heeftPunten: boolean
  constructor(heeftPunten: boolean, versie = '') { this.heeftPunten = heeftPunten; this.versie = versie }
  vraag(actie: ControleActie, label = 'gekozen actie') {
    if (!this.actief) return
    this.label = label
    if (!this.heeftPunten || this.bevestigd) return void actie()
    this.wachtend = actie
  }
  bevestig() {
    const actie = this.wachtend
    this.wachtend = null
    if (!actie || !this.actief) return
    this.bevestigd = true
    void actie()
  }
  activeer() { this.actief = true }
  sluit() { this.actief = false; this.wachtend = null }
  annuleer() { this.wachtend = null }
}
