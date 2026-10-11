/** Maakt van de berekende materialen één inkooplijst met de eigen prijslijst (geen vergelijking tussen winkels). */
import { GROEPEN, omhoog, type Groep, type MateriaalRegel } from './calc'
import type { PrijsBron } from './prices'

export interface InkoopRegel extends MateriaalRegel {
  sleutel: string
  /** prijs per prijseenheid; ontbreekt = geen prijs bekend */
  prijs?: number
  /** regeltotaal */
  totaal: number
  /** te kopen aantal (kan afwijken bij een eigen verpakkingsgrootte) */
  koopAantal: number
  koopVerpakking: string
  bron: 'eigen' | 'voorbeeld' | 'geen'
  leverancier?: string
  productNaam?: string
  link?: string
  bijgewerkt?: string
}

export interface PrijsStatus {
  eigen: number
  voorbeeld: number
  laatstBijgewerkt?: string
}

export interface Inkooplijst {
  regels: InkoopRegel[]
  groepen: { id: Groep; naam: string; regels: InkoopRegel[]; totaal: number }[]
  totaal: number
  /** regels zonder prijs */
  zonderPrijs: number
  /** er staat bij minstens één regel een leverancier */
  metLeverancier: boolean
  prijsStatus: PrijsStatus
  bron: PrijsBron
}

const cent = (n: number) => Math.round(n * 100) / 100
const nl = (n: number) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 }).format(n)

export function maakInkooplijst(materialen: MateriaalRegel[], bron: PrijsBron): Inkooplijst {
  const status: PrijsStatus = { eigen: 0, voorbeeld: 0 }
  let zonderPrijs = 0
  const regels: InkoopRegel[] = materialen.map((m) => {
    const a = bron.aanbod(m.id)
    if (!a) {
      zonderPrijs++
      return { ...m, sleutel: m.sleutel ?? m.id, totaal: 0, koopAantal: m.aantal, koopVerpakking: m.verpakking, bron: 'geen' }
    }
    const anders = a.inhoud != null && a.inhoud > 0 && m.inhoud != null && Math.abs(a.inhoud - m.inhoud) > 1e-9
    const koopAantal = anders ? Math.max(1, omhoog(m.nodig / a.inhoud!)) : m.aantal
    const prijsAantal = anders ? koopAantal : m.prijsAantal
    const koopVerpakking = anders ? `${m.verpakkingSoort ?? 'verpakking'} à ${nl(a.inhoud!)} ${m.nodigEenheid}` : m.verpakking
    if (a.bron === 'eigen') {
      status.eigen++
      if (a.bijgewerkt && (!status.laatstBijgewerkt || a.bijgewerkt > status.laatstBijgewerkt)) status.laatstBijgewerkt = a.bijgewerkt
    } else status.voorbeeld++
    return {
      ...m,
      sleutel: m.sleutel ?? m.id,
      prijs: a.prijs,
      totaal: cent(a.prijs * prijsAantal),
      koopAantal,
      koopVerpakking,
      bron: a.bron,
      leverancier: a.leverancier,
      productNaam: a.productNaam,
      link: a.link,
      bijgewerkt: a.bijgewerkt,
    }
  })
  const groepen = GROEPEN.map((g) => {
    const rs = regels.filter((r) => r.groep === g.id)
    return { ...g, regels: rs, totaal: cent(rs.reduce((s, r) => s + r.totaal, 0)) }
  }).filter((g) => g.regels.length)
  return {
    regels,
    groepen,
    totaal: cent(regels.reduce((s, r) => s + r.totaal, 0)),
    zonderPrijs,
    metLeverancier: regels.some((r) => !!r.leverancier),
    prijsStatus: status,
    bron,
  }
}
