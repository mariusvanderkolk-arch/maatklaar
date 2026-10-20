/** Welkom: eenmalig voor nieuwe bezoekers, kort 'Welkom terug' voor ingelogde terugkerende gebruikers (één keer per sessie). */
import { opslag } from './veiligeOpslag'
import { sleutel } from './modus'

export const WELKOM_SLEUTEL = sleutel('welkom:v1')
export const TERUG_SLEUTEL = sleutel('welkom-terug:sessie')
export const RONDLEIDING_EVENT = 'maatklaar:rondleiding'

export type WelkomStand = 'nieuw' | 'terug' | null

export function welkomStand(o: { gezien: boolean; ingelogd: boolean; terugAlGetoond: boolean }): WelkomStand {
  if (!o.gezien) return 'nieuw'
  if (o.ingelogd && !o.terugAlGetoond) return 'terug'
  return null
}

const sessie = (): Storage | null => {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null
  } catch {
    return null
  }
}

export const welkomGezien = (): boolean => {
  try {
    return Boolean(opslag.getItem(WELKOM_SLEUTEL))
  } catch {
    return true
  }
}
export const markeerWelkom = () => {
  try {
    opslag.setItem(WELKOM_SLEUTEL, String(Date.now()))
  } catch {
    /* alleen deze sessie */
  }
}
export const terugGetoond = () => Boolean(sessie()?.getItem(TERUG_SLEUTEL))
export const markeerTerug = () => {
  try {
    sessie()?.setItem(TERUG_SLEUTEL, '1')
  } catch {
    /* */
  }
}

/** Voornaam-achtige begroeting uit het e-mailadres is te persoonlijk/onbetrouwbaar: we houden het neutraal. */
export const welkomTekst = {
  nieuwTitel: 'Welkom bij Maatklaar!',
  nieuw: 'Fijn dat je er bent – maak in een paar minuten je eerste offerte, gratis.',
  terug: 'Welkom terug! Fijn dat je er weer bent.',
  afzender: 'het Maatklaar-team',
}
