/**
 * Onderlegger-afbeelding: inlezen (PNG/JPG, of pagina 1 van een PDF — alles in de browser),
 * opslaan in IndexedDB op dit apparaat en terug ophalen. Er wordt niets geüpload.
 */
import { useEffect, useState } from 'react'
import { bewaarFoto, haalFoto, verwijderFoto } from '../photos'
import { controleerBestand, MAX_PX } from './onderlegger'

const sleutel = (projectId: string) => `onderlegger:${projectId}`
const geheugen = new Map<string, string>() // projectId → object-URL
const luisteraars = new Set<(id: string) => void>()

export interface IngelezenTekening {
  blob: Blob
  pxB: number
  pxH: number
  pdf: boolean
}

async function laadBitmap(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('De afbeelding kon niet worden gelezen.'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasNaarPng(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Omzetten mislukt.'))), 'image/png'))
}

/** Herteken op canvas (max MAX_PX): verwijdert metadata en begrenst het formaat. */
async function hertekenAfbeelding(blob: Blob): Promise<IngelezenTekening> {
  const img = await laadBitmap(blob)
  const f = Math.min(1, MAX_PX / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.naturalWidth * f))
  c.height = Math.max(1, Math.round(img.naturalHeight * f))
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas niet beschikbaar.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return { blob: await canvasNaarPng(c), pxB: c.width, pxH: c.height, pdf: false }
}

/** Pagina 1 van een PDF naar PNG, volledig in de browser (pdf.js, zonder eval). */
async function pdfNaarAfbeelding(data: ArrayBuffer): Promise<IngelezenTekening> {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false, enableXfa: false, disableFontFace: false }).promise
  try {
    const pagina = await doc.getPage(1)
    const basis = pagina.getViewport({ scale: 1 })
    const schaal = Math.min(4, MAX_PX / Math.max(basis.width, basis.height))
    const vp = pagina.getViewport({ scale: schaal })
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.floor(vp.width))
    c.height = Math.max(1, Math.floor(vp.height))
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas niet beschikbaar.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    await pagina.render({ canvasContext: ctx, viewport: vp }).promise
    return { blob: await canvasNaarPng(c), pxB: c.width, pxH: c.height, pdf: true }
  } finally {
    void doc.destroy()
  }
}

/** Controleert (grootte + echte bestandssoort) en zet om naar een PNG. Gooit een Error met Nederlandse melding. */
export async function leesTekening(file: File): Promise<IngelezenTekening> {
  const data = await file.arrayBuffer()
  const c = controleerBestand(file.size, new Uint8Array(data.slice(0, 16)))
  if ('fout' in c) throw new Error(c.fout)
  if (c.soort === 'pdf') {
    try {
      return await pdfNaarAfbeelding(data)
    } catch (e) {
      throw new Error(`De PDF kon niet worden gelezen${e instanceof Error && /password/i.test(e.message) ? ' (beveiligd met wachtwoord)' : ''}. Probeer een PNG of JPG.`)
    }
  }
  return hertekenAfbeelding(new Blob([data], { type: c.soort === 'png' ? 'image/png' : 'image/jpeg' }))
}

const meld = (id: string) => luisteraars.forEach((f) => f(id))

export async function bewaarTekening(projectId: string, blob: Blob): Promise<boolean> {
  const oud = geheugen.get(projectId)
  if (oud) URL.revokeObjectURL(oud)
  geheugen.set(projectId, URL.createObjectURL(blob))
  let blijvend = true
  try {
    await bewaarFoto(sleutel(projectId), blob)
  } catch {
    blijvend = false // geen IndexedDB: alleen deze sessie
  }
  meld(projectId)
  return blijvend
}

export async function verwijderTekening(projectId: string): Promise<void> {
  const oud = geheugen.get(projectId)
  if (oud) URL.revokeObjectURL(oud)
  geheugen.delete(projectId)
  await verwijderFoto(sleutel(projectId)).catch(() => {})
  meld(projectId)
}

async function haalTekening(projectId: string): Promise<string | null> {
  if (geheugen.has(projectId)) return geheugen.get(projectId)!
  try {
    const b = await haalFoto(sleutel(projectId))
    if (!b) return null
    const url = URL.createObjectURL(b)
    geheugen.set(projectId, url)
    return url
  } catch {
    return null
  }
}

/** Object-URL van de tekening op dit apparaat, of null. `undefined` = nog aan het laden. */
export function useTekening(projectId: string): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(geheugen.get(projectId))
  useEffect(() => {
    let actief = true
    const laad = () =>
      haalTekening(projectId).then((u) => {
        if (actief) setUrl(u)
      })
    void laad()
    const f = (id: string) => id === projectId && void laad()
    luisteraars.add(f)
    return () => {
      actief = false
      luisteraars.delete(f)
    }
  }, [projectId])
  return url
}
