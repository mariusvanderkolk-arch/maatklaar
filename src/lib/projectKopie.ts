/**
 * Kopieer een project naar een nieuwe klant: maten, werkzaamheden en ontwerp gaan mee;
 * klantgegevens, foto's, offertes, meerwerk en urenregistratie niet.
 */
import { uid } from './defaults'
import { bewaarOntwerp, ontwerpStore } from './ontwerp/store'
import { projectStore } from './store'
import type { Project } from './types'

export function kopieerProject(bron: Project, o: { id?: string; nu?: number } = {}): Project {
  const nu = o.nu ?? Date.now()
  const id = o.id ?? uid()
  const basisNaam = bron.naam.trim() || 'project'
  const p: Project = {
    id,
    naam: `Kopie van ${basisNaam}`,
    klant: '',
    adres: '',
    type: bron.type,
    createdAt: nu,
    updatedAt: nu,
    scope: { ...bron.scope },
    afmetingen: {
      ...bron.afmetingen,
      openingen: bron.afmetingen.openingen.map((op) => ({ ...op, id: uid() })),
      douche: { ...bron.afmetingen.douche },
      spatwand: { ...bron.afmetingen.spatwand },
      ...(bron.afmetingen.aanbouw ? { aanbouw: { ...bron.afmetingen.aanbouw } } : {}),
    },
    wandtegel: { ...bron.wandtegel },
    vloertegel: { ...bron.vloertegel },
    legvloer: { ...bron.legvloer },
    snijverlies: bron.snijverlies,
    uurtarief: bron.uurtarief,
    fotos: [],
    afgevinkt: {},
    notities: '',
  }
  if (bron.onvoorzien != null) p.onvoorzien = bron.onvoorzien
  if (bron.marge != null) p.marge = bron.marge
  if (bron.margeRegels) p.margeRegels = { ...bron.margeRegels }
  if (bron.keuken) p.keuken = structuredClone(bron.keuken)
  if (bron.container) p.container = { ...bron.container }
  if (bron.sanitairDoorKlant) p.sanitairDoorKlant = true
  if (bron.aannames != null) p.aannames = bron.aannames
  if (bron.afwerking) p.afwerking = structuredClone(bron.afwerking)
  if (bron.schilderPlan) p.schilderPlan = structuredClone(bron.schilderPlan)
  if (bron.extraArtikelen?.length) p.extraArtikelen = bron.extraArtikelen.map((a) => ({ ...a, sleutel: uid() }))
  if (bron.planning) {
    p.planning = {
      dagUren: bron.planning.dagUren,
      weekend: bron.planning.weekend,
      dagen: { ...bron.planning.dagen },
      droogdagen: { ...bron.planning.droogdagen },
      logs: [],
      kosten: [],
    }
  }
  return p
}

/** Past optioneel een nieuwe projectnaam, klant en adres toe op een kopie. */
export function metNieuweKlant(p: Project, v: { naam?: string; klant?: string; adres?: string }): Project {
  return {
    ...p,
    naam: v.naam?.trim() || p.naam,
    klant: v.klant?.trim() ?? p.klant,
    adres: v.adres?.trim() ?? p.adres,
  }
}

/** Slaat de kopie op en neemt een bestaand ontwerp mee (zonder foto's of ondertekende stukken). */
export function bewaarProjectKopie(bron: Project, kopie: Project): boolean {
  const o = ontwerpStore.get()[bron.id]
  if (o) bewaarOntwerp(kopie.id, { ...structuredClone(o), bijgewerkt: kopie.createdAt })
  return projectStore.voegToe(kopie)
}
