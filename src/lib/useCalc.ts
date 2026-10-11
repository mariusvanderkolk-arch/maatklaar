import { useMemo } from 'react'
import { berekenArbeid, berekenMaterialen, oppervlakkenVan, type MateriaalRegel, type ProductId } from './calc'
import { SETS } from './artikelen'
import { catalogusItem, eenheidLabel } from './catalogus'
import { eigenArtikelStore, useEigenArtikelen, type EigenArtikel } from './eigenArtikelen'
import type { PrijsBron } from './prices'
import { usePrijsBron } from './prijsStore'
import { maakInkooplijst } from './shopping'
import type { Project } from './types'

/**
 * Oude sets: had de aannemer een eigen setprijs en nog geen eigen prijs voor de losse artikelen,
 * dan blijft de setregel staan in plaats van de losse artikelen (zo verandert zijn offerte niet ongemerkt).
 */
export function pasSetsToe(regels: MateriaalRegel[], bron: PrijsBron): MateriaalRegel[] {
  let uit = regels
  for (const [set, delen] of Object.entries(SETS)) {
    const id = set as ProductId
    if (bron.aanbod(id)?.bron !== 'eigen') continue
    if (delen.some((d) => bron.aanbod(d)?.bron === 'eigen')) continue
    const i = uit.findIndex((r) => r.uitSet === id)
    if (i < 0) continue
    const c = catalogusItem(id)!
    const setRegel: MateriaalRegel = { id, groep: c.groep, naam: c.naam.replace(' (oude set)', ''), nodig: 1, nodigEenheid: 'set', aantal: 1, verpakking: 'set', prijsAantal: 1, toelichting: 'Je eigen setprijs (losse artikelen nog niet geprijsd)' }
    uit = [...uit.slice(0, i).filter((r) => r.uitSet !== id), setRegel, ...uit.slice(i).filter((r) => r.uitSet !== id)]
  }
  return uit
}

/** Handmatig toegevoegde artikelen als materiaalregels. */
export function extraRegels(p: Project, artikelen: EigenArtikel[]): MateriaalRegel[] {
  const uit: MateriaalRegel[] = []
  for (const x of p.extraArtikelen ?? []) {
    const eigen = artikelen.find((a) => a.id === x.id)
    const c = eigen ?? catalogusItem(x.id as ProductId)
    if (!c || !(x.aantal > 0)) continue
    const eenheid = (eigen ? eigen.eenheid : eenheidLabel(catalogusItem(x.id as ProductId)!)).replace(/^per /, '')
    uit.push({ id: x.id as ProductId, groep: c.groep, naam: c.naam.replace(' (oude set)', ''), nodig: x.aantal, nodigEenheid: eenheid, aantal: x.aantal, verpakking: eenheid, prijsAantal: x.aantal, toelichting: 'Zelf toegevoegd', sleutel: `extra-${x.sleutel}`, handmatig: x.sleutel })
  }
  return uit
}

/** Prijsbron + eigen artikelen (die hun prijs zelf dragen). */
export function metEigenArtikelen(bron: PrijsBron, artikelen: EigenArtikel[]): PrijsBron {
  if (!artikelen.length) return bron
  return {
    ...bron,
    aanbod(id) {
      const a = artikelen.find((x) => x.id === id)
      if (a) return a.prijs == null ? undefined : { prijs: a.prijs, bron: 'eigen', leverancier: a.leverancier, bijgewerkt: a.bijgewerkt.slice(0, 10) }
      return bron.aanbod(id)
    },
  }
}

export function berekenAlles(p: Project, basisBron: PrijsBron, artikelen: EigenArtikel[] = eigenArtikelStore.alle()) {
  const bron = metEigenArtikelen(basisBron, artikelen)
  const oppervlakken = oppervlakkenVan(p)
  const materialen = [...pasSetsToe(berekenMaterialen(p), bron), ...extraRegels(p, artikelen)]
  const inkoop = maakInkooplijst(materialen, bron)
  const arbeid = berekenArbeid(p)
  const uren = arbeid.reduce((s, r) => s + r.uren, 0)
  return { oppervlakken, materialen, inkoop, arbeid, uren, arbeidKosten: uren * p.uurtarief }
}

/** Berekening voor een project met de actieve prijsbron (eigen prijzen gaan voor voorbeeldprijzen). */
export function useBerekening(p: Project) {
  const bron = usePrijsBron()
  const artikelen = useEigenArtikelen()
  return useMemo(() => berekenAlles(p, bron, artikelen), [p, bron, artikelen])
}
