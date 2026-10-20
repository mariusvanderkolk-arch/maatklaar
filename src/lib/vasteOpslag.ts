/**
 * Vraagt de browser om de opslag (projecten in localStorage, foto's in IndexedDB) niet automatisch op te ruimen.
 * Zonder dit mag o.a. Safari gegevens van een website wissen na een tijd niet gebruiken.
 * Eén keer per apparaat bij het eerste echte gebruik (eerste project of foto); geen pop-up in de meeste browsers.
 */
import { opslag } from './veiligeOpslag'
import { sleutel } from './modus'

const VLAG = sleutel('persist:v1')
type Nav = { storage?: { persist?: () => Promise<boolean>; persisted?: () => Promise<boolean> } }
export type VastStand = 'aan' | 'uit' | 'niet-ondersteund'

export async function vraagVasteOpslag(nav: Nav | undefined = typeof navigator !== 'undefined' ? (navigator as Nav) : undefined, opnieuw = false): Promise<VastStand> {
  const s = nav?.storage
  if (!s?.persist) return 'niet-ondersteund'
  try {
    if (await s.persisted?.()) {
      opslag.setItem(VLAG, 'aan')
      return 'aan'
    }
    if (!opnieuw && opslag.getItem(VLAG)) return opslag.getItem(VLAG) === 'aan' ? 'aan' : 'uit'
    const ja = await s.persist()
    opslag.setItem(VLAG, ja ? 'aan' : 'uit')
    return ja ? 'aan' : 'uit'
  } catch {
    return 'uit'
  }
}

/** iPhone/iPad in Safari zonder "Zet op beginscherm": daar wist de browser gegevens na een tijd niet gebruiken. */
export function iosZonderBeginscherm(ua: string, standalone: boolean): boolean {
  return /iPhone|iPad|iPod/.test(ua) && !standalone
}
