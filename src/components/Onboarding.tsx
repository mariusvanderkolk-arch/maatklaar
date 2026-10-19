import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Calculator, Camera, FileSignature, ShieldCheck, ShoppingCart, Sparkles } from 'lucide-react'
import { Button, useFocusVal } from './ui'
import { ga } from '../lib/router'
import { projectStore } from '../lib/store'
import { sleutel } from '../lib/modus'
import { APP_VERSIE_KORT } from '../lib/versie'
import { opslag } from '../lib/veiligeOpslag'

export const ONBOARDING_SLEUTEL = sleutel('onboarding')

const SCHERMEN = [
  {
    icon: Camera,
    bij: [Sparkles],
    titel: 'Meet de ruimte op',
    tekst: 'Badkamer, toilet, keuken of vloer: vul de binnenmaten in, zet deuren en ramen erbij en zie de plattegrond live meegroeien. Foto’s bewaar je bij het project.',
  },
  {
    icon: Calculator,
    bij: [ShoppingCart],
    titel: 'Alles wordt uitgerekend',
    tekst: 'Tegels, lijm, voeg, kit, laminaat, plinten en arbeid, met snijverlies. Je krijgt een inkooplijst per bouwmarkt, met voorbeeldprijzen of je eigen prijzen.',
  },
  {
    icon: FileSignature,
    bij: [ShieldCheck],
    titel: 'Offerte, akkoord en planning',
    tekst: 'Stuur de klant een offerte-link, maak een factuur en plan de uren. Vul onder Prijzen je eigen inkoop in. Alles blijft op dit apparaat — de app is gratis (versie ' + APP_VERSIE_KORT + '). Maak af en toe een back-up.',
  },
]

export function Onboarding() {
  const [open, setOpen] = useState(() => {
    try {
      return !opslag.getItem(ONBOARDING_SLEUTEL)
    } catch {
      return false
    }
  })
  const [i, setI] = useState(0)
  const venster = useRef<HTMLDivElement>(null)
  const titelId = useId()
  useFocusVal(venster, open)

  const sluit = () => {
    try {
      opslag.setItem(ONBOARDING_SLEUTEL, 'klaar')
    } catch {
      /* opslag vol of geblokkeerd: dan alleen deze sessie */
    }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sluit()
      if (e.key === 'ArrowRight') setI((x) => Math.min(SCHERMEN.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', f)
    const oud = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', f)
      document.body.style.overflow = oud
    }
  }, [open])

  if (!open) return null
  const s = SCHERMEN[i]
  const laatste = i === SCHERMEN.length - 1
  const voorbeeld = projectStore.alle().find((p) => p.voorbeeld)

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 backdrop-blur-[3px] sm:items-center sm:p-6">
      <div
        ref={venster}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        tabIndex={-1}
        className="w-full overflow-hidden rounded-t-3xl border border-sand-300/70 bg-paper shadow-lift focus:outline-none sm:max-w-md sm:rounded-3xl"
      >
        <div className="bg-grain relative grid h-44 place-items-center border-b border-sand-200 sm:h-48">
          <div className="relative">
            <span className="grid h-24 w-24 place-items-center rounded-[1.75rem] bg-gradient-to-b from-gold-100 to-gold-200 text-gold-700 shadow-[0_18px_40px_-20px_rgba(122,95,51,.7)] ring-1 ring-gold-300">
              <s.icon className="h-11 w-11" strokeWidth={1.6} />
            </span>
            {s.bij.map((B, n) => (
              <span key={n} className="absolute -right-5 -bottom-3 grid h-11 w-11 place-items-center rounded-2xl bg-paper text-gold-700 shadow-card ring-1 ring-sand-300">
                <B className="h-5 w-5" />
              </span>
            ))}
          </div>
          <p className="absolute top-4 left-5 text-[0.75rem] font-semibold tracking-[0.2em] text-gold-700 uppercase">
            Versie {APP_VERSIE_KORT} · stap {i + 1} van {SCHERMEN.length}
          </p>
          <button type="button" onClick={sluit} className="absolute top-2.5 right-3 rounded-lg px-3 py-2 text-[0.82rem] font-medium text-ink-soft hover:bg-sand-200/60 hover:text-ink">
            Overslaan
          </button>
        </div>
        <div className="px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
          <h2 id={titelId} className="text-[1.9rem] leading-tight font-semibold text-ink" aria-live="polite">
            {s.titel}
          </h2>
          <p className="mt-2 min-h-[6.5rem] text-[0.95rem] leading-relaxed text-ink-soft">{s.tekst}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="-ml-1.5 flex" role="tablist" aria-label="Uitleg">
              {SCHERMEN.map((x, n) => (
                <button
                  key={x.titel}
                  type="button"
                  role="tab"
                  aria-selected={n === i}
                  aria-label={`Stap ${n + 1}: ${x.titel}`}
                  onClick={() => setI(n)}
                  className="group grid h-8 min-w-6 place-items-center rounded-full"
                >
                  <span className={`block h-2.5 rounded-full transition-all ${n === i ? 'w-7 bg-gold-500' : 'w-2.5 bg-sand-400 group-hover:bg-gold-400'}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {i > 0 && <Button variant="ghost" aria-label="Vorige" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setI(i - 1)} />}
              {!laatste ? (
                <Button data-autofocus onClick={() => setI(i + 1)}>
                  Volgende <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button data-autofocus variant="gold" onClick={sluit}>
                  Aan de slag
                </Button>
              )}
            </div>
          </div>
          {laatste && voorbeeld && (
            <button
              type="button"
              onClick={() => {
                sluit()
                ga(`/project/${voorbeeld.id}/berekening`)
              }}
              className="mt-4 w-full text-center text-[0.85rem] font-medium text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Of bekijk eerst een voorbeeldproject
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
