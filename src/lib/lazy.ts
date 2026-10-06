/** React.lazy met één automatische herlaadpoging als een onderdeel na een update niet meer bestaat. */
import { lazy, type ComponentType } from 'react'
import { sleutel } from './modus'
import { sessieOpslag } from './veiligeOpslag'

const SLEUTEL = sleutel('herladen')

export function laadLater<P extends object>(laad: () => Promise<ComponentType<P>>) {
  return lazy(async () => {
    try {
      const c = await laad()
      sessieOpslag.removeItem(SLEUTEL)
      return { default: c }
    } catch (e) {
      // na een nieuwe versie zijn oude bestanden weg: één keer verversen lost dat op
      if (!sessieOpslag.getItem(SLEUTEL)) {
        try {
          sessieOpslag.setItem(SLEUTEL, '1')
        } catch {
          throw e // zonder opslag niet herladen (anders mogelijk een eindeloze lus)
        }
        location.reload()
        return new Promise<never>(() => {})
      }
      throw e
    }
  })
}
