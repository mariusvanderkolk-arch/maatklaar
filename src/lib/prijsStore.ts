/** Opslag van de eigen prijslijst in localStorage + de actieve prijsbron (eigen prijzen over voorbeeldprijzen). */
import { useSyncExternalStore } from 'react'
import { isOudFormaat, metEigenPrijzen, normaliseerPrijzen, pasPercentageToe, verwijderEigenPrijs, voegSamen, vanOudFormaat, voorbeeldAlsEigen, vulVoorbeeldenAan, zetEigenPrijs, type EigenPrijs, type EigenPrijzen } from './eigenPrijzen'
import { oudeWinkelNaam, voorbeeldPrijsBron, type PrijsBron } from './prices'
import type { ProductId } from './calc'
import { sleutel } from './modus'
import { opslag } from './veiligeOpslag'

/** Nieuwe prijslijst (één prijs per artikel). */
const SLEUTEL = sleutel('prijslijst:v2')
/** Oude prijzen per winkel (tot 1.2). Wordt NOOIT gewist: blijft staan als reservekopie. */
export const OUDE_SLEUTEL = sleutel('prijzen:v1')
/** Eenmalige melding na het omzetten. */
const MELDING_SLEUTEL = sleutel('prijslijst:omzetting')

export interface OmzetMelding {
  winkel: string
  uitHoofd: number
  uitAndere: number
  meerdere: number
  gelezen?: boolean
}

function leesJson(k: string): unknown {
  try {
    const r = opslag.getItem(k)
    return r ? JSON.parse(r) : null
  } catch {
    return null
  }
}

function laad(): EigenPrijzen {
  const nieuw = leesJson(SLEUTEL)
  if (nieuw && typeof nieuw === 'object') return normaliseerPrijzen(nieuw)
  // Eerste keer na de update: oude prijzen per winkel omzetten (oude sleutel blijft onaangeroerd staan).
  const oud = leesJson(OUDE_SLEUTEL)
  if (!oud || typeof oud !== 'object') return {}
  if (isOudFormaat(oud)) {
    const o = vanOudFormaat(oud)
    try {
      opslag.setItem(SLEUTEL, JSON.stringify(o.prijzen))
      if (o.winkel && (o.uitHoofd || o.uitAndere))
        opslag.setItem(MELDING_SLEUTEL, JSON.stringify({ winkel: oudeWinkelNaam(o.winkel), uitHoofd: o.uitHoofd, uitAndere: o.uitAndere, meerdere: o.meerdere } satisfies OmzetMelding))
    } catch {
      /* opslag vol: omzetting geldt in deze sessie, volgende keer opnieuw */
    }
    return o.prijzen
  }
  return normaliseerPrijzen(oud)
}

let eigen: EigenPrijzen = laad()
let bron: PrijsBron = metEigenPrijzen(voorbeeldPrijsBron, eigen)
const luisteraars = new Set<() => void>()

function bewaar(nieuw: EigenPrijzen) {
  eigen = nieuw
  bron = metEigenPrijzen(voorbeeldPrijsBron, eigen)
  try {
    opslag.setItem(SLEUTEL, JSON.stringify(nieuw))
  } catch {
    /* opslag vol: wijziging blijft in deze sessie actief */
  }
  luisteraars.forEach((f) => f())
}

const abonneer = (f: () => void) => {
  luisteraars.add(f)
  return () => luisteraars.delete(f)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SLEUTEL) {
      eigen = laad()
      bron = metEigenPrijzen(voorbeeldPrijsBron, eigen)
      luisteraars.forEach((f) => f())
    }
  })
}

export const useEigenPrijzen = () => useSyncExternalStore(abonneer, () => eigen)
/** De prijsbron die de hele app gebruikt: eigen prijzen gaan vóór voorbeeldprijzen. */
export const usePrijsBron = () => useSyncExternalStore(abonneer, () => bron)

export function omzetMelding(): OmzetMelding | null {
  const m = leesJson(MELDING_SLEUTEL) as OmzetMelding | null
  return m && !m.gelezen ? m : null
}
export function omzetMeldingGelezen() {
  const m = leesJson(MELDING_SLEUTEL) as OmzetMelding | null
  if (m)
    try {
      opslag.setItem(MELDING_SLEUTEL, JSON.stringify({ ...m, gelezen: true }))
    } catch {
      /* */
    }
}
/** Ruwe oude prijzen per winkel (reservekopie), of null. */
export const oudePrijzen = () => {
  const o = leesJson(OUDE_SLEUTEL)
  return isOudFormaat(o) ? o : null
}

export const prijsStore = {
  alle: () => eigen,
  abonneer,
  bron: () => bron,
  zet(product: ProductId, wijziging: Partial<Omit<EigenPrijs, 'bijgewerkt'>>) {
    bewaar(zetEigenPrijs(eigen, product, wijziging))
  },
  herstel(product: ProductId) {
    bewaar(verwijderEigenPrijs(eigen, product))
  },
  importeer(extra: EigenPrijzen) {
    bewaar(voegSamen(eigen, normaliseerPrijzen(extra)))
  },
  /** Vervangt alles (cloud/back-up); accepteert ook het oude formaat. */
  vervang(nieuw: unknown) {
    bewaar(normaliseerPrijzen(nieuw))
  },
  allesTerug() {
    bewaar({})
  },
  voorbeeldOvernemen() {
    bewaar(Object.keys(eigen).length ? vulVoorbeeldenAan(eigen, voorbeeldPrijsBron) : voorbeeldAlsEigen(voorbeeldPrijsBron))
  },
  pasPercentage(procent: number, filter: { leverancier?: string; groep?: string } = {}) {
    bewaar(pasPercentageToe(eigen, procent, filter))
  },
}
