/** Foto's worden lokaal in IndexedDB bewaard (localStorage is daar te klein voor). */
import { useEffect, useState } from 'react'
import { OPSLAG_PREFIX } from './modus'

const DB = OPSLAG_PREFIX
const STORE = 'fotos'

const GEEN_IDB = 'Foto-opslag is niet beschikbaar in deze browser. Open de app in Chrome om foto’s te bewaren.'

let dbBelofte: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  dbBelofte ??= new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const idb = typeof indexedDB !== 'undefined' ? indexedDB : undefined
      if (!idb) return reject(new Error(GEEN_IDB))
      const req = idb.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error(GEEN_IDB))
      req.onblocked = () => reject(new Error(GEEN_IDB))
    } catch {
      reject(new Error(GEEN_IDB))
    }
  }).catch((e) => {
    dbBelofte = null
    throw e
  })
  return dbBelofte
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (e) {
      dbBelofte = null // verbinding kan gesloten zijn; volgende keer opnieuw openen
      reject(e)
    }
  })
}

export const bewaarFoto = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id))
export const haalFoto = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id))
export const verwijderFoto = (id: string) => tx('readwrite', (s) => s.delete(id))
export const alleFotoIds = () => tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((k) => k.map(String))

/** Verkleint een foto naar max. 1600 px (JPEG) zodat hij netjes lokaal past. */
export async function verkleinFoto(file: File, max = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const schaal = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * schaal)
    const h = Math.round(bmp.height * schaal)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82))
  } catch {
    return file
  }
}

/** Geeft een object-URL voor een opgeslagen foto. */
export function useFotoUrl(id: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let actief = true
    let u: string | undefined
    haalFoto(id)
      .then((b) => {
        if (b && actief) {
          u = URL.createObjectURL(b)
          setUrl(u)
        }
      })
      .catch(() => {})
    return () => {
      actief = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [id])
  return url
}
