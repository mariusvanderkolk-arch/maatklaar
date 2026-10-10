/** Zwevende hulpknop (klein, in de hoofdbundel). Het chatpaneel wordt pas geladen bij de eerste klik. */
import { Suspense, useState } from 'react'
import { MessageCircleQuestion, X } from 'lucide-react'
import type { Route } from '../../lib/router'
import { laadLater } from '../../lib/lazy'

const HulpPaneel = laadLater(() => import('./HulpPaneel').then((m) => m.HulpPaneel))

/** Schermen met een vaste balk onderaan: knop daarboven zetten. */
const MET_BALK = new Set(['project', 'nieuw', 'bewerken'])

export function HulpKnop({ route }: { route: Route }) {
  const [open, setOpen] = useState(false)
  const [geladen, setGeladen] = useState(false)
  if (route.naam === 'offerte-bekijken') return null
  const hoog = MET_BALK.has(route.naam)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setGeladen(true)
          setOpen((o) => !o)
        }}
        onPointerEnter={() => setGeladen(true)}
        aria-label={open ? 'Hulp sluiten' : 'Hulp en tips'}
        aria-expanded={open}
        aria-controls="maatklaar-hulp"
        className={`no-print fixed right-4 z-40 grid h-13 w-13 place-items-center rounded-full bg-gradient-to-br from-[#F6EBD5] to-[#E3CB98] text-ink shadow-[0_10px_28px_-10px_rgba(80,60,30,.6)] ring-1 ring-gold-300 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 active:scale-95 sm:right-6 ${hoog ? 'bottom-[5.6rem]' : 'bottom-5 sm:bottom-6'} ${open ? 'max-sm:hidden' : ''}`}
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {open ? <X className="h-5.5 w-5.5" /> : <MessageCircleQuestion className="h-6 w-6" />}
      </button>
      {geladen && (
        <Suspense fallback={null}>
          <HulpPaneel open={open} onClose={() => setOpen(false)} route={route} hoog={hoog} />
        </Suspense>
      )}
    </>
  )
}
