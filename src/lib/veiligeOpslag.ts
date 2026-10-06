/**
 * Veilige toegang tot localStorage/sessionStorage.
 * In sommige in-app browsers (Android WebView in WhatsApp/Facebook/Instagram) is opslag uitgeschakeld:
 * `window.localStorage` is dan `null` of gooit een SecurityError. Deze wrapper valt dan terug op geheugen,
 * zodat de app blijft werken (gegevens blijven dan alleen tot de pagina sluit).
 */

export interface VeiligeOpslag {
  getItem(sleutel: string): string | null
  setItem(sleutel: string, waarde: string): void
  removeItem(sleutel: string): void
  key(index: number): string | null
  readonly length: number
  /** true als echte browseropslag werkt; false = alleen in geheugen */
  readonly blijvend: boolean
}

function zoekEcht(naam: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    const s = window[naam]
    if (!s) return null
    const test = '__sw_test__'
    s.setItem(test, '1')
    s.removeItem(test)
    return s
  } catch {
    // SecurityError (opslag uitgeschakeld) of QuotaExceeded bij 0 bytes (oude Safari privémodus)
    try {
      // lezen kan soms nog wél; dan gebruiken we de echte opslag en vangen we schrijffouten af
      const s = typeof window !== 'undefined' ? window[naam] : null
      if (s && typeof s.getItem === 'function') {
        s.getItem('__sw_test__')
        return s
      }
    } catch {
      /* echt niet beschikbaar */
    }
    return null
  }
}

function maak(naam: 'localStorage' | 'sessionStorage'): VeiligeOpslag {
  const echt = zoekEcht(naam)
  const geheugen = new Map<string, string>()
  return {
    getItem(k) {
      if (geheugen.has(k)) return geheugen.get(k)!
      if (!echt) return null
      try {
        return echt.getItem(k)
      } catch {
        return null
      }
    },
    setItem(k, v) {
      if (!echt) {
        geheugen.set(k, String(v))
        return
      }
      try {
        echt.setItem(k, v)
        geheugen.delete(k)
      } catch (e) {
        // in deze sessie toch onthouden; de fout gaat door zodat de stores 'opslag vol' kunnen melden
        geheugen.set(k, String(v))
        throw e
      }
    },
    removeItem(k) {
      geheugen.delete(k)
      if (!echt) return
      try {
        echt.removeItem(k)
      } catch {
        /* negeren */
      }
    },
    key(i) {
      const sleutels = this.sleutels()
      return sleutels[i] ?? null
    },
    get length() {
      return this.sleutels().length
    },
    get blijvend() {
      return !!echt
    },
    sleutels(): string[] {
      const uit = new Set<string>(geheugen.keys())
      if (echt) {
        try {
          for (let i = 0; i < echt.length; i++) {
            const k = echt.key(i)
            if (k != null) uit.add(k)
          }
        } catch {
          /* negeren */
        }
      }
      return [...uit]
    },
  } as VeiligeOpslag & { sleutels(): string[] }
}

export const opslag = maak('localStorage')
export const sessieOpslag = maak('sessionStorage')

/** Leest zonder ooit te gooien. */
export function leesVeilig(sleutel: string): string | null {
  try {
    return opslag.getItem(sleutel)
  } catch {
    return null
  }
}

/** Schrijft zonder te gooien; geeft false terug als het niet lukte. */
export function schrijfVeilig(sleutel: string, waarde: string): boolean {
  try {
    opslag.setItem(sleutel, waarde)
    return true
  } catch {
    return false
  }
}
