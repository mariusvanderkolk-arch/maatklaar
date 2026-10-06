/** Kan deze browser WebGL tekenen? (zonder three.js te laden) */
export function webglBeschikbaar(): boolean {
  try {
    if (typeof document === 'undefined') return false
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
