/** Procedurele tegeltexturen (canvas). Wordt gebruikt voor de 2D-vloer én de 3D-wanden en -vloer. */
import { formaatVan, kleurVan, voegKleur, type Afwerking, type Kleur } from './model'

/** Kleine, voorspelbare random-generator zodat de textuur niet verspringt bij elke render. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexNaarRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
export function varieer(hex: string, f: number): string {
  const [r, g, b] = hexNaarRgb(hex)
  const m = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + f))))
  return `rgb(${m(r)},${m(g)},${m(b)})`
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexNaarRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

function tegelDetail(ctx: CanvasRenderingContext2D, k: Kleur, x: number, y: number, w: number, h: number, ppc: number, rnd: () => number) {
  const acc = k.accent ?? k.voeg
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (k.stijl === 'marmer') {
    const aders = 2 + Math.floor(rnd() * 2)
    for (let i = 0; i < aders; i++) {
      ctx.strokeStyle = rgba(acc, 0.22 + rnd() * 0.25)
      ctx.lineWidth = Math.max(0.6, (0.15 + rnd() * 0.35) * ppc)
      ctx.beginPath()
      const sx = x - w * 0.1
      const sy = y + rnd() * h
      ctx.moveTo(sx, sy)
      let px = sx
      let py = sy
      const stappen = 5
      for (let s = 1; s <= stappen; s++) {
        const nx = x + (w * 1.2 * s) / stappen - w * 0.1
        const ny = py + (rnd() - 0.45) * h * 0.45
        ctx.quadraticCurveTo((px + nx) / 2 + (rnd() - 0.5) * w * 0.1, (py + ny) / 2 + (rnd() - 0.5) * h * 0.2, nx, ny)
        px = nx
        py = ny
      }
      ctx.stroke()
      // fijne zijader
      ctx.lineWidth = Math.max(0.4, 0.08 * ppc)
      ctx.strokeStyle = rgba(acc, 0.15)
      ctx.beginPath()
      ctx.moveTo(x + rnd() * w, y)
      ctx.bezierCurveTo(x + rnd() * w, y + h * 0.3, x + rnd() * w, y + h * 0.7, x + rnd() * w, y + h)
      ctx.stroke()
    }
  } else if (k.stijl === 'terrazzo') {
    const n = Math.round(((w * h) / (ppc * ppc)) * 0.035)
    const kleuren = [acc, '#C8B69A', '#8E9A92', '#FBF8F2', '#B9876A']
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rgba(kleuren[Math.floor(rnd() * kleuren.length)], 0.55 + rnd() * 0.4)
      const rr = (0.25 + rnd() * rnd() * 1.4) * ppc
      ctx.beginPath()
      ctx.ellipse(x + rnd() * w, y + rnd() * h, rr, rr * (0.5 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (k.stijl === 'travertin') {
    // gelaagde steen: zachte horizontale banden + fijne poriën
    const banden = 5 + Math.floor(rnd() * 4)
    for (let i = 0; i < banden; i++) {
      const by = y + rnd() * h
      const bh = (0.6 + rnd() * 3.2) * ppc
      ctx.fillStyle = rgba(rnd() > 0.35 ? acc : '#FFFFFF', 0.06 + rnd() * 0.1)
      ctx.beginPath()
      ctx.moveTo(x, by)
      ctx.bezierCurveTo(x + w * 0.33, by + (rnd() - 0.5) * 2 * ppc, x + w * 0.66, by + (rnd() - 0.5) * 2 * ppc, x + w, by + (rnd() - 0.5) * 2 * ppc)
      ctx.lineTo(x + w, by + bh)
      ctx.bezierCurveTo(x + w * 0.66, by + bh + (rnd() - 0.5) * ppc, x + w * 0.33, by + bh + (rnd() - 0.5) * ppc, x, by + bh)
      ctx.closePath()
      ctx.fill()
    }
    const poriën = Math.round(((w * h) / (ppc * ppc)) * 0.012)
    ctx.fillStyle = rgba(acc, 0.35)
    for (let i = 0; i < poriën; i++) {
      ctx.beginPath()
      ctx.ellipse(x + rnd() * w, y + rnd() * h, (0.15 + rnd() * 0.5) * ppc, (0.08 + rnd() * 0.15) * ppc, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (k.stijl === 'beton') {
    const n = Math.round(((w * h) / (ppc * ppc)) * 0.02) + 6
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rgba(rnd() > 0.5 ? acc : '#FFFFFF', 0.02 + rnd() * 0.035)
      const rr = (1 + rnd() * 6) * ppc
      ctx.beginPath()
      ctx.arc(x + rnd() * w, y + rnd() * h, rr, 0, Math.PI * 2)
      ctx.fill()
    }
    // travertin-achtige gaatjes/lijntjes
    ctx.strokeStyle = rgba(acc, 0.18)
    ctx.lineWidth = Math.max(0.5, 0.12 * ppc)
    for (let i = 0; i < 3; i++) {
      const ly = y + rnd() * h
      ctx.beginPath()
      ctx.moveTo(x + rnd() * w * 0.3, ly)
      ctx.lineTo(x + w * (0.5 + rnd() * 0.5), ly + (rnd() - 0.5) * 2 * ppc)
      ctx.stroke()
    }
  } else if (k.stijl === 'hout') {
    const lijnen = Math.max(4, Math.round(h / (0.9 * ppc)))
    for (let i = 0; i < lijnen; i++) {
      ctx.strokeStyle = rgba(acc, 0.12 + rnd() * 0.22)
      ctx.lineWidth = Math.max(0.5, (0.1 + rnd() * 0.25) * ppc)
      const ly = y + (h * (i + rnd())) / lijnen
      ctx.beginPath()
      ctx.moveTo(x, ly)
      ctx.bezierCurveTo(x + w * 0.3, ly + (rnd() - 0.5) * ppc, x + w * 0.7, ly + (rnd() - 0.5) * ppc, x + w, ly + (rnd() - 0.5) * ppc)
      ctx.stroke()
    }
    if (rnd() > 0.55) {
      ctx.fillStyle = rgba(acc, 0.35)
      ctx.beginPath()
      ctx.ellipse(x + rnd() * w, y + h * (0.3 + rnd() * 0.4), 1.6 * ppc, 0.7 * ppc, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (k.stijl === 'zellige') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h)
    g.addColorStop(0, 'rgba(255,255,255,0.22)')
    g.addColorStop(0.5, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.08)')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
  } else {
    const g = ctx.createRadialGradient(x + w * rnd(), y + h * rnd(), 0, x + w / 2, y + h / 2, Math.max(w, h))
    g.addColorStop(0, 'rgba(255,255,255,0.10)')
    g.addColorStop(1, 'rgba(0,0,0,0.025)')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
  }
  ctx.restore()
}

/**
 * Tekent tegels op (x0,y0)-(x0+w,y0+h) px met ppc pixels per cm.
 * 'liggend' = de lange kant van de tegel horizontaal.
 */
export function tekenTegels(ctx: CanvasRenderingContext2D, af: Afwerking, x0: number, y0: number, w: number, h: number, ppc: number, seed = 1) {
  const k = kleurVan(af.kleur)
  const f = formaatVan(af.formaat)
  const rnd = rng(seed)
  const tl = f.l * ppc
  const tb = f.b * ppc
  const voeg = Math.max(1, (f.l <= 15 ? 0.22 : 0.32) * ppc)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, w, h)
  ctx.clip()
  ctx.fillStyle = voegKleur(af, k)
  ctx.fillRect(x0, y0, w, h)
  const spreiding = k.stijl === 'travertin' ? 0.03 : k.stijl === 'zellige' ? 0.12 : k.stijl === 'hout' ? 0.09 : k.stijl === 'marmer' ? 0.015 : 0.035
  const tegel = (tx: number, ty: number, tw: number, th: number) => {
    ctx.fillStyle = varieer(k.basis, (rnd() - 0.5) * 2 * spreiding)
    if (k.stijl === 'zellige' && typeof ctx.roundRect === 'function') {
      ctx.beginPath()
      ctx.roundRect(tx, ty, tw, th, Math.min(tw, th) * 0.06)
      ctx.fill()
    } else ctx.fillRect(tx, ty, tw, th)
    if (tw > 6 && th > 6) tegelDetail(ctx, k, tx, ty, tw, th, ppc, rnd)
  }
  if (af.verband === 'visgraat' && f.l !== f.b) {
    // visgraat: om en om liggende en staande tegels in een trapvorm (90° visgraat)
    // tegels L×S: liggend op (0,0), staand op (L, S−L); herhaald met (S,S) en (L,−L)
    const L = tl
    const S = tb
    const nMin = Math.floor(-L / S) - 2
    const nMax = Math.ceil((w + h + 2 * L) / (2 * S)) + 2
    const mMin = Math.floor((-h - 2 * L) / (2 * L)) - 2
    const mMax = Math.ceil((w + 2 * L) / (2 * L)) + 2
    const binnen = (x: number, y: number, bw: number, bh: number) => x < x0 + w && y < y0 + h && x + bw > x0 && y + bh > y0
    for (let n = nMin; n <= nMax; n++) {
      for (let m = mMin; m <= mMax; m++) {
        const ox = x0 + n * S + m * L
        const oy = y0 + n * S - m * L
        if (binnen(ox, oy, L, S)) tegel(ox + voeg / 2, oy + voeg / 2, L - voeg, S - voeg)
        if (binnen(ox + L, oy + S - L, S, L)) tegel(ox + L + voeg / 2, oy + S - L + voeg / 2, S - voeg, L - voeg)
      }
    }
    ctx.restore()
    return
  }
  let rij = 0
  for (let y = y0; y < y0 + h; y += tb, rij++) {
    const verschuif = af.verband === 'halfsteens' && rij % 2 === 1 ? -tl / 2 : 0
    for (let x = x0 + verschuif; x < x0 + w; x += tl) {
      tegel(x + voeg / 2, y + voeg / 2, tl - voeg, tb - voeg)
    }
  }
  ctx.restore()
}

/** Pixels per cm zodat het canvas binnen max px blijft, maar de voeg zichtbaar blijft. */
export function kiesPpc(wCm: number, hCm: number, max = 2048, gewenst = 4) {
  return Math.max(1, Math.min(gewenst, max / Math.max(wCm, hCm)))
}

/** Vloertextuur als data-URL (voor de 2D-plattegrond). */
export function vloerAfbeelding(af: Afwerking, L: number, B: number): string | null {
  if (typeof document === 'undefined') return null
  try {
    const ppc = kiesPpc(L, B, 1600, 4)
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(L * ppc))
    c.height = Math.max(1, Math.round(B * ppc))
    const ctx = c.getContext('2d')
    if (!ctx) return null
    tekenTegels(ctx, af, 0, 0, c.width, c.height, ppc, 7)
    return c.toDataURL('image/jpeg', 0.86)
  } catch {
    return null
  }
}

export const PLEISTER = '#F3EEE6'
