/** Kort WhatsApp-bericht met de offerte-/tekenlink. */
export function whatsappTekst(klant: string, project: string, link: string): string {
  const k = klant.trim()
  return `Hoi${k ? ` ${k}` : ''}, hierbij de offerte voor ${project.trim() || 'je project'}. Je kunt hem hier bekijken en digitaal ondertekenen: ${link}`
}

/** wa.me-link (werkt in app, in-app browsers en WhatsApp Web op desktop). */
export const whatsappUrl = (tekst: string) => `https://wa.me/?text=${encodeURIComponent(tekst)}`

/** Open WhatsApp; valt terug op dezelfde tab als pop-ups geblokkeerd zijn (in-app browsers). */
export function openWhatsapp(url: string, venster: Window | null = null) {
  if (venster && !venster.closed) {
    venster.location.href = url
    return
  }
  const w = window.open(url, '_blank', 'noopener')
  if (!w) window.location.href = url
}
