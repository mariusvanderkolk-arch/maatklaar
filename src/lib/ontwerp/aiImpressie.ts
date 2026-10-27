/**
 * AI-impressie: stuurt één 3D-shot (uit de eigen plattegrond) naar de Edge Function `impressie`,
 * die er met Gemini een fotorealistisch beeld van maakt. Sleutel blijft op de server; alleen voor ingelogde gebruikers.
 * Daarnaast: een kort filmpje (camerabeweging over het beeld) dat hier op het toestel wordt gemaakt — gratis, niets extern.
 */
import { SUPABASE_KEY, SUPABASE_URL } from '../cloud/config'

export const IMPRESSIE_URL = `${SUPABASE_URL}/functions/v1/impressie`

/** Verkleint een data-URL naar max. breedte als JPEG (scheelt upload en kosten). */
export async function verklein(url: string, max = 1536, kwaliteit = 0.85): Promise<string> {
  const img = await laad(url)
  const s = Math.min(1, max / img.naturalWidth)
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * s)
  c.height = Math.round(img.naturalHeight * s)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', kwaliteit)
}

const laad = (url: string) =>
  new Promise<HTMLImageElement>((ok, fout) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = () => fout(new Error('Beeld laden mislukt'))
    i.src = url
  })

export type AiUitkomst = { ok: true; beeld: string } | { ok: false; reden: 'inloggen' | 'geen-sleutel' | 'limiet' | 'fout'; melding: string }

export async function maakAiImpressie(beeld: string, beschrijving: string, f: typeof fetch = fetch): Promise<AiUitkomst> {
  let token: string | null = null
  try {
    token = await (await import('../cloud/sync')).toegangsToken()
  } catch {
    token = null
  }
  if (!token) return { ok: false, reden: 'inloggen', melding: 'Log in (gratis) om een AI-impressie te maken.' }
  try {
    const klein = await verklein(beeld)
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 90000)
    const res = await f(IMPRESSIE_URL, { method: 'POST', signal: ctl.signal, headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ beeld: klein, beschrijving }) })
    clearTimeout(timer)
    const d = (await res.json().catch(() => ({}))) as { beeld?: string; error?: string }
    if (res.ok && d.beeld?.startsWith('data:image/')) return { ok: true, beeld: d.beeld }
    if (res.status === 401) return { ok: false, reden: 'inloggen', melding: d.error ?? 'Log in om een AI-impressie te maken.' }
    if (res.status === 503 || res.status === 404) return { ok: false, reden: 'geen-sleutel', melding: 'AI-impressie is nog niet ingeschakeld.' }
    if (res.status === 429) return { ok: false, reden: 'limiet', melding: d.error ?? 'Even wachten.' }
    return { ok: false, reden: 'fout', melding: d.error ?? 'AI-impressie mislukt, probeer het opnieuw.' }
  } catch {
    return { ok: false, reden: 'fout', melding: 'Geen verbinding of het duurde te lang.' }
  }
}

/** Kort filmpje (±8 s, 1280×720): langzame camerabeweging (in- en meezoomen) over het beeld. Gebruikt MediaRecorder; geeft een Blob (webm/mp4) of null. */
export async function maakFilmpje(beeld: string, seconden = 8): Promise<Blob | null> {
  if (typeof MediaRecorder === 'undefined') return null
  const img = await laad(beeld)
  const c = document.createElement('canvas')
  c.width = 1280
  c.height = 720
  const ctx = c.getContext('2d')!
  const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  const type = types.find((t) => MediaRecorder.isTypeSupported(t))
  if (!type) return null
  const stream = c.captureStream(30)
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 })
  const delen: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && delen.push(e.data)
  const klaar = new Promise<void>((ok) => (rec.onstop = () => ok()))
  const basis = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight)
  const teken = (t: number) => {
    const e = t * t * (3 - 2 * t) // zacht begin en eind
    const zoom = basis * (1.04 + 0.16 * e)
    const w = img.naturalWidth * zoom, h = img.naturalHeight * zoom
    const x = (c.width - w) * (0.15 + 0.7 * e), y = (c.height - h) * 0.5
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.globalAlpha = Math.min(1, t * 6, (1 - t) * 6)
    ctx.drawImage(img, x, y, w, h)
    ctx.globalAlpha = 1
    ctx.font = '500 18px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText('AI-impressie · kan licht afwijken', 24, c.height - 24)
  }
  teken(0)
  rec.start(250)
  const start = performance.now()
  await new Promise<void>((ok) => {
    const stap = () => {
      const t = Math.min(1, (performance.now() - start) / (seconden * 1000))
      teken(t)
      if (t < 1) requestAnimationFrame(stap)
      else ok()
    }
    requestAnimationFrame(stap)
  })
  rec.stop()
  await klaar
  return new Blob(delen, { type: type.split(';')[0] })
}
