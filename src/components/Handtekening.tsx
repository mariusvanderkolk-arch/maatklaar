import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

/** Tekenvlak voor een handtekening (muis, vinger, pen). Geeft een PNG-data-URL terug, of null als leeg. */
export function HandtekeningVeld({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [leeg, setLeeg] = useState(true)
  const tekent = useRef(false)
  const vorige = useRef<{ x: number; y: number } | null>(null)
  const lengte = useRef(0)

  useEffect(() => {
    const c = ref.current!
    const schaal = () => {
      const r = c.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
      const ctx = c.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2.4
      ctx.strokeStyle = '#1f1a14'
    }
    schaal()
  }, [])

  const punt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const exporteer = () => {
    if (lengte.current < 30) return onChange(null)
    // verklein naar max 600 px breed om de opslag klein te houden
    const c = ref.current!
    const b = Math.min(600, c.width)
    const t = document.createElement('canvas')
    t.width = b
    t.height = Math.round((c.height / c.width) * b)
    t.getContext('2d')!.drawImage(c, 0, 0, t.width, t.height)
    onChange(t.toDataURL('image/png'))
  }
  const wis = () => {
    const c = ref.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    lengte.current = 0
    setLeeg(true)
    onChange(null)
  }

  return (
    <div>
      <div className="relative rounded-xl bg-white ring-1 ring-sand-300">
        <canvas
          ref={ref}
          aria-label="Tekenvlak voor je handtekening"
          role="img"
          className="block h-40 w-full cursor-crosshair touch-none rounded-xl"
          onPointerDown={(e) => {
            ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
            tekent.current = true
            vorige.current = punt(e)
            const ctx = ref.current!.getContext('2d')!
            ctx.beginPath()
            ctx.arc(vorige.current.x, vorige.current.y, 1.1, 0, Math.PI * 2)
            ctx.fillStyle = '#1f1a14'
            ctx.fill()
          }}
          onPointerMove={(e) => {
            if (!tekent.current || !vorige.current) return
            const p = punt(e)
            const ctx = ref.current!.getContext('2d')!
            ctx.beginPath()
            ctx.moveTo(vorige.current.x, vorige.current.y)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
            lengte.current += Math.hypot(p.x - vorige.current.x, p.y - vorige.current.y)
            vorige.current = p
            if (leeg) setLeeg(false)
          }}
          onPointerUp={() => {
            tekent.current = false
            vorige.current = null
            exporteer()
          }}
          onPointerCancel={() => {
            tekent.current = false
            vorige.current = null
          }}
        />
        {leeg && <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-muted/70">Teken hier je handtekening</span>}
        <span className="pointer-events-none absolute inset-x-5 bottom-8 border-b border-dashed border-sand-300" />
      </div>
      <button type="button" onClick={wis} className="mt-1.5 inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-ink-muted hover:text-ink">
        <Eraser className="h-3.5 w-3.5" /> Wissen
      </button>
    </div>
  )
}
