/** Vastgelegd 3D-beeld per project voor op de afgedrukte offerte. In IndexedDB (zoals foto's), anders alleen in geheugen. */
import { useEffect, useState } from 'react'
import { bewaarFoto, haalFoto } from '../photos'

const geheugen = new Map<string, string>()
const luisteraars = new Set<(id: string) => void>()
const sleutel = (projectId: string) => `ontwerp3d:${projectId}`

async function naarBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export async function bewaar3dBeeld(projectId: string, dataUrl: string): Promise<boolean> {
  geheugen.set(projectId, dataUrl)
  let blijvend = true
  try {
    await bewaarFoto(sleutel(projectId), await naarBlob(dataUrl))
  } catch {
    blijvend = false // in-app browser zonder IndexedDB: alleen deze sessie
  }
  luisteraars.forEach((f) => f(projectId))
  return blijvend || geheugen.has(projectId)
}

const leesBlob = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })

export async function haal3dBeeld(projectId: string): Promise<string | null> {
  if (geheugen.has(projectId)) return geheugen.get(projectId)!
  try {
    const b = await haalFoto(sleutel(projectId))
    if (!b) return null
    const url = await leesBlob(b)
    geheugen.set(projectId, url)
    return url
  } catch {
    return null
  }
}

/** Data-URL van het vastgelegde 3D-beeld (of null). */
export function use3dBeeld(projectId: string): string | null {
  const [url, setUrl] = useState<string | null>(geheugen.get(projectId) ?? null)
  useEffect(() => {
    let actief = true
    const laad = () =>
      haal3dBeeld(projectId).then((u) => {
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
