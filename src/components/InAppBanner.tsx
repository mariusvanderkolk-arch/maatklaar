import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { chromeIntentUrl, isAndroid, isInAppBrowser } from '../lib/inApp'
import { kopieer } from '../lib/share'
import { opslag, sessieOpslag } from '../lib/veiligeOpslag'
import { sleutel } from '../lib/modus'
import { toast } from './Toast'

const WEG = sleutel('inapp-banner-weg')

/** Subtiele, niet-blokkerende tip in in-app browsers (WhatsApp, Facebook, Instagram) om Chrome te gebruiken. */
export function InAppBanner() {
  const inApp = isInAppBrowser()
  const geenOpslag = !opslag.blijvend
  const [zichtbaar, setZichtbaar] = useState(() => (inApp || geenOpslag) && !sessieOpslag.getItem(WEG))
  if (!zichtbaar) return null
  const android = isAndroid()
  const sluit = () => {
    try {
      sessieOpslag.setItem(WEG, '1')
    } catch {
      /* alleen nu */
    }
    setZichtbaar(false)
  }
  return (
    <div className="no-print border-b border-sand-300/70 bg-sand-50" role="status">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-1.5 text-[0.8rem] leading-snug text-ink-soft sm:px-6">
        <p className="min-w-0 flex-1">
          {geenOpslag ? 'Let op: deze browser bewaart je gegevens niet. ' : ''}
          {inApp ? 'Werkt het beter in Chrome?' : 'Gebruik liever je gewone browser.'}{' '}
          {android ? (
            <a href={chromeIntentUrl()} className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-2">
              Openen in Chrome
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button
              type="button"
              className="font-semibold text-ink underline underline-offset-2"
              onClick={async () => toast((await kopieer(location.href)) === 'gekopieerd' ? 'Link gekopieerd: plak hem in je browser' : 'Kopiëren mislukt')}
            >
              Link kopiëren
            </button>
          )}
        </p>
        <button type="button" onClick={sluit} aria-label="Melding sluiten" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-muted hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
