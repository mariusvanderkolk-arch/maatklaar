import { useEffect, useMemo, useReducer } from 'react'
import { OffertePoort, type ControleActie, type offerteControle } from './offerteControle'
type Controle = ReturnType<typeof offerteControle>

/** Nieuwe inhoud = nieuwe poort, dus een openstaande actie of oude bevestiging wordt niet hergebruikt. */
export function useOffertePoort(controle: Controle) {
  const poort = useMemo(() => new OffertePoort(controle.heeftPunten, controle.sleutel), [controle.sleutel, controle.heeftPunten])
  useEffect(() => {
    poort.activeer()
    return () => { poort.sluit() }
  }, [poort])
  const [, ververs] = useReducer((n: number) => n + 1, 0)
  const vraag = (actie: ControleActie, label = 'gekozen actie') => {
    poort.vraag(actie, label)
    ververs()
    if (poort.wachtend) {
      const paneel = document.getElementById('offerte-controle')
      paneel?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      paneel?.focus({ preventScroll: true })
    }
  }
  return { wachtend: !!poort.wachtend, bevestigd: poort.bevestigd, label: poort.label, isActueel: () => poort.actief, vraag, bevestig: () => { poort.bevestig(); ververs() }, annuleer: () => { poort.annuleer(); ververs() } }
}
