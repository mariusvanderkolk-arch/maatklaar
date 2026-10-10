/** Eenvoudige, tolerante zoeker voor Maatklaar-hulp: normaliseren, synoniemen, typfouten, scoren. */
import { KENNIS, type HulpItem } from './kennis'

const STOP = new Set(
  'de het een en of ik je jij u mijn mij me is zijn was wat hoe waar wanneer welke wie kan kun kunnen moet moeten wil wilt doe doen ik hebben heb heeft om te van voor met in op aan bij naar dat dit die er ook nog al wel niet geen maar dan als zo hier daar even graag please iets alles mee uit over door tot'.split(' '),
)

/** spreektaal/synoniem → woord dat in de kennisbank voorkomt */
const SYNONIEMEN: Record<string, string> = {
  wc: 'toilet', closet: 'toilet', plee: 'toilet',
  rekening: 'factuur', nota: 'factuur', facturen: 'factuur', factureren: 'factuur',
  prijsopgave: 'offerte', begroting: 'offerte', aanbieding: 'offerte', offertes: 'offerte', quote: 'offerte',
  inmeten: 'opmeten', meten: 'opmeten', opmeting: 'opmeten', maten: 'opmeten', afmetingen: 'opmeten', maat: 'opmeten',
  kosten: 'prijs', tarief: 'prijs', prijzen: 'prijs', prijslijst: 'prijs', inkoopprijzen: 'prijs', inkoopprijs: 'prijs',
  synchroniseren: 'sync', synchronisatie: 'sync', syncen: 'sync', cloud: 'sync',
  inloggen: 'account', login: 'account', registreren: 'account', aanmelden: 'account',
  backup: 'back-up', reservekopie: 'back-up', kopie: 'back-up',
  driedimensionaal: '3d', '3-d': '3d', visoft: 'ontwerp', tekening: 'ontwerp', plattegrond: 'ontwerp', schets: 'ontwerp',
  foto: 'fotos', foto_s: 'fotos', fotos: 'fotos', plaatjes: 'fotos',
  abonnement: 'gratis', gratis: 'gratis',
  printen: 'pdf', afdrukken: 'pdf', uitprinten: 'pdf',
  avg: 'privacy', gdpr: 'privacy',
  key: 'sleutel', apikey: 'sleutel', api: 'sleutel',
  kapot: 'fout', error: 'fout', bug: 'fout', storing: 'fout', vastgelopen: 'fout',
  uurloon: 'uren', arbeidsuren: 'uren', arbeid: 'uren', manuren: 'uren',
  bouwmarkt: 'winkel', gamma: 'winkel', praxis: 'winkel', hornbach: 'winkel', karwei: 'winkel',
}

export function normaliseer(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9%\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const stam = (w: string) => (w.length > 5 ? w.replace(/(en|s)$/, '') : w)

export function woorden(t: string): string[] {
  const uit: string[] = []
  for (const w0 of normaliseer(t).split(' ')) {
    if (!w0 || STOP.has(w0)) continue
    const w = SYNONIEMEN[w0] ?? w0
    uit.push(w)
    if (w.includes('-')) uit.push(...w.split('-').filter((x) => x.length > 1))
  }
  return uit
}

/** Damerau-Levenshtein (beperkte versie), afgebroken boven max. */
export function afstand(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    let rijMin = Infinity
    for (let j = 1; j <= b.length; j++) {
      const k = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + k)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      rijMin = Math.min(rijMin, d[i][j])
    }
    if (rijMin > max) return max + 1
  }
  return d[a.length][b.length]
}

/** Gelijkenis 0..1 tussen een zoekwoord en een kennisbankwoord. */
export function gelijk(q: string, w: string): number {
  if (q === w) return 1
  if (stam(q) === stam(w)) return 0.95
  if (q.length >= 4 && w.length >= 4 && w.startsWith(q)) return 0.8
  if (q.length >= 4 && w.length >= 4 && q.startsWith(w)) return 0.6
  if (q.length >= 5 && w.length >= 6 && w.includes(q)) return 0.6
  if (q.length < 4 || w.length < 4) return 0
  const max = q.length >= 7 ? 2 : 1
  const d = afstand(q, w, max)
  return d <= max ? (d === 1 ? 0.75 : 0.55) : 0
}

interface Index {
  item: HulpItem
  sleutel: string[]
  vraag: string[]
  tekst: string[]
}
let index: Index[] | null = null
function bouw(): Index[] {
  return (index ??= KENNIS.map((item) => ({
    item,
    sleutel: [...new Set(item.woorden.flatMap(woorden))],
    vraag: [...new Set(woorden(item.vraag))],
    tekst: [...new Set(woorden(item.antwoord))],
  })))
}

export interface Treffer {
  item: HulpItem
  score: number
}

const beste = (q: string, lijst: string[]) => lijst.reduce((m, w) => Math.max(m, gelijk(q, w)), 0)

/** Zoekt de beste antwoorden. Score ~ gemiddelde dekking van de zoekwoorden (0..1+). */
export function zoek(vraag: string, aantal = 3): Treffer[] {
  const q = [...new Set(woorden(vraag))]
  if (q.length === 0) return []
  const zinNorm = normaliseer(vraag)
  return bouw()
    .map(({ item, sleutel, vraag: vw, tekst }) => {
      let s = 0
      let sterk = 0
      for (const w of q) {
        const m = Math.max(beste(w, sleutel) * 1.0, beste(w, vw) * 0.9, beste(w, tekst) * 0.35)
        s += m
        sterk = Math.max(sterk, m)
      }
      let score = s / Math.max(1, q.length)
      // alleen vage (typfout-)treffers: minder zeker
      if (sterk < 0.8) score *= 0.6
      // hele trefwoordzin (bv. "badkamer jansen", "wachtwoord vergeten") letterlijk in de vraag
      if (item.woorden.some((z) => z.includes(' ') && zinNorm.includes(normaliseer(z)))) score += 0.35
      if (normaliseer(item.vraag) === zinNorm) score += 0.5
      return { item, score }
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, aantal)
}

/** Drempel waarboven we een antwoord met vertrouwen geven. */
export const ZEKER = 0.55
export const MISSCHIEN = 0.32

export type Antwoord = { soort: 'zeker'; item: HulpItem; anders: HulpItem[] } | { soort: 'twijfel'; opties: HulpItem[] }

export function beantwoord(vraag: string): Antwoord {
  const t = zoek(vraag, 4)
  if (t[0] && t[0].score >= ZEKER && (!t[1] || t[0].score - t[1].score >= 0.08 || t[0].score >= 0.85))
    return { soort: 'zeker', item: t[0].item, anders: t.slice(1).filter((x) => x.score >= MISSCHIEN).map((x) => x.item).slice(0, 2) }
  const opties = t.filter((x) => x.score >= MISSCHIEN).map((x) => x.item)
  return { soort: 'twijfel', opties: opties.length ? opties.slice(0, 3) : [] }
}

/** Contextuele tips per scherm (route-naam of projectstap). */
export const TIPS: Record<string, string[]> = {
  home: ['start', 'voorbeeld', 'gratis'],
  nieuw: ['ruimtes', 'werkzaamheden'],
  opmeten: ['opmeten', 'tegelformaat', 'ai-foto'],
  ontwerp: ['ontwerp-bediening', 'ontwerp-tegels', 'ontwerp-offerte'],
  berekening: ['berekening', 'rekenregels', 'tegelformaat'],
  inkoop: ['inkoop', 'voorbeeldprijzen', 'prijzen'],
  offerte: ['offerte-link', 'bedrijf', 'pdf'],
  planning: ['planning', 'uren', 'factuur'],
  prijzen: ['prijzen', 'prijs-bulk', 'prijzen-export'],
  facturen: ['factuur', 'factuur-betaald', 'btw'],
  instellingen: ['bedrijf', 'backup', 'ai-sleutel'],
  account: ['cloud', 'wachtwoord', 'privacy'],
  privacy: ['privacy', 'account', 'backup'],
  over: ['wat-is', 'gratis', 'installeren'],
}
