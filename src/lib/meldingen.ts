/**
 * Browsermeldingen (optioneel). Alleen na toestemming van de gebruiker; anders blijft het bij de melding in de app.
 * Op Android werkt alleen showNotification via de service worker, dus die gebruiken we als hij er is.
 */
export type MeldingStand = 'aan' | 'uit' | 'geweigerd' | 'niet-ondersteund'

export function meldingStand(): MeldingStand {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'niet-ondersteund'
  const p = Notification.permission
  return p === 'granted' ? 'aan' : p === 'denied' ? 'geweigerd' : 'uit'
}

export async function vraagMeldingen(): Promise<MeldingStand> {
  if (meldingStand() === 'niet-ondersteund') return 'niet-ondersteund'
  try {
    await Notification.requestPermission()
  } catch {
    /* oudere browsers */
  }
  return meldingStand()
}

export async function toonMelding(titel: string, tekst: string, url?: string): Promise<boolean> {
  if (meldingStand() !== 'aan') return false
  const opties: NotificationOptions = { body: tekst, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, tag: 'maatklaar-getekend', data: { url } }
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg) {
      await reg.showNotification(titel, opties)
      return true
    }
    new Notification(titel, opties)
    return true
  } catch {
    return false
  }
}
