import { afterEach, describe, expect, it, vi } from 'vitest'

const laad = async () => {
  vi.resetModules()
  return import('./veiligeOpslag')
}

class NepOpslag {
  data = new Map<string, string>()
  vol = false
  get length() {
    return this.data.size
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.data.get(k) ?? null
  }
  setItem(k: string, v: string) {
    if (this.vol) throw new DOMException('vol', 'QuotaExceededError')
    this.data.set(k, v)
  }
  removeItem(k: string) {
    this.data.delete(k)
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('veilige opslag', () => {
  it('valt zonder window terug op geheugen', async () => {
    const { opslag } = await laad()
    expect(opslag.blijvend).toBe(false)
    opslag.setItem('a', '1')
    expect(opslag.getItem('a')).toBe('1')
    expect(opslag.length).toBe(1)
    opslag.removeItem('a')
    expect(opslag.getItem('a')).toBeNull()
  })

  it('werkt als localStorage null is of een SecurityError gooit (WebView)', async () => {
    vi.stubGlobal('window', { localStorage: null, sessionStorage: null })
    let m = await laad()
    m.opslag.setItem('x', 'y')
    expect(m.opslag.getItem('x')).toBe('y')
    expect(m.opslag.blijvend).toBe(false)

    const w = {}
    for (const k of ['localStorage', 'sessionStorage'])
      Object.defineProperty(w, k, {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError')
        },
      })
    vi.stubGlobal('window', w)
    m = await laad()
    expect(() => m.sessieOpslag.setItem('s', '1')).not.toThrow()
    expect(m.sessieOpslag.getItem('s')).toBe('1')
    expect(m.leesVeilig('niets')).toBeNull()
  })

  it('gebruikt echte opslag als die werkt, en onthoudt bij "vol" in deze sessie', async () => {
    const echt = new NepOpslag()
    vi.stubGlobal('window', { localStorage: echt, sessionStorage: new NepOpslag() })
    const { opslag, schrijfVeilig } = await laad()
    expect(opslag.blijvend).toBe(true)
    opslag.setItem('k', 'v')
    expect(echt.getItem('k')).toBe('v')
    echt.vol = true
    expect(() => opslag.setItem('k', 'w')).toThrow()
    expect(opslag.getItem('k')).toBe('w')
    expect(schrijfVeilig('k', 'z')).toBe(false)
  })
})
