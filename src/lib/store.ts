/** Projectopslag in localStorage met een klein, reactief store-patroon. */
import { useSyncExternalStore } from 'react'
import { normaliseerProject, voorbeeldProjecten } from './defaults'
import type { Project } from './types'
import { sleutel } from './modus'
import { opslag } from './veiligeOpslag'

const SLEUTEL = sleutel('projecten:v1')
/** Versie van de voorbeeldset; bij een hogere versie worden nieuwe voorbeelden één keer toegevoegd. */
const VOORBEELD_SLEUTEL = sleutel('voorbeelden')
const VOORBEELD_VERSIE = 2

let projecten: Project[] = laad()
const luisteraars = new Set<() => void>()

function laad(): Project[] {
  try {
    const ruw = opslag.getItem(SLEUTEL)
    if (ruw == null) {
      const vb = voorbeeldProjecten()
      try {
        opslag.setItem(SLEUTEL, JSON.stringify(vb))
        opslag.setItem(VOORBEELD_SLEUTEL, String(VOORBEELD_VERSIE))
      } catch {
        /* opslag vol of geblokkeerd: voorbeelden dan alleen in deze sessie */
      }
      return vb
    }
    const data = JSON.parse(ruw)
    let lijst: Project[] = Array.isArray(data) ? data.filter((p) => p && typeof p.id === 'string').map(normaliseerProject) : []
    if (Number(opslag.getItem(VOORBEELD_SLEUTEL) ?? 1) < VOORBEELD_VERSIE) {
      // Nieuwe voorbeelden (keuken, woonkamer) één keer toevoegen voor bestaande gebruikers.
      const nieuw = voorbeeldProjecten().filter((v) => ['keuken-bakker', 'woonkamer-visser'].includes(v.voorbeeldId ?? ''))
      lijst = [...lijst, ...nieuw.filter((v) => !lijst.some((p) => p.voorbeeldId === v.voorbeeldId))]
      try {
        opslag.setItem(SLEUTEL, JSON.stringify(lijst))
        opslag.setItem(VOORBEELD_SLEUTEL, String(VOORBEELD_VERSIE))
      } catch {
        /* alleen deze sessie */
      }
    }
    return lijst
  } catch {
    return []
  }
}

export let opslagFout: string | null = null

/** Status van de laatste opslag (voor de opslag-indicator). */
export interface OpslagStatus {
  /** tijdstip van de laatste geslaagde opslag (ms) */
  opgeslagen: number | null
  fout: string | null
}
let status: OpslagStatus = { opgeslagen: null, fout: null }
const statusLuisteraars = new Set<() => void>()

function bewaar(nieuw: Project[]): boolean {
  projecten = nieuw
  let ok = true
  try {
    opslag.setItem(SLEUTEL, JSON.stringify(nieuw))
    opslagFout = null
    status = { opgeslagen: Date.now(), fout: null }
  } catch {
    ok = false
    opslagFout = 'Opslaan is niet gelukt: de opslag van je browser is vol. Maak een back-up en verwijder oude projecten of foto’s.'
    status = { ...status, fout: opslagFout }
  }
  luisteraars.forEach((f) => f())
  statusLuisteraars.forEach((f) => f())
  return ok
}

export const useOpslagStatus = () =>
  useSyncExternalStore(
    (f) => {
      statusLuisteraars.add(f)
      return () => statusLuisteraars.delete(f)
    },
    () => status,
  )

const abonneer = (f: () => void) => {
  luisteraars.add(f)
  return () => luisteraars.delete(f)
}

export const useProjecten = () => useSyncExternalStore(abonneer, () => projecten)
export const useProject = (id: string | undefined) =>
  useSyncExternalStore(abonneer, () => projecten.find((p) => p.id === id))

export const projectStore = {
  alle: () => projecten,
  abonneer,
  /** Vervangt alle projecten (bijv. bij het terugzetten van een back-up). */
  vervangAlles(nieuw: Project[]) {
    return bewaar(nieuw.map(normaliseerProject))
  },
  voegToe(p: Project) {
    return bewaar([p, ...projecten])
  },
  werkBij(id: string, wijzig: (p: Project) => Project) {
    return bewaar(projecten.map((p) => (p.id === id ? { ...wijzig(p), updatedAt: Date.now() } : p)))
  },
  verwijder(id: string) {
    return bewaar(projecten.filter((p) => p.id !== id))
  },
  herstelVoorbeelden() {
    const eigen = projecten.filter((p) => !p.voorbeeld)
    bewaar([...eigen, ...voorbeeldProjecten()])
  },
}
