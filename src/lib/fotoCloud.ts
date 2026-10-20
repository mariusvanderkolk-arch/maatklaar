/**
 * Foto's ook in de cloud (alleen voor ingelogde gebruikers met sync aan). Local-first blijft: IndexedDB is de bron,
 * de cloud is een kopie in een privé-bucket onder <user_id>/<foto-id>.jpg (zie supabase/fotos-en-links.sql).
 * Werkt de bucket nog niet (SQL niet gedraaid) of is er geen internet, dan gebeurt er stil niets.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { alleFotoIds, bewaarFoto, haalFoto } from './photos'
import { opslag } from './veiligeOpslag'
import { sleutel } from './modus'
import type { Project } from './types'

export const BUCKET = 'project-fotos'
/** Signed URL's zijn kort geldig: alleen om direct te downloaden. */
export const URL_GELDIG_S = 60
const OPGESLAGEN = sleutel('fotos-cloud:v1')
const VEILIG_ID = /^[A-Za-z0-9_-]{1,80}$/

/** Pad in de bucket; alleen veilige id's (geen mappen of rare tekens), anders null. */
export function fotoPad(userId: string, fotoId: string): string | null {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !VEILIG_ID.test(fotoId)) return null
  return `${userId}/${fotoId}.jpg`
}

/** Welke foto-id's horen bij de projecten (geen 3D-ontwerpbeelden: die zijn opnieuw te maken). */
export function projectFotoIds(projecten: Pick<Project, 'fotos'>[]): string[] {
  return [...new Set(projecten.flatMap((p) => (p.fotos ?? []).map((f) => f.id)))].filter((id) => VEILIG_ID.test(id))
}

/** Plan: wat moet omhoog (lokaal, nog niet in de cloud) en wat moet omlaag (in project, niet lokaal). */
export function fotoPlan(nodig: string[], lokaal: Set<string>, geupload: Set<string>) {
  return {
    omhoog: nodig.filter((id) => lokaal.has(id) && !geupload.has(id)),
    omlaag: nodig.filter((id) => !lokaal.has(id)),
  }
}

type Stand = Record<string, string[]>
const leesStand = (): Stand => {
  try {
    return JSON.parse(opslag.getItem(OPGESLAGEN) || '{}') as Stand
  } catch {
    return {}
  }
}
const zetStand = (s: Stand) => {
  try {
    opslag.setItem(OPGESLAGEN, JSON.stringify(s))
  } catch {
    /* niet erg: dan wordt later opnieuw (idempotent) geüpload */
  }
}

let bezig = false

/** Synchroniseert foto's in beide richtingen. Geeft aantallen terug (voor tests/meldingen). */
export async function syncFotos(c: SupabaseClient, userId: string, projecten: Pick<Project, 'fotos'>[]): Promise<{ omhoog: number; omlaag: number }> {
  const res = { omhoog: 0, omlaag: 0 }
  if (bezig || typeof navigator !== 'undefined' && navigator.onLine === false) return res
  bezig = true
  try {
    const stand = leesStand()
    const geupload = new Set(stand[userId] ?? [])
    const lokaal = new Set(await alleFotoIds().catch(() => [] as string[]))
    const plan = fotoPlan(projectFotoIds(projecten), lokaal, geupload)
    const b = c.storage.from(BUCKET)
    for (const id of plan.omhoog) {
      const pad = fotoPad(userId, id)
      const blob = pad && (await haalFoto(id).catch(() => undefined))
      if (!pad || !blob) continue
      const { error } = await b.upload(pad, blob, { upsert: true, contentType: blob.type || 'image/jpeg', cacheControl: '3600' })
      if (error) {
        if (/bucket|not found|row-level|policy/i.test(error.message)) break // SQL nog niet gedraaid: stoppen
        continue
      }
      geupload.add(id)
      res.omhoog++
    }
    for (const id of plan.omlaag) {
      const pad = fotoPad(userId, id)
      if (!pad) continue
      const { data, error } = await b.createSignedUrl(pad, URL_GELDIG_S)
      if (error || !data?.signedUrl) continue
      const r = await fetch(data.signedUrl).catch(() => null)
      if (!r?.ok) continue
      await bewaarFoto(id, await r.blob())
      geupload.add(id)
      res.omlaag++
    }
    zetStand({ ...stand, [userId]: [...geupload] })
  } finally {
    bezig = false
  }
  return res
}

/** Foto ook uit de cloud verwijderen (best effort). */
export async function verwijderCloudFoto(c: SupabaseClient, userId: string, fotoId: string) {
  const pad = fotoPad(userId, fotoId)
  if (!pad) return
  await c.storage.from(BUCKET).remove([pad])
  const stand = leesStand()
  zetStand({ ...stand, [userId]: (stand[userId] ?? []).filter((x) => x !== fotoId) })
}

/** Bij account verwijderen: alle eigen foto's uit de bucket. */
export async function wisAlleCloudFotos(c: SupabaseClient, userId: string) {
  const b = c.storage.from(BUCKET)
  for (let i = 0; i < 50; i++) {
    const { data, error } = await b.list(userId, { limit: 100 })
    if (error || !data?.length) break
    const { error: e2 } = await b.remove(data.map((f) => `${userId}/${f.name}`))
    if (e2) break
  }
  const stand = leesStand()
  delete stand[userId]
  zetStand(stand)
}

/** Start foto-sync als er iemand ingelogd is met sync aan (stil; voor gebruik na openen en na nieuwe foto's). */
export async function fotoSyncNu(): Promise<void> {
  const { cloudStaat, ingelogdeClient } = await import('./cloud/sync')
  const { projectStore } = await import('./store')
  const st = cloudStaat()
  const c = ingelogdeClient()
  if (!c || !st.gebruiker || !st.syncAan) return
  await syncFotos(c, st.gebruiker.id, projectStore.alle()).catch(() => {})
}

/** Na lokaal verwijderen: ook uit de cloud (stil). */
export async function verwijderFotoOveral(fotoId: string): Promise<void> {
  const { cloudStaat, ingelogdeClient } = await import('./cloud/sync')
  const st = cloudStaat()
  const c = ingelogdeClient()
  if (c && st.gebruiker) await verwijderCloudFoto(c, st.gebruiker.id, fotoId).catch(() => {})
}
