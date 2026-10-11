/**
 * Inspreken: gesproken/getypte omschrijving → projectvelden.
 * 1. Gemini via Supabase Edge Function `inspraak` (sleutel blijft op de server).
 * 2. Valt die weg (geen sleutel, offline, fout), dan een eenvoudige regel-parser hier op het toestel.
 * De uitkomst wordt altijd eerst getoond ('Klopt dit?') voordat er iets wordt aangepast.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './cloud/config'
import { ruimte, scopeVoor } from './ruimtes'
import type { AfvalSoort, ContainerMaat, Project, ProjectType, ScopeKey } from './types'

export interface Inspraak {
  type?: ProjectType
  lengte?: number
  breedte?: number
  hoogte?: number
  /** tegelhoogte in m, of 'plafond' */
  tegelhoogte?: number | 'plafond'
  aan: ScopeKey[]
  uit: ScopeKey[]
  container?: { maat?: ContainerMaat; soort?: AfvalSoort }
  /** tegelformaat in cm */
  wandtegel?: TegelMaat
  vloertegel?: TegelMaat
  klant?: string
  notitie?: string
}

export interface TegelMaat {
  lengte: number
  breedte: number
}

export const SCOPE_KEYS: ScopeKey[] = [
  'sloopwerk', 'container', 'dekvloer', 'egaliseren', 'leidingwerk', 'elektra', 'waterdicht', 'vloerverwarming', 'radiator', 'wandtegels', 'vloertegels',
  'spatwand', 'legvloer', 'ondervloer', 'plinten', 'inloopdouche', 'bad', 'toilet', 'wastafelmeubel', 'fontein', 'ventilatie', 'kitwerk', 'stucwerk', 'plafond', 'deur',
]
const TYPES: ProjectType[] = ['badkamer', 'toilet', 'keuken', 'vloer']
const MATEN: ContainerMaat[] = [3, 6, 10, 15]
const SOORTEN: AfvalSoort[] = ['gemengd', 'puin', 'hout', 'grond']

const maat = (x: unknown, min: number, max: number) => (typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max ? Math.round(x * 100) / 100 : undefined)
const tekst = (x: unknown, n: number) => (typeof x === 'string' && x.trim() ? x.trim().slice(0, n) : undefined)

/** Maakt willekeurige (AI-)uitvoer veilig en geldig. */
export function schoon(r: unknown): Inspraak {
  const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>
  const keys = (x: unknown) => [...new Set((Array.isArray(x) ? x : []).filter((k): k is ScopeKey => SCOPE_KEYS.includes(k as ScopeKey)))]
  const c = (o.container && typeof o.container === 'object' ? o.container : null) as Record<string, unknown> | null
  const aan = keys(o.aan)
  const uit = keys(o.uit).filter((k) => !aan.includes(k))
  const th = o.tegelhoogte === 'plafond' ? 'plafond' : maat(o.tegelhoogte, 0.1, 4)
  const uitkomst: Inspraak = { aan, uit }
  if (TYPES.includes(o.type as ProjectType)) uitkomst.type = o.type as ProjectType
  const l = maat(o.lengte, 0.3, 30), b = maat(o.breedte, 0.3, 30), h = maat(o.hoogte, 1.5, 6)
  if (l) uitkomst.lengte = l
  if (b) uitkomst.breedte = b
  if (h) uitkomst.hoogte = h
  if (th) uitkomst.tegelhoogte = th
  if (c) {
    const m = MATEN.includes(c.maat as ContainerMaat) ? (c.maat as ContainerMaat) : undefined
    const s = SOORTEN.includes(c.soort as AfvalSoort) ? (c.soort as AfvalSoort) : undefined
    if (m || s) uitkomst.container = { ...(m ? { maat: m } : {}), ...(s ? { soort: s } : {}) }
  }
  for (const soort of ['wandtegel', 'vloertegel'] as const) {
    const tm = o[soort] && typeof o[soort] === 'object' ? (o[soort] as Record<string, unknown>) : null
    const a = tm ? maat(tm.lengte, 2, 300) : undefined
    const b = tm ? maat(tm.breedte, 2, 300) : undefined
    if (a && b) uitkomst[soort] = { lengte: Math.max(a, b), breedte: Math.min(a, b) }
  }
  const k = tekst(o.klant, 80)
  if (k) uitkomst.klant = k
  const n = tekst(o.notitie, 300)
  if (n) uitkomst.notitie = n
  return uitkomst
}

// ——— Regel-parser (offline) ———

const WOORDGETAL: Record<string, string> = {
  een: '1', één: '1', twee: '2', drie: '3', vier: '4', vijf: '5', zes: '6', zeven: '7', acht: '8', negen: '9', tien: '10',
  elf: '11', twaalf: '12', vijftien: '15', twintig: '20', anderhalf: '1,5', anderhalve: '1,5', tweeënhalf: '2,5', drieënhalf: '3,5', vierenhalf: '4,5',
}
const getal = (s: string) => Number(s.replace(',', '.'))
const N = String.raw`(\d+(?:[.,]\d+)?)`

const TREFWOORDEN: [RegExp, ScopeKey[]][] = [
  [/\b(slopen|sloop|sloopwerk|eruit|weghalen|strippen|vervangen)\b/, ['sloopwerk']],
  [/\b(container|afvalbak|kuub)\b/, ['container']],
  [/\bdekvloer\b/, ['dekvloer']],
  [/\b(egalis\w*|egaline)\b/, ['egaliseren']],
  [/\b(leidingwerk|leidingen|afvoer verleggen|waterleiding|loodgieter)\b/, ['leidingwerk']],
  [/\b(elektra|elektrisch\w*|spots?|spotjes|stopcontact\w*|verlichting|groep)\b/, ['elektra']],
  [/\b(waterdicht\w*|kimband|afdichten)\b/, ['waterdicht']],
  [/\bvloerverwarming\b/, ['vloerverwarming']],
  [/\b(radiator|designradiator|handdoekradiator)\b/, ['radiator']],
  [/\bwandtegels?\b/, ['wandtegels']],
  [/\bvloertegels?\b/, ['vloertegels']],
  [/\bspatwand\b/, ['spatwand']],
  [/\b(laminaat|pvc[- ]?vloer|pvc)\b/, ['legvloer']],
  [/\bondervloer\b/, ['ondervloer']],
  [/\bplinten?\b/, ['plinten']],
  [/\b(inloopdouche|douche|regendouche|douchegoot)\b/, ['inloopdouche']],
  [/\b(ligbad|bad|vrijstaand bad)\b/, ['bad']],
  [/\b(toilet|wc|hangtoilet|closet|pot)\b/, ['toilet']],
  [/\b(wastafel\w*|badmeubel|meubel)\b/, ['wastafelmeubel']],
  [/\b(fontein\w*)\b/, ['fontein']],
  [/\b(ventilat\w*|afzuig\w*|mechanische afzuiging)\b/, ['ventilatie']],
  [/\b(kitten|kitwerk|kit)\b/, ['kitwerk']],
  [/\b(stuc\w*|schilder\w*|sauzen)\b/, ['stucwerk']],
  [/\b(pvc[- ]?plafond|plafondpanelen|plafondplaten)\b/, ['plafond']],
  [/\b(deur|dorpel)\b/, ['deur']],
]

const TEGEL_MATEN = [10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 90, 100, 120, 150]
/**
 * Corrigeert bekende fouten van spraakherkenning (vooral Android-Chrome):
 * Engelse woorden ('Floor' → vloer) en aan elkaar geplakte tegelmaten ('3060' → '30 bij 60').
 */
export function normaliseerSpraak(invoer: string): string {
  let t = invoer
    .replace(/\bfloors?\b/gi, 'vloer')
    .replace(/\b(walls?|wall tiles?)\b/gi, 'wand')
    .replace(/\btiles?\b/gi, 'tegels')
    .replace(/\b(by|times)\b/gi, 'bij')
    .replace(/(\d)\s*[x×*]\s*(\d)/g, '$1 bij $2')
  if (/tegel|vloer|wand|bij|keer/i.test(t)) {
    t = t.replace(/\b(\d{4,5})\b/g, (heel) => {
      for (let i = 2; i <= heel.length - 2; i++) {
        const a = Number(heel.slice(0, i)), b = Number(heel.slice(i))
        if (heel[i] !== '0' && TEGEL_MATEN.includes(a) && TEGEL_MATEN.includes(b)) return `${a} bij ${b}`
      }
      return heel
    })
  }
  return t
}

/** Eenvoudige parser voor Nederlandse zinnen zoals "badkamer 2 bij 3 meter, tegels tot plafond, inloopdouche". */
export function regelParser(invoer: string): Inspraak {
  let t = ` ${normaliseerSpraak(invoer).toLowerCase().replace(/[“”"]/g, ' ').replace(/\s+/g, ' ')} `
  for (const [w, c] of Object.entries(WOORDGETAL)) t = t.replace(new RegExp(`(?<=\\s)${w}(?=\\s|$|[,.])`, 'g'), c)
  t = t.replace(/(\d+)\s+komma\s+(\d+)/g, '$1,$2').replace(/(\d+)\s*(?:meter|m)\s*(\d{1,2})\b(?!\s*(?:bij|x|kuub|m3|m³))/g, (_, a, b) => `${a},${b.padStart(2, '0')}`)
  const r: Inspraak = { aan: [], uit: [] }

  const typeHit = /\b(badkamer|douche ?ruimte)\b/.test(t) ? 'badkamer' : /\b(toilet ?ruimte|wc ?ruimte)\b/.test(t) || /^\s*(toilet|wc)\b/.test(t) ? 'toilet' : /\bkeuken\b/.test(t) ? 'keuken' : /\b(woonkamer|slaapkamer|vloer leggen|laminaat|pvc[- ]?vloer|vloer)\b/.test(t) && !/\bbadkamer|toilet|keuken\b/.test(t) ? 'vloer' : undefined
  if (typeHit) r.type = typeHit as ProjectType

  // alle "a bij b"-paren; tegelmaten herkennen aan de woorden eromheen, de rest is de ruimte
  const paren = [...t.matchAll(new RegExp(`${N}\\s*(cm|centimeter|m|meter)?\\s*(?:bij|x|×|keer|op)\\s*${N}\\s*(cm|centimeter|m|meter)?`, 'g'))]
  let m: RegExpMatchArray | undefined
  let tegelContext = false
  for (const p of paren) {
    const a = getal(p[1]), b = getal(p[3])
    const na = t.slice(p.index! + p[0].length, p.index! + p[0].length + 22)
    const voor = t.slice(Math.max(0, p.index! - 40), p.index!)
    const cmMaat = a >= 5 && b >= 5 && a <= 300 && b <= 300 && !/^\s*(m|meter)\b/.test(na) && (/tegel/.test(voor + na) || tegelContext)
    if (!cmMaat) {
      if (!m) m = p
      continue
    }
    tegelContext = true
    const maatT = { lengte: Math.max(a, b), breedte: Math.min(a, b) }
    const naSoort = na.match(/^\s*(?:cm)?\s*(?:voor |op |aan )?(?:de )?(vloer|wand|muur)/)?.[1]
    const voorSoort = [...voor.matchAll(/(vloer|wand|muur)/g)].at(-1)?.[1]
    const soort = naSoort ?? voorSoort
    if (soort === 'vloer') r.vloertegel = maatT
    else if (soort === 'wand' || soort === 'muur') r.wandtegel = maatT
    else {
      if (!r.wandtegel) r.wandtegel = maatT
      if (!r.vloertegel) r.vloertegel = maatT
    }
  }
  if (m) {
    const cm = /^c/.test(m[2] ?? m[4] ?? '')
    let a = getal(m[1]), b = getal(m[3])
    if (cm || (a > 30 && b > 30)) (a /= 100), (b /= 100)
    r.lengte = Math.max(a, b)
    r.breedte = Math.min(a, b)
  }
  const h = t.match(new RegExp(`(?:hoogte|plafondhoogte|plafond op|hoog)\\s*(?:van|is)?\\s*${N}|${N}\\s*(?:m|meter)?\\s*hoog\\b`))
  if (h) {
    let v = getal(h[1] ?? h[2])
    if (v > 30) v /= 100
    r.hoogte = v
  }
  if (/tegels? (?:tot (?:aan )?(?:het )?plafond|helemaal|volledig|tot boven)|tot plafond betegel/.test(t)) r.tegelhoogte = 'plafond'
  else {
    const th = t.match(new RegExp(`tegels? tot\\s*${N}\\s*(cm|meter|m)?`))
    if (th) {
      let v = getal(th[1])
      if (/^c/.test(th[2] ?? '') || v > 30) v /= 100
      r.tegelhoogte = v
    }
  }

  // onderdelen, met ontkenning ("geen bad", "zonder container")
  const zinnen = t.split(/[,.;]| en | plus | met /)
  for (const z of zinnen) {
    const neg = /\b(geen|zonder|niet|laat staan|blijft|blijven)\b/.test(z)
    for (const [re, keys] of TREFWOORDEN) {
      if (!re.test(z)) continue
      if (keys[0] === 'bad' && /\bbadkamer\b/.test(z) && !/\b(ligbad|bad )\b/.test(z.replace(/badkamer/g, ''))) continue
      if (keys[0] === 'toilet' && r.type === 'toilet' && /^\s*(toilet|wc)\s*$/.test(z.trim())) continue
      for (const k of keys) (neg ? r.uit : r.aan).push(k)
    }
    if (/\btegels?\b/.test(z) && !/wandtegel|vloertegel/.test(z) && !neg) r.aan.push(...(r.type === 'keuken' ? (['spatwand'] as ScopeKey[]) : (['wandtegels', 'vloertegels'] as ScopeKey[])))
    if (/\b(big ?bags?)\b/.test(z)) r.uit.push('container')
  }
  if (r.wandtegel) r.aan.push('wandtegels')
  if (r.vloertegel) r.aan.push('vloertegels')
  // container: maat en soort
  if (r.aan.includes('container')) {
    const cm = t.match(new RegExp(`${N}\\s*(?:kuub|m3|m³|kubieke)`)) ?? t.match(new RegExp(`container (?:van )?${N}`))
    const v = cm ? getal(cm[1]) : NaN
    const soort: AfvalSoort | undefined = /\bpuin\b/.test(t) ? 'puin' : /\bhout\b/.test(t) ? 'hout' : /\b(grond|zand)\b/.test(t) ? 'grond' : /\b(gemengd|bouwafval|sloopafval)\b/.test(t) ? 'gemengd' : undefined
    const mt = MATEN.find((x) => x === v)
    if (mt || soort) r.container = { ...(mt ? { maat: mt } : {}), ...(soort ? { soort } : {}) }
  }
  const klant = invoer.match(/(?:klant|voor|familie|fam\.?)\s+(?:is\s+)?(?:de\s+)?(?:familie\s+|fam\.?\s+|meneer\s+|mevrouw\s+)?([A-Z][\p{L}-]+(?:\s+(?:van|de|der|den)?\s*[A-Z][\p{L}-]+)?)/u)
  if (klant) r.klant = klant[1]
  return schoon({ ...r, aan: r.aan, uit: r.uit.filter((k) => !r.aan.includes(k) || r.uit.indexOf(k) >= 0) })
}

// ——— AI via Edge Function ———

export const INSPRAAK_URL = `${SUPABASE_URL}/functions/v1/inspraak`

export async function verwerkInspraak(invoer: string, f: typeof fetch = fetch): Promise<{ r: Inspraak; bron: 'ai' | 'regels'; reden?: string }> {
  const t = invoer.trim().slice(0, 600)
  if (!t) return { r: { aan: [], uit: [] }, bron: 'regels' }
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 25000)
    const res = await f(INSPRAAK_URL, { method: 'POST', signal: ctl.signal, headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ tekst: normaliseerSpraak(t) }) })
    clearTimeout(timer)
    if (res.ok) {
      const data = (await res.json()) as { resultaat?: unknown }
      if (data?.resultaat) {
        // Aanvullen met de eigen herkenning voor wat de AI liet liggen (bijv. tegelmaten alleen in de notitie).
        const ai = schoon(data.resultaat)
        const regels = regelParser(t)
        for (const k of ['wandtegel', 'vloertegel', 'hoogte', 'tegelhoogte'] as const) if (ai[k] == null && regels[k] != null) Object.assign(ai, { [k]: regels[k] })
        if (ai.notitie && (ai.wandtegel || ai.vloertegel) && /^[\s\w,×x.-]*tegels?[\s\w,×x.-]*$/i.test(ai.notitie) && /\d/.test(ai.notitie)) delete ai.notitie
        return { r: ai, bron: 'ai' }
      }
    }
    return { r: regelParser(t), bron: 'regels', reden: res.status === 404 ? 'niet-ingesteld' : res.status === 503 ? 'geen-sleutel' : 'fout' }
  } catch {
    return { r: regelParser(t), bron: 'regels', reden: 'offline' }
  }
}

/** Past de herkende gegevens toe op een project (puur). */
export function pasInspraakToe(p: Project, r: Inspraak): Project {
  const type = r.type ?? p.type
  const nieuwType = type !== p.type
  const toegestaan = new Set(ruimte(type).werk)
  const scope = { ...(nieuwType ? scopeVoor(type) : p.scope) }
  for (const k of r.aan) if (toegestaan.has(k)) scope[k] = true
  for (const k of r.uit) if (toegestaan.has(k)) scope[k] = false
  if (r.container && toegestaan.has('container') && !r.uit.includes('container')) scope.container = true
  const a = { ...p.afmetingen }
  if (r.lengte) a.lengte = r.lengte
  if (r.breedte) a.breedte = r.breedte
  if (r.hoogte) a.hoogte = r.hoogte
  if (r.tegelhoogte === 'plafond') a.tegelhoogte = a.hoogte
  else if (typeof r.tegelhoogte === 'number') a.tegelhoogte = Math.min(r.tegelhoogte, a.hoogte)
  else if (r.hoogte && Math.abs(p.afmetingen.tegelhoogte - p.afmetingen.hoogte) < 0.005) a.tegelhoogte = a.hoogte
  return {
    ...p,
    type,
    scope,
    afmetingen: a,
    ...(r.wandtegel ? { wandtegel: { ...p.wandtegel, ...r.wandtegel } } : {}),
    ...(r.vloertegel ? { vloertegel: { ...p.vloertegel, ...r.vloertegel } } : {}),
    ...(r.container ? { container: { ...p.container, ...r.container } } : {}),
    ...(r.klant && !p.klant ? { klant: r.klant } : {}),
    ...(r.notitie ? { notities: p.notities ? `${p.notities}\n${r.notitie}` : r.notitie } : {}),
  }
}
