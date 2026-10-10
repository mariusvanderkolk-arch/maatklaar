/**
 * Bouwmodus. Dezelfde code bouwt de gewone app en de testversie voor aannemers.
 * De testversie wordt gebouwd met VITE_TEST_MODE=true (automatisch in de repo maatklaar-test).
 */
export const TEST_MODUS = import.meta.env.VITE_TEST_MODE === 'true'

/** Voorvoegsel voor localStorage/IndexedDB, zodat test- en gewone app elkaars gegevens niet raken. */
// Let op: blijft 'slimmer-wonen' (oude merknaam) zodat bestaande gegevens behouden blijven. Niet wijzigen.
export const OPSLAG_PREFIX = TEST_MODUS ? 'slimmer-wonen-test' : 'slimmer-wonen'

export const sleutel = (naam: string) => `${OPSLAG_PREFIX}:${naam}`
