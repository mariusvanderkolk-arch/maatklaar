const nf = (d: number) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: d, minimumFractionDigits: 0 })
const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

export const getal = (n: number, d = 2) => nf(d).format(Math.round(n * 10 ** d) / 10 ** d)
export const m2 = (n: number) => `${getal(n)} m²`
export const euro = (n: number) => eur.format(n)
/** Formatteert een datum zonder ooit te gooien (een ongeldige datum geeft '—' in plaats van een RangeError). */
export const formatDatum = (opties: Intl.DateTimeFormatOptions, d: Date | number): string => {
  const x = typeof d === 'number' ? new Date(d) : d
  if (!x || isNaN(x.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('nl-NL', opties).format(x)
  } catch {
    return x.toISOString().slice(0, 10)
  }
}
/** 'JJJJ-MM-DD' (of een volledige ISO-tijd) naar een Date op 12:00 UTC. */
export const isoDatum = (iso: string | undefined | null): Date => new Date(`${String(iso ?? '').slice(0, 10)}T12:00:00Z`)
export const datum = (t: number) => formatDatum({ day: 'numeric', month: 'long', year: 'numeric' }, t)
export const kortDatum = (t: number) => formatDatum({ day: 'numeric', month: 'short' }, t)

/** Leest een getal in dat met komma of punt is ingevoerd. */
export const leesGetal = (s: string): number => {
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
