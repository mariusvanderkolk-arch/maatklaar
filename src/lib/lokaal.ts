/** Kleine reactieve store bovenop localStorage (voor instellingen). */
import { useSyncExternalStore } from 'react'
import { opslag } from './veiligeOpslag'

export interface LokaleStore<T> {
  get(): T
  set(waarde: T): boolean
  update(f: (oud: T) => T): boolean
  use(): T
  /** laatste opslagfout (bijv. opslag vol) */
  fout(): string | null
  /** luisteren naar wijzigingen (voor de cloud-sync) */
  abonneer(f: () => void): () => void
}

export function maakLokaleStore<T>(sleutel: string, standaard: () => T, normaliseer: (ruw: unknown) => T = (r) => ({ ...standaard(), ...(r as object) }) as T): LokaleStore<T> {
  let fout: string | null = null
  const laad = (): T => {
    try {
      const ruw = opslag.getItem(sleutel)
      return ruw == null ? standaard() : normaliseer(JSON.parse(ruw))
    } catch {
      return standaard()
    }
  }
  let waarde = laad()
  const luisteraars = new Set<() => void>()
  const meld = () => luisteraars.forEach((f) => f())
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === sleutel) {
        waarde = laad()
        meld()
      }
    })
  }
  const set = (nieuw: T) => {
    waarde = nieuw
    let ok = true
    try {
      opslag.setItem(sleutel, JSON.stringify(nieuw))
      fout = null
    } catch {
      fout = 'Opslaan is niet gelukt: de opslag van je browser is vol.'
      ok = false
    }
    meld()
    return ok
  }
  const abonneer = (f: () => void) => {
    luisteraars.add(f)
    return () => {
      luisteraars.delete(f)
    }
  }
  return {
    get: () => waarde,
    set,
    update: (f) => set(f(waarde)),
    use: () => useSyncExternalStore(abonneer, () => waarde),
    fout: () => fout,
    abonneer,
  }
}
