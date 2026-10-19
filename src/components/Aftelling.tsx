import { useEffect, useState } from 'react'
import { aftelling } from '../lib/lancering'

export function useAftelling() {
  const [a, setA] = useState(() => aftelling())
  useEffect(() => {
    const t = setInterval(() => setA(aftelling()), 15000)
    return () => clearInterval(t)
  }, [])
  return a
}

export function AftelKlok({ klein = false }: { klein?: boolean }) {
  const a = useAftelling()
  if (a.klaar) return <p className="text-sm font-medium text-ink-soft">De lanceringsperiode is afgelopen.</p>
  const vakken: [number, string][] = [
    [a.dagen, a.dagen === 1 ? 'dag' : 'dagen'],
    [a.uren, 'uur'],
    [a.minuten, a.minuten === 1 ? 'minuut' : 'minuten'],
  ]
  return (
    <div className="flex gap-2" role="timer" aria-label={`Nog ${a.dagen} dagen, ${a.uren} uur en ${a.minuten} minuten gratis`}>
      {vakken.map(([n, l]) => (
        <div key={l} className={`rounded-xl bg-paper text-center ring-1 ring-gold-200 ${klein ? 'min-w-14 px-2 py-1.5' : 'min-w-20 px-3 py-3'}`}>
          <div className={`font-semibold tabular-nums text-ink ${klein ? 'text-lg' : 'text-3xl'}`}>{n}</div>
          <div className="text-[0.7rem] uppercase tracking-wider text-ink-muted">{l}</div>
        </div>
      ))}
    </div>
  )
}
