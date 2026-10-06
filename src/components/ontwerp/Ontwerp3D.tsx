/** React-omhulsel voor de 3D-weergave (three.js). Lazy geladen: alleen op het 3D-tabblad. */
import { useEffect, useRef, useState } from 'react'
import type { Kamer, Ontwerp } from '../../lib/ontwerp/model'
import { maakViewer, type Viewer } from '../../lib/ontwerp/scene3d'

export interface Api3D {
  foto(breedte?: number, hoogte?: number, type?: 'image/png' | 'image/jpeg'): string
  herstelCamera(): void
}

export function Ontwerp3D({ kamer, ontwerp, onApi, onFout, className = '' }: { kamer: Kamer; ontwerp: Ontwerp; onApi?: (api: Api3D | null) => void; onFout?: (melding: string) => void; className?: string }) {
  const houder = useRef<HTMLDivElement>(null)
  const viewer = useRef<Viewer | null>(null)
  const [fout, setFout] = useState<string | null>(null)

  useEffect(() => {
    if (!houder.current) return
    try {
      viewer.current = maakViewer(houder.current)
      onApi?.({ foto: (b, h, t) => viewer.current?.foto(b, h, t) ?? '', herstelCamera: () => viewer.current?.herstelCamera() })
    } catch (e) {
      const m = `3D kon niet starten: ${(e as Error)?.message ?? e}`
      setFout(m)
      onFout?.(m)
    }
    return () => {
      onApi?.(null)
      try {
        viewer.current?.vernietig()
      } catch {
        /* negeren */
      }
      viewer.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      viewer.current?.zet(kamer, ontwerp)
    } catch (e) {
      const m = `3D kon niet worden getekend: ${(e as Error)?.message ?? e}`
      setFout(m)
      onFout?.(m)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kamer.L, kamer.B, kamer.H, kamer.tegelH, ontwerp])

  return (
    <div className={/\b(absolute|fixed)\b/.test(className) ? className : `relative ${className}`}>
      <div ref={houder} className="absolute inset-0" aria-label="3D-weergave van het ontwerp. Sleep om te draaien, knijp om te zoomen." role="img" />
      {fout && <p className="absolute inset-x-4 top-4 rounded-xl bg-paper/95 px-3 py-2 text-sm text-rust ring-1 ring-sand-300">{fout}</p>}
    </div>
  )
}
