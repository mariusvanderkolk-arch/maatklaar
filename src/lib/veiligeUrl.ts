/** Alleen http(s)-links doorlaten (geen javascript:, data:, vbscript: …) — voor links uit invoer, import of cloud. */
export function veiligeUrl(u: string | undefined | null): string | undefined {
  if (!u) return undefined
  const t = u.trim()
  try {
    const url = new URL(t)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Draait de pagina in een (vreemd) frame? Dan niet laten tekenen (clickjacking). */
export function inVreemdFrame(w: Window = window): boolean {
  try {
    return w.top !== w.self && w.top?.location.origin !== w.location.origin
  } catch {
    return true
  }
}
