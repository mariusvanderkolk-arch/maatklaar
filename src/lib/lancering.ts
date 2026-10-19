/** Lanceringsperiode: Maatklaar is gratis tot 1 januari 2027 00:00 (Nederlandse tijd). */
export const LANCERING_EINDE = new Date('2026-12-31T23:00:00Z') // = 1 jan 2027 00:00 Europe/Amsterdam

export type Aftelling = { klaar: boolean; dagen: number; uren: number; minuten: number }

/** Resterende tijd tot het einde van de lancering; nooit negatief. */
export function aftelling(nu: Date | number = Date.now(), einde: Date = LANCERING_EINDE): Aftelling {
  const ms = einde.getTime() - (typeof nu === 'number' ? nu : nu.getTime())
  if (!(ms > 0)) return { klaar: true, dagen: 0, uren: 0, minuten: 0 }
  const totMin = Math.ceil(ms / 60000)
  return { klaar: false, dagen: Math.floor(totMin / 1440), uren: Math.floor((totMin % 1440) / 60), minuten: totMin % 60 }
}
