/** Feedback uit de testversie: puur opgebouwd, verstuurd via WhatsApp of e-mail (geen server). */

export type Gebruiken = 'ja' | 'misschien' | 'nee' | ''

export interface Feedback {
  indruk: string
  mist: string
  gebruiken: Gebruiken
  /** 1 t/m 10, of null als niet ingevuld */
  cijfer: number | null
  naam: string
}

export const legeFeedback = (): Feedback => ({ indruk: '', mist: '', gebruiken: '', cijfer: null, naam: '' })

export const GEBRUIKEN_LABEL: Record<Exclude<Gebruiken, ''>, string> = { ja: 'Ja', misschien: 'Misschien', nee: 'Nee' }

/** Is er genoeg ingevuld om te versturen? */
export const feedbackIngevuld = (f: Feedback) => Boolean(f.indruk.trim() || f.mist.trim() || f.gebruiken || f.cijfer != null)

export function feedbackTekst(f: Feedback, nu = new Date()): string {
  const r = ['Feedback Maatklaar (testversie)', '']
  if (f.cijfer != null) r.push(`Cijfer: ${f.cijfer}/10`)
  if (f.gebruiken) r.push(`Zou je het gebruiken? ${GEBRUIKEN_LABEL[f.gebruiken]}`)
  if (f.indruk.trim()) r.push('', 'Wat vind je ervan?', f.indruk.trim())
  if (f.mist.trim()) r.push('', 'Wat mis je nog?', f.mist.trim())
  r.push('', `Van: ${f.naam.trim() || 'anoniem'}`, `Datum: ${nu.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  return r.join('\n')
}

/** WhatsApp-link zonder nummer: de tester kiest zelf het gesprek met Marius. */
export const whatsappLink = (tekst: string) => `https://wa.me/?text=${encodeURIComponent(tekst)}`

export const mailtoLink = (tekst: string) =>
  `mailto:?subject=${encodeURIComponent('Feedback Maatklaar (testversie)')}&body=${encodeURIComponent(tekst)}`
