/**
 * Kleine polyfills voor oudere Android WebViews (in-app browsers van WhatsApp, Facebook, Instagram).
 * De bouw zet de syntax al om naar ES2019; dit vult ontbrekende ingebouwde functies aan.
 * Alles wordt alleen toegevoegd als het ontbreekt.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function zet(doel: any, naam: string, waarde: unknown) {
  if (doel && typeof doel[naam] === 'undefined') {
    try {
      Object.defineProperty(doel, naam, { value: waarde, writable: true, configurable: true, enumerable: false })
    } catch {
      /* negeren */
    }
  }
}

function at(this: any, n: number) {
  const len = this.length >>> 0
  let i = Math.trunc(Number(n)) || 0
  if (i < 0) i += len
  return i < 0 || i >= len ? undefined : this[i]
}
zet(Array.prototype, 'at', at)
zet(String.prototype, 'at', at)
zet(Array.prototype, 'findLast', function (this: any[], f: (v: any, i: number, a: any[]) => unknown, t?: unknown) {
  for (let i = this.length - 1; i >= 0; i--) if (f.call(t, this[i], i, this)) return this[i]
  return undefined
})
zet(Array.prototype, 'findLastIndex', function (this: any[], f: (v: any, i: number, a: any[]) => unknown, t?: unknown) {
  for (let i = this.length - 1; i >= 0; i--) if (f.call(t, this[i], i, this)) return i
  return -1
})
zet(Array.prototype, 'toSorted', function (this: any[], f?: (a: any, b: any) => number) {
  return this.slice().sort(f)
})
zet(Array.prototype, 'toReversed', function (this: any[]) {
  return this.slice().reverse()
})
zet(Object, 'hasOwn', (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k))
zet(String.prototype, 'replaceAll', function (this: string, zoek: string | RegExp, vervang: any) {
  if (zoek instanceof RegExp) return this.replace(zoek, vervang)
  return this.split(zoek).join(typeof vervang === 'function' ? vervang(zoek) : vervang)
})
zet(globalThis, 'structuredClone', (w: unknown) => (w === undefined ? undefined : JSON.parse(JSON.stringify(w))))
zet(globalThis, 'queueMicrotask', (f: () => void) => {
  void Promise.resolve().then(f)
})
if (typeof Promise !== 'undefined') {
  zet(Promise, 'allSettled', (lijst: Iterable<unknown>) =>
    Promise.all(
      Array.from(lijst, (p) =>
        Promise.resolve(p).then(
          (value) => ({ status: 'fulfilled', value }),
          (reason) => ({ status: 'rejected', reason }),
        ),
      ),
    ),
  )
}
export {}
