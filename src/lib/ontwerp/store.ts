/** Opslag van ontwerpen per project (localStorage via de veilige opslag) + cloud-sync als soort 'design'. */
import { useMemo } from 'react'
import { maakLokaleStore } from '../lokaal'
import { sleutel } from '../modus'
import { uid } from '../defaults'
import type { Project } from '../types'
import { leegOntwerp, normaliseerOntwerp, voorstelIndeling, type Ontwerp } from './model'

export const ontwerpStore = maakLokaleStore<Record<string, Ontwerp>>(
  sleutel('ontwerpen:v1'),
  () => ({}),
  (ruw) => (ruw && typeof ruw === 'object' && !Array.isArray(ruw) ? (ruw as Record<string, Ontwerp>) : {}),
)

/** Voorbeeldprojecten krijgen meteen een mooi ontwerp (alleen in geheugen tot er iets wordt aangepast). */
const voorbeeldCache = new Map<string, Ontwerp>()

function voorbeeldOntwerp(p: Project): Ontwerp {
  let o = voorbeeldCache.get(p.id)
  if (!o) {
    const basis = leegOntwerp(p.type)
    o = {
      ...basis,
      items: voorstelIndeling(p, uid),
      ...(p.voorbeeldId === 'badkamer-jansen'
        ? { vloer: { kleur: 'travertin', formaat: '60x60', verband: 'recht' as const }, wand: { kleur: 'marmer', formaat: '30x60', verband: 'recht' as const } }
        : {}),
    }
    voorbeeldCache.set(p.id, o)
  }
  return o
}

/** Het ontwerp van een project (genormaliseerd), of een leeg/voorbeeld-ontwerp. */
export function ontwerpVan(p: Project, alle: Record<string, Ontwerp> = ontwerpStore.get()): Ontwerp {
  const o = alle[p.id]
  if (o) return normaliseerOntwerp(o, p.type)
  return p.voorbeeld ? voorbeeldOntwerp(p) : leegOntwerp(p.type)
}

export function useOntwerp(p: Project): Ontwerp {
  const alle = ontwerpStore.use()
  const ruw = alle[p.id]
  // stabiele referentie: alleen opnieuw als het opgeslagen ontwerp of het project-type verandert
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ontwerpVan(p, alle), [ruw, p.id, p.type, p.voorbeeld])
}

export function bewaarOntwerp(projectId: string, o: Ontwerp): boolean {
  return ontwerpStore.update((alle) => ({ ...alle, [projectId]: { ...o, bijgewerkt: Date.now() } }))
}

export function verwijderOntwerp(projectId: string) {
  const alle = ontwerpStore.get()
  if (!(projectId in alle)) return
  const { [projectId]: _weg, ...rest } = alle
  void _weg
  ontwerpStore.set(rest)
}

export const heeftOntwerp = (o: Ontwerp) => o.items.length > 0
