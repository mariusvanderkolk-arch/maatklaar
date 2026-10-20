/**
 * Marge op materiaal (opslag voor de aannemer). Standaard 0 = uit.
 * Materiaalprijzen in de app zijn incl. btw. De marge wordt over het bedrag excl. btw berekend en daarna komt de btw er weer bij;
 * wiskundig is dat gelijk aan incl-prijs × (1 + marge%), dus de btw blijft exact 21% van de nieuwe prijs excl. btw.
 * De klant ziet de marge nooit apart: die zit in de materiaalprijzen op de offerte/PDF.
 */
import type { InkoopRegel } from './shopping'
import type { Project } from './types'

export const MAX_MARGE = 200
const cent = (n: number) => Math.round(n * 100) / 100
export const begrens = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? Math.min(MAX_MARGE, Math.max(0, n)) : 0)

/** Marge van het project (ontbreekt = 0, dus oude projecten veranderen niet). */
export const projectMarge = (p: Pick<Project, 'marge'>): number => begrens(p.marge)
/** Marge voor één materiaalregel: eigen waarde per regel gaat voor de projectmarge. */
export const regelMarge = (p: Pick<Project, 'marge' | 'margeRegels'>, sleutel: string): number =>
  p.margeRegels && sleutel in p.margeRegels ? begrens(p.margeRegels[sleutel]) : projectMarge(p)

export const verkoopPrijs = (inkoopIncl: number, pct: number) => cent(inkoopIncl * (1 + begrens(pct) / 100))

export interface MargeRegel {
  sleutel: string
  naam: string
  inkoop: number
  pct: number
  marge: number
  verkoop: number
}

export function margeRegels(p: Pick<Project, 'marge' | 'margeRegels'>, regels: InkoopRegel[]): MargeRegel[] {
  return regels.map((r) => {
    const pct = regelMarge(p, r.sleutel)
    const verkoop = verkoopPrijs(r.totaal, pct)
    return { sleutel: r.sleutel, naam: `${r.naam}${r.spec ? ` · ${r.spec}` : ''}`, inkoop: r.totaal, pct, marge: cent(verkoop - r.totaal), verkoop }
  })
}

export interface MargeOverzicht {
  inkoop: number
  marge: number
  verkoop: number
  arbeid: number
  /** marge + arbeid */
  verdiensten: number
  /** bedragen excl. 21% btw */
  exBtw: { inkoop: number; marge: number; verkoop: number; verdiensten: number }
}

export function margeOverzicht(regels: MargeRegel[], arbeid: number, btw = 0.21): MargeOverzicht {
  const inkoop = cent(regels.reduce((s, r) => s + r.inkoop, 0))
  const verkoop = cent(regels.reduce((s, r) => s + r.verkoop, 0))
  const marge = cent(verkoop - inkoop)
  const ex = (n: number) => cent(n / (1 + btw))
  return { inkoop, marge, verkoop, arbeid: cent(arbeid), verdiensten: cent(marge + arbeid), exBtw: { inkoop: ex(inkoop), marge: ex(marge), verkoop: ex(verkoop), verdiensten: ex(marge + arbeid) } }
}
