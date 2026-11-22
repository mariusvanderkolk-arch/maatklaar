/**
 * Factuur delen via een alleen-lezen link in de URL-hash, net als de gewone offerte-link.
 * Geen extra database: de factuur zit versleuteld-samengeperst in de link zelf.
 * De app verstuurt nooit zelf een bericht; WhatsApp opent alleen een wa.me-concept.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { euro } from './format'
import { datumNl } from './offerte'
import { btwOverzicht, dagenTeLaat, normaliseerFactuur, type Factuur } from './factuur'

const MAX_LINK = 12_000

export function codeerFactuur(f: Factuur): string {
  return compressToEncodedURIComponent(JSON.stringify(f))
}

/** Leest en controleert factuurgegevens uit een link. Gooit een Nederlandse foutmelding bij ongeldige data. */
export function decodeerFactuur(code: string): Factuur {
  if (!code || code.length > MAX_LINK) throw new Error('Deze factuur-link is onvolledig of te lang.')
  let ruw: unknown
  try {
    const json = decompressFromEncodedURIComponent(code)
    if (!json) throw new Error()
    ruw = JSON.parse(json)
  } catch {
    throw new Error('Deze factuur-link kon niet worden gelezen. Controleer of je de volledige link hebt gekopieerd.')
  }
  const f = normaliseerFactuur(ruw)
  if (!f) throw new Error('Deze factuur-link bevat geen geldige factuur.')
  return f
}

export function factuurLink(f: Factuur, basis = `${location.origin}${location.pathname}`): string {
  return `${basis}#/factuur-bekijken/${codeerFactuur(f)}`
}

export function factuurWhatsappTekst(f: Factuur, link: string): string {
  const k = f.klant.trim()
  const b = f.bedrijf
  const totaal = btwOverzicht(f.regels).totaalIncl
  const iban = b.iban ? ` op ${b.iban}${b.naam ? ` t.n.v. ${b.naam}` : ''}` : ''
  return `Hoi${k ? ` ${k}` : ''}, hierbij factuur ${f.nummer}${f.project ? ` voor ${f.project}` : ''}, totaal ${euro(totaal)}. Je bekijkt hem hier: ${link}\n\nGraag voldoen vóór ${datumNl(f.vervaldatum)}${iban}, o.v.v. ${f.nummer}.`
}

/** Vriendelijke betalingsherinnering (de aannemer verstuurt hem zelf via WhatsApp). */
export function betalingsHerinneringTekst(f: Factuur, link: string, vandaagIso: string): string {
  const k = f.klant.trim()
  const b = f.bedrijf
  const totaal = btwOverzicht(f.regels).totaalIncl
  const dagen = dagenTeLaat(f, vandaagIso)
  const teLaat = dagen > 0 ? ` (${dagen} ${dagen === 1 ? 'dag' : 'dagen'} geleden)` : ''
  const iban = b.iban ? ` op ${b.iban}${b.naam ? ` t.n.v. ${b.naam}` : ''}` : ''
  return `Hoi${k ? ` ${k}` : ''}, dit is een vriendelijke herinnering: factuur ${f.nummer} van ${euro(totaal)} was te voldoen op ${datumNl(f.vervaldatum)}${teLaat}. Je bekijkt de factuur hier: ${link}\n\nGraag overmaken${iban}, o.v.v. ${f.nummer}.\n\nMet vriendelijke groet`
}
