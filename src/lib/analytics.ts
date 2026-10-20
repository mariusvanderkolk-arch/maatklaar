/**
 * Anonieme, cookievrije gebruikscijfers (eigen Supabase-tabel `events`, geen derde partijen).
 * Geen persoonsgegevens, geen cookies, geen vaste ID: alleen een willekeurige sessiecode per dag in sessionStorage.
 * Fire-and-forget: faalt stil (tabel ontbreekt, offline, opslag geblokkeerd) en stopt dan voor de rest van de sessie.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './cloud/config'
import { TEST_MODUS } from './modus'

export const EVENT_NAMEN = [
  'page_view', 'project_created', 'offerte_shared', 'offerte_printed', 'factuur_created', 'design_opened',
  'chat_opened', 'chat_question_unanswered', 'feedback_opened', 'signup', 'review_submitted',
] as const
export type EventNaam = (typeof EVENT_NAMEN)[number]

export interface Event {
  site: 'main' | 'test'
  name: EventNaam
  path: string | null
  referrer_host: string | null
  device: 'mobile' | 'desktop'
  inapp: boolean
  session: string | null
  detail: string | null
}

type Omgeving = { fetch: typeof fetch; nu: () => number; dnt: boolean; actief: boolean }
let omg: Omgeving = {
  fetch: (...a) => fetch(...a),
  nu: () => Date.now(),
  dnt: typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true),
  actief: import.meta.env.PROD && Boolean(SUPABASE_URL && SUPABASE_KEY) && typeof location !== 'undefined' && !/^(localhost|127\.)/.test(location.hostname),
}

let rij: Event[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let kapot = false
const gezien = new Set<string>()
let sessieGeheugen: string | null = null

/** Alleen voor tests. */
export function _zetOmgeving(o: Partial<Omgeving>) {
  omg = { ...omg, ...o }
  rij = []
  kapot = false
  gezien.clear()
  sessieGeheugen = null
}

const kort = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null)

/** Haalt e-mailadressen, telefoonnummers en lange cijferreeksen weg uit vrije tekst. */
export function anonimiseer(t: string): string {
  return t
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[mail]')
    .replace(/(\+?\d[\d\s-]{7,}\d)/g, '[nummer]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function sessie(): string | null {
  const dag = new Date(omg.nu()).toISOString().slice(0, 10)
  const k = 'mk-sessie'
  try {
    const r = sessionStorage.getItem(k)
    if (r && r.startsWith(dag + ':')) return r.slice(11)
    const nieuw = Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem(k, `${dag}:${nieuw}`)
    return nieuw
  } catch {
    return (sessieGeheugen ??= Math.random().toString(36).slice(2, 10))
  }
}

function basis(): Pick<Event, 'site' | 'referrer_host' | 'device' | 'inapp'> {
  let ref: string | null = null
  try {
    const h = typeof document !== 'undefined' && document.referrer ? new URL(document.referrer).hostname : ''
    ref = h && h !== location.hostname ? h : null
  } catch {
    /* geen */
  }
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
  return {
    site: TEST_MODUS ? 'test' : 'main',
    referrer_host: kort(ref, 100),
    device: /Mobi|Android|iPhone|iPad/i.test(ua) || (typeof matchMedia !== 'undefined' && matchMedia('(max-width: 767px)').matches) ? 'mobile' : 'desktop',
    inapp: /\bwv\b|WhatsApp|FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|; ?wv\)/i.test(ua),
  }
}

export function track(name: EventNaam, opts: { path?: string; detail?: string } = {}) {
  if (!omg.actief || omg.dnt || kapot) return
  try {
    if (name === 'page_view') {
      const s = `pv:${opts.path ?? ''}`
      if (gezien.has(s)) return
      gezien.add(s)
    }
    rij.push({ ...basis(), name, path: kort(opts.path ?? null, 100), session: sessie(), detail: opts.detail ? anonimiseer(opts.detail) : null })
    if (rij.length >= 20) flush()
    else if (!timer) timer = setTimeout(flush, 3000)
  } catch {
    /* nooit de app hinderen */
  }
}

export function flush() {
  if (timer) clearTimeout(timer)
  timer = null
  if (!rij.length || kapot) return
  const batch = rij.splice(0, 20)
  try {
    omg
      .fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: 'POST',
        keepalive: true,
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json', prefer: 'return=minimal' },
        body: JSON.stringify(batch),
      })
      .then((r) => {
        if (!r.ok) kapot = true // tabel ontbreekt of geweigerd: stil stoppen
      })
      .catch(() => {
        kapot = true
      })
  } catch {
    kapot = true
  }
}

/** Route → pad zonder ID's of offerte-inhoud. */
export function padVoor(r: { naam: string; stap?: string; sectie?: string }): string {
  if (r.naam === 'project') return `/project/${r.stap ?? ''}`
  if (r.naam === 'demo') return `/demo/${r.stap ?? 'maten'}`
  if (r.naam === 'instellingen') return `/instellingen/${r.sectie ?? ''}`.replace(/\/$/, '')
  if (r.naam === 'home') return '/'
  return `/${r.naam}`
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
}
