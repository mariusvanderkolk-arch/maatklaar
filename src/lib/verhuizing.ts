/**
 * Verhuizing van mariusvanderkolk-arch.github.io/maatklaar/ naar maatklaar.nl.
 * localStorage/IndexedDB zijn per origin: de gegevens van gebruikers staan nog op het oude adres.
 * De overzetpagina (github.io/maatklaar-overzetten/, zelfde origin als de oude app) leest ze en stuurt ze via
 * postMessage naar het venster dat haar opende. Beide kanten controleren de origin strikt. Er wordt nooit iets gewist.
 */
export const OUDE_ORIGIN: string = import.meta.env.VITE_OUDE_ORIGIN || 'https://mariusvanderkolk-arch.github.io'
export const OVERZET_PAD = '/maatklaar-overzetten/'
/** Origins die gegevens mogen ontvangen (de nieuwe app). */
export const NIEUWE_ORIGINS: string[] = ['https://maatklaar.nl', 'https://www.maatklaar.nl', ...((import.meta.env.VITE_NIEUWE_ORIGIN_EXTRA as string | undefined) ?? '').split(',').filter(Boolean)]

export const BERICHT = 'maatklaar-overzetten'
export const BERICHT_OK = 'maatklaar-overzetten-ok'

export interface OverzetBericht {
  type: typeof BERICHT
  versie: 1
  /** back-up als JSON-tekst (zelfde formaat als het back-upbestand) */
  backup: string
}
export interface OverzetOk {
  type: typeof BERICHT_OK
  projecten: number
  fout?: string
}

export const isOverzetBericht = (d: unknown): d is OverzetBericht =>
  !!d && typeof d === 'object' && (d as OverzetBericht).type === BERICHT && (d as OverzetBericht).versie === 1 && typeof (d as OverzetBericht).backup === 'string'
export const isOverzetOk = (d: unknown): d is OverzetOk => !!d && typeof d === 'object' && (d as OverzetOk).type === BERICHT_OK

/** Toon de overzetknop alleen op het nieuwe adres (niet op github.io zelf, niet in de testversie). */
export const opNieuwAdres = (origin: string, test: boolean) => !test && origin !== OUDE_ORIGIN && (NIEUWE_ORIGINS.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.'))

/** Doel-origin uit de hash van de overzetpagina, alleen als die op de lijst staat. */
export function doelUitHash(hash: string): string | null {
  const m = /[#&]van=([^&]+)/.exec(hash)
  if (!m) return null
  let o: string
  try {
    o = decodeURIComponent(m[1])
  } catch {
    return null
  }
  return NIEUWE_ORIGINS.includes(o) ? o : null
}

export const overzetUrl = (eigenOrigin: string) => `${OUDE_ORIGIN}${OVERZET_PAD}#van=${encodeURIComponent(eigenOrigin)}`
