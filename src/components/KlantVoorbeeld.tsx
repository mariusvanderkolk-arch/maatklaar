import { useEffect, useRef, useState } from 'react'
import { Monitor, Smartphone, Tablet, MonitorSmartphone } from 'lucide-react'
import { Button, Dialog } from './ui'
import { APPARATEN, schaalVoor, voorbeeldUrl, type Apparaat } from '../lib/voorbeeld'
import type { OfferteData } from '../lib/offerte'

const ICOON: Record<Apparaat, typeof Monitor> = { desktop: Monitor, tablet: Tablet, mobiel: Smartphone }

/** Keuze Desktop / Tablet / Mobiel. */
export function ApparaatKeuze({ waarde, onChange }: { waarde: Apparaat; onChange: (a: Apparaat) => void }) {
  return (
    <div role="tablist" aria-label="Bekijk op" className="inline-flex rounded-full bg-sand-100 p-1 ring-1 ring-sand-200" data-testid="apparaat-keuze">
      {APPARATEN.map((a) => {
        const Icoon = ICOON[a.id]
        const actief = a.id === waarde
        return (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={actief}
            data-apparaat={a.id}
            onClick={() => onChange(a.id)}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[0.85rem] font-medium transition sm:h-9 ${actief ? 'bg-ink text-sand-50 shadow-sm' : 'text-ink-soft hover:text-ink'}`}
          >
            <Icoon className="h-4 w-4" aria-hidden="true" /> {a.label}
          </button>
        )
      })}
    </div>
  )
}

/** Toont de echte klantpagina in een kader van de gekozen schermbreedte, verkleind tot hij past. */
export function ApparaatKader({ src, apparaat }: { src: string; apparaat: Apparaat }) {
  const a = APPARATEN.find((x) => x.id === apparaat)!
  const ruimte = useRef<HTMLDivElement>(null)
  const [breedte, setBreedte] = useState(0)
  useEffect(() => {
    const el = ruimte.current
    if (!el) return
    const meet = () => setBreedte(el.clientWidth)
    meet()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(meet) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const hoogte = Math.min(a.hoogte, 900)
  const s = schaalVoor(a.breedte + 16, breedte)
  return (
    <div ref={ruimte} className="w-full" data-testid="apparaat-kader" data-breedte={a.breedte}>
      <div className="mx-auto overflow-hidden" style={{ width: (a.breedte + 16) * s, height: (hoogte + 16) * s }}>
        <div
          className={`origin-top-left bg-ink p-2 shadow-lift ${apparaat === 'desktop' ? 'rounded-xl' : 'rounded-[1.6rem]'}`}
          style={{ width: a.breedte + 16, height: hoogte + 16, transform: `scale(${s})` }}
        >
          <iframe
            key={apparaat}
            src={src}
            title={`Voorbeeld van de offerte op ${a.label.toLowerCase()}`}
            className={`block h-full w-full bg-white ${apparaat === 'desktop' ? 'rounded-lg' : 'rounded-[1.2rem]'}`}
            style={{ width: a.breedte, height: hoogte }}
          />
        </div>
      </div>
    </div>
  )
}

/** Knop + venster: zo ziet de klant de offerte, vóórdat je hem deelt. */
export function KlantVoorbeeld({ d, className = '' }: { d: OfferteData; className?: string }) {
  const [open, setOpen] = useState(false)
  const [apparaat, setApparaat] = useState<Apparaat>('mobiel')
  return (
    <>
      <Button variant="ghost" className={`w-full ${className}`} icon={<MonitorSmartphone className="h-4 w-4" />} onClick={() => setOpen(true)} data-testid="klant-voorbeeld">
        Bekijk zoals de klant het ziet
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        breed
        title="Zo ziet je klant het"
        sub="Dit is precies de pagina die de klant opent. Kijk even of alles klopt op elk scherm, en deel hem daarna."
        footer={<Button onClick={() => setOpen(false)}>Ziet er goed uit</Button>}
      >
        <div className="flex justify-center">
          <ApparaatKeuze waarde={apparaat} onChange={setApparaat} />
        </div>
        <div className="mt-4">{open && <ApparaatKader src={voorbeeldUrl(d)} apparaat={apparaat} />}</div>
        <p className="mt-3 text-center text-[0.75rem] text-ink-muted">Alleen een voorbeeld: er wordt niets verstuurd en de klant ziet dit niet als “bekeken”.</p>
      </Dialog>
    </>
  )
}
