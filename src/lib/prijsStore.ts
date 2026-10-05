/** Opslag van eigen prijzen in localStorage + de actieve prijsbron (eigen prijzen over voorbeeldprijzen). */
import { useSyncExternalStore } from 'react'
import { kopieerWinkelPrijzen, metEigenPrijzen, pasPercentageToe, verwijderEigenPrijs, voegSamen, voorbeeldAlsEigen, vulVoorbeeldenAan, zetEigenPrijs, type EigenPrijs, type EigenPrijzen, type KopieerModus } from './eigenPrijzen'
import { voorbeeldPrijsBron, type PrijsBron, type WinkelId } from './prices'
import type { ProductId } from './calc'
import { sleutel } from './modus'

const SLEUTEL = sleutel('prijzen:v1')

function laad(): EigenPrijzen {
  try {
    const ruw = localStorage.getItem(SLEUTEL)
    const data = ruw ? JSON.parse(ruw) : {}
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

let eigen: EigenPrijzen = laad()
let bron: PrijsBron = metEigenPrijzen(voorbeeldPrijsBron, eigen)
const luisteraars = new Set<() => void>()

function bewaar(nieuw: EigenPrijzen) {
  eigen = nieuw
  bron = metEigenPrijzen(voorbeeldPrijsBron, eigen)
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(nieuw))
  } catch {
    /* opslag vol: wijziging blijft in deze sessie actief */
  }
  luisteraars.forEach((f) => f())
}

const abonneer = (f: () => void) => {
  luisteraars.add(f)
  return () => luisteraars.delete(f)
}

// Wijzigingen in een ander tabblad direct overnemen.
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

export const prijsStore = {
  alle: () => eigen,
  bron: () => bron,
  zet(product: ProductId, winkel: WinkelId, wijziging: Partial<Omit<EigenPrijs, 'bijgewerkt'>>) {
    bewaar(zetEigenPrijs(eigen, product, winkel, wijziging))
  },
  herstel(product: ProductId, winkel: WinkelId) {
    bewaar(verwijderEigenPrijs(eigen, product, winkel))
  },
  importeer(extra: EigenPrijzen) {
    bewaar(voegSamen(eigen, extra))
  },
  vervang(nieuw: EigenPrijzen) {
    bewaar(nieuw)
  },
  allesTerug() {
    bewaar({})
  },
  /** Neemt alle voorbeeldprijzen over als eigen prijzen (snelle start / bijvullen zonder overschrijven). */
  voorbeeldOvernemen() {
    bewaar(Object.keys(eigen).length ? vulVoorbeeldenAan(eigen, voorbeeldPrijsBron) : voorbeeldAlsEigen(voorbeeldPrijsBron))
  },
  kopieerWinkel(van: WinkelId, naar: WinkelId, modus: KopieerModus = 'alleen-leeg') {
    bewaar(kopieerWinkelPrijzen(eigen, van, naar, voorbeeldPrijsBron, modus))
  },
  pasPercentage(winkel: WinkelId, procent: number) {
    bewaar(pasPercentageToe(eigen, winkel, procent))
  },
}
