/**
 * Spraakherkenning-uitslagen omzetten naar tekst zonder dubbelingen.
 * Desktop-Chrome levert losse (incrementele) resultaten; Android-Chrome levert vaak
 * cumulatieve resultaten ("badkamer", "badkamer 2 bij 3", ...) en herhaalt eerdere finals.
 * We bouwen de tekst daarom elke keer opnieuw op uit álle resultaten in plaats van aan te plakken.
 */
export interface SpraakAlternatief {
  transcript: string
}
export type SpraakResultaat = ArrayLike<SpraakAlternatief> & { isFinal: boolean }

const schoon = (s: string) => s.replace(/\s+/g, ' ').trim()
const norm = (s: string) => schoon(s).toLowerCase()

/** Voegt b toe aan a; slaat over of vervangt als het (deels) een herhaling is. */
export function plakVast(a: string, b: string): string {
  const x = schoon(a)
  const y = schoon(b)
  if (!y) return x
  if (!x) return y
  const nx = norm(x)
  const ny = norm(y)
  if (ny.startsWith(nx)) return y // cumulatief: nieuw bevat het oude
  if (nx === ny || nx.endsWith(` ${ny}`)) return x // herhaling aan het eind
  // overlap: einde van a = begin van b
  const wa = x.split(' ')
  const wb = y.split(' ')
  for (let n = Math.min(wa.length, wb.length); n > 0; n--) {
    if (norm(wa.slice(-n).join(' ')) === norm(wb.slice(0, n).join(' '))) return [...wa, ...wb.slice(n)].join(' ')
  }
  return `${x} ${y}`
}

/** Bouwt de tekst van één sessie uit event.results: definitief (alleen finals, ontdubbeld) + lopende tussentekst. */
export function transcriptUit(results: ArrayLike<SpraakResultaat>): { definitief: string; tussen: string } {
  let definitief = ''
  let tussen = ''
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const t = r?.[0]?.transcript ?? ''
    if (r.isFinal) definitief = plakVast(definitief, t)
    else tussen = t // alleen de laatste tussentekst
  }
  tussen = schoon(tussen)
  if (tussen && definitief && norm(tussen).startsWith(norm(definitief))) tussen = schoon(tussen.slice(definitief.length))
  if (tussen && norm(definitief).endsWith(norm(tussen))) tussen = ''
  return { definitief, tussen }
}

export const isAndroid = (ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') => /Android/i.test(ua)
