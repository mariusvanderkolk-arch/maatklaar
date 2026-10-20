import { useState } from 'react'
import { Hand, PlayCircle, Plus, Route, X } from 'lucide-react'
import { Button } from './ui'
import { ga } from '../lib/router'
import { useCloud } from '../lib/cloud/sync'
import { RONDLEIDING_EVENT, markeerTerug, markeerWelkom, terugGetoond, welkomGezien, welkomStand, welkomTekst } from '../lib/welkom'

export function Welkom() {
  const cloud = useCloud()
  const [gezien] = useState(welkomGezien)
  const [terugAl] = useState(terugGetoond)
  const [weg, setWeg] = useState(false)
  const stand = welkomStand({ gezien, ingelogd: Boolean(cloud.gebruiker), terugAlGetoond: terugAl })
  if (weg || !stand) return null

  if (stand === 'terug') {
    markeerTerug()
    return (
      <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl bg-paper/90 px-4 py-3 text-[0.92rem] text-ink shadow-card ring-1 ring-sand-300/70">
        <Hand className="h-5 w-5 shrink-0 text-gold-600" aria-hidden="true" />
        <p className="flex-1">{welkomTekst.terug}</p>
        <button type="button" aria-label="Sluiten" onClick={() => setWeg(true)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-sand-200/60">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const klaar = () => {
    markeerWelkom()
    setWeg(true)
  }
  return (
    <section aria-labelledby="welkom-titel" data-testid="welkom" className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-gold-100 to-paper px-5 py-5 shadow-card ring-1 ring-gold-300 sm:px-7">
      <button type="button" aria-label="Welkom sluiten" onClick={klaar} className="absolute top-2 right-2 grid h-10 w-10 place-items-center rounded-xl text-ink-muted hover:bg-sand-200/60">
        <X className="h-4.5 w-4.5" />
      </button>
      <h2 id="welkom-titel" className="pr-10 text-[1.45rem] leading-tight font-semibold text-ink">
        {welkomTekst.nieuwTitel}
      </h2>
      <p className="mt-1.5 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft">{welkomTekst.nieuw}</p>
      <p className="mt-1 text-[0.8rem] text-ink-muted">— {welkomTekst.afzender}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          icon={<Plus className="h-4.5 w-4.5" />}
          onClick={() => {
            klaar()
            ga('/nieuw')
          }}
        >
          Start direct
        </Button>
        <Button
          size="lg"
          variant="gold"
          className="w-full sm:w-auto"
          icon={<PlayCircle className="h-4.5 w-4.5" />}
          onClick={() => {
            klaar()
            ga('/demo')
          }}
        >
          Probeer de demo (30 sec)
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-full sm:w-auto"
          icon={<Route className="h-4.5 w-4.5" />}
          onClick={() => {
            klaar()
            window.dispatchEvent(new Event(RONDLEIDING_EVENT))
          }}
        >
          Korte rondleiding (3 stappen)
        </Button>
      </div>
    </section>
  )
}
