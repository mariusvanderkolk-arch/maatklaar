/** Op maatklaar.nl: gegevens van het oude adres (github.io) overzetten via de overzetpagina + postMessage. */
import { useEffect, useRef, useState } from 'react'
import { ArrowRightLeft, Check, X } from 'lucide-react'
import { Button } from './ui'
import { toast } from './Toast'
import { BERICHT_OK, OUDE_ORIGIN, isOverzetBericht, opNieuwAdres, overzetUrl } from '../lib/verhuizing'
import { leesBackup, samenvatting } from '../lib/backup'
import { importeerBackup } from '../lib/backupActies'
import { useProjecten } from '../lib/store'
import { TEST_MODUS, sleutel } from '../lib/modus'
import { leesVeilig, schrijfVeilig } from '../lib/veiligeOpslag'

const VLAG = sleutel('verhuizing:v1')

export function Verhuiskaart({ altijd = false }: { altijd?: boolean }) {
  const projecten = useProjecten()
  const [status, setStatus] = useState<'idle' | 'wacht' | 'klaar' | 'fout' | 'geblokkeerd'>('idle')
  const [melding, setMelding] = useState('')
  const [weg, setWeg] = useState(() => leesVeilig(VLAG) != null)
  const venster = useRef<Window | null>(null)
  const bezig = useRef(false)

  useEffect(() => {
    const ontvang = async (e: MessageEvent) => {
      if (e.origin !== OUDE_ORIGIN || !isOverzetBericht(e.data)) return
      if (venster.current && e.source !== venster.current) return
      const bron = e.source as Window | null
      if (bezig.current) return
      bezig.current = true
      try {
        const b = leesBackup(e.data.backup)
        await importeerBackup(b, 'samenvoegen')
        const s = samenvatting(b)
        bron?.postMessage({ type: BERICHT_OK, projecten: s.eigen }, e.origin)
        schrijfVeilig(VLAG, 'klaar')
        setMelding(`${s.eigen} project${s.eigen === 1 ? '' : 'en'}, ${s.facturen} facturen, ${s.prijzen} eigen prijzen en ${s.fotos} foto’s overgezet.`)
        setStatus('klaar')
        toast('Je gegevens zijn overgezet')
      } catch (err) {
        bezig.current = false
        const m = (err as Error).message || 'Overzetten mislukt.'
        bron?.postMessage({ type: BERICHT_OK, projecten: 0, fout: m }, e.origin)
        setMelding(m)
        setStatus('fout')
      }
    }
    window.addEventListener('message', ontvang)
    return () => window.removeEventListener('message', ontvang)
  }, [])

  if (!opNieuwAdres(location.origin, TEST_MODUS)) return null
  const heeftEigen = projecten.some((p) => !p.voorbeeld)
  if (!altijd && status === 'idle' && (weg || heeftEigen)) return null

  const start = () => {
    bezig.current = false
    const w = window.open(overzetUrl(location.origin), 'maatklaar-overzetten')
    if (!w) return setStatus('geblokkeerd')
    venster.current = w
    setStatus('wacht')
  }

  return (
    <section className="card mb-5 border-gold-300 bg-gradient-to-br from-gold-100/60 to-paper p-5 sm:p-6" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700 ring-1 ring-gold-300">
          {status === 'klaar' ? <Check className="h-5 w-5" /> : <ArrowRightLeft className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.15rem] font-semibold text-ink">{status === 'klaar' ? 'Gegevens overgezet' : 'Maatklaar heeft een nieuw adres: maatklaar.nl'}</h2>
          {status === 'klaar' ? (
            <p className="mt-1 text-sm text-ink-soft">{melding} Op het oude adres blijft alles ook gewoon staan.</p>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              Gebruikte je Maatklaar al via de oude link (…github.io/maatklaar)? Je projecten, prijzen en facturen staan daar nog veilig op dit apparaat. Zet ze hier in één tik over; er wordt niets gewist. Met een account? Dan kun je ook gewoon inloggen.
            </p>
          )}
          {status === 'wacht' && <p className="mt-2 text-sm text-gold-700">Er is een venster geopend op het oude adres. Bevestig daar het overzetten…</p>}
          {status === 'fout' && <p className="mt-2 text-sm text-red-700">{melding}</p>}
          {status === 'geblokkeerd' && (
            <p className="mt-2 text-sm text-ink-soft">
              Je browser blokkeerde het venster. Sta pop-ups toe en probeer opnieuw, of open in Chrome. Lukt het niet: open{' '}
              <a className="underline" href={overzetUrl(location.origin)} target="_blank" rel="noopener">
                de overzetpagina
              </a>
              , kies daar “Back-up-bestand downloaden” en zet dat bestand hier terug via Instellingen → Back-up.
            </p>
          )}
          {status !== 'klaar' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={start} icon={<ArrowRightLeft className="h-4 w-4" />}>
                {status === 'wacht' ? 'Opnieuw openen' : 'Gegevens overzetten'}
              </Button>
              {!altijd && (
                <Button
                  variant="secondary"
                  icon={<X className="h-4 w-4" />}
                  onClick={() => {
                    schrijfVeilig(VLAG, 'weg')
                    setWeg(true)
                  }}
                >
                  Ik ben nieuw
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
