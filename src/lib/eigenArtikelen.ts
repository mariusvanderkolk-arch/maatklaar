/** Eigen artikelen van de aannemer: onbeperkt, per categorie, met eenheid, prijs en leverancier. */
import { useSyncExternalStore } from 'react'
import type { EigenArtikelId, Groep } from './calc'
import { GROEPEN } from './calc'
import { sleutel } from './modus'
import { opslag } from './veiligeOpslag'

export interface EigenArtikel {
  id: EigenArtikelId
  groep: Groep
  naam: string
  /** bijv. "per stuk", "per meter", "per zak 25 kg" */
  eenheid: string
  prijs?: number
  leverancier?: string
  bijgewerkt: string
}

const SLEUTEL = sleutel('eigen-artikelen:v1')
const GROEP_IDS = new Set(GROEPEN.map((g) => g.id))

export function normaliseerArtikelen(ruw: unknown): EigenArtikel[] {
  if (!Array.isArray(ruw)) return []
  return ruw
    .filter((a) => a && typeof a.id === 'string' && a.id.startsWith('eigen-') && typeof a.naam === 'string' && a.naam.trim() && GROEP_IDS.has(a.groep))
    .map((a) => ({
      id: a.id,
      groep: a.groep,
      naam: String(a.naam).slice(0, 120),
      eenheid: typeof a.eenheid === 'string' && a.eenheid.trim() ? a.eenheid.slice(0, 40) : 'per stuk',
      ...(typeof a.prijs === 'number' && Number.isFinite(a.prijs) && a.prijs >= 0 ? { prijs: Math.round(a.prijs * 100) / 100 } : {}),
      ...(typeof a.leverancier === 'string' && a.leverancier.trim() ? { leverancier: a.leverancier.slice(0, 80) } : {}),
      bijgewerkt: typeof a.bijgewerkt === 'string' ? a.bijgewerkt : new Date(0).toISOString(),
    }))
}

let lijst: EigenArtikel[] = (() => {
  try {
    return normaliseerArtikelen(JSON.parse(opslag.getItem(SLEUTEL) ?? '[]'))
  } catch {
    return []
  }
})()
const luisteraars = new Set<() => void>()
function bewaar(n: EigenArtikel[]) {
  lijst = n
  try {
    opslag.setItem(SLEUTEL, JSON.stringify(n))
  } catch {
    /* alleen deze sessie */
  }
  luisteraars.forEach((l) => l())
}

export const eigenArtikelStore = {
  alle: () => lijst,
  voegToe(a: Omit<EigenArtikel, 'id' | 'bijgewerkt'>): EigenArtikel {
    const nieuw = { ...a, id: `eigen-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` as EigenArtikelId, bijgewerkt: new Date().toISOString() }
    bewaar([...lijst, nieuw])
    return nieuw
  },
  werkBij(id: string, patch: Partial<Omit<EigenArtikel, 'id'>>) {
    bewaar(lijst.map((a) => (a.id === id ? { ...a, ...patch, bijgewerkt: new Date().toISOString() } : a)))
  },
  verwijder(id: string) {
    bewaar(lijst.filter((a) => a.id !== id))
  },
  vervang(n: EigenArtikel[]) {
    bewaar(normaliseerArtikelen(n))
  },
  abonneer(l: () => void) {
    luisteraars.add(l)
    return () => luisteraars.delete(l)
  },
}

export const useEigenArtikelen = () => useSyncExternalStore(eigenArtikelStore.abonneer, eigenArtikelStore.alle, eigenArtikelStore.alle)
