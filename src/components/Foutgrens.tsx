import { Component, type CSSProperties, type ReactNode } from 'react'
import { Download, ExternalLink, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from './ui'
import { chromeIntentUrl, isAndroid, isInAppBrowser } from '../lib/inApp'

interface Staat {
  fout: Error | null
}

/** Vangt onverwachte fouten af zodat de gebruiker nooit een wit scherm krijgt en altijd een back-up kan maken. */
export class Foutgrens extends Component<{ children: ReactNode; sleutel?: string }, Staat> {
  state: Staat = { fout: null }
  static getDerivedStateFromError(fout: Error): Staat {
    return { fout }
  }
  componentDidUpdate(vorige: { sleutel?: string }) {
    // bij navigeren naar een ander scherm opnieuw proberen
    if (vorige.sleutel !== this.props.sleutel && this.state.fout) this.setState({ fout: null })
  }
  componentDidCatch(fout: Error) {
    console.error(fout)
  }
  render() {
    if (!this.state.fout) return this.props.children
    const laden = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(this.state.fout.message)
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center" role="alert">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rust/10 text-rust">
          <TriangleAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-ink">{laden ? 'Dit onderdeel kon niet laden' : 'Er ging iets mis'}</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
          {laden
            ? 'Misschien ben je offline of is er net een nieuwe versie verschenen. Ververs de pagina.'
            : 'Je gegevens zijn veilig: alles staat nog op dit apparaat. Ververs de pagina; lukt het daarna nog niet, maak dan een back-up.'}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => location.reload()}>
            Pagina verversen
          </Button>
          {isInAppBrowser() && isAndroid() && (
            <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => (location.href = chromeIntentUrl())}>
              Openen in Chrome
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={async () => {
              const { exporteerAlles } = await import('../lib/backupActies')
              exporteerAlles().catch(() => {})
            }}
          >
            Back-up downloaden
          </Button>
        </div>
        <p className="mt-6 text-xs break-words text-ink-muted">Foutmelding: {this.state.fout.message}</p>
      </div>
    )
  }
}

/**
 * Laatste vangnet rond de hele app. Bewust met inline stijlen en zonder andere onderdelen,
 * zodat het ook werkt als de opmaak of een deel van de app stuk is.
 */
export class AppFoutgrens extends Component<{ children: ReactNode }, Staat> {
  state: Staat = { fout: null }
  static getDerivedStateFromError(fout: Error): Staat {
    return { fout }
  }
  componentDidCatch(fout: Error) {
    console.error(fout)
    window.__swGestart = true // React draait; het noodscherm van index.html is niet nodig
  }
  render() {
    if (!this.state.fout) return this.props.children
    const knop: CSSProperties = { display: 'block', width: '100%', maxWidth: 320, margin: '10px auto 0', padding: '14px 16px', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', border: '1px solid #2B2623', boxSizing: 'border-box', cursor: 'pointer' }
    let android = false
    let intent = ''
    try {
      android = isAndroid()
      intent = chromeIntentUrl()
    } catch {
      /* negeren */
    }
    return (
      <div role="alert" style={{ minHeight: '100vh', background: '#F5EFE6', color: '#2B2623', fontFamily: 'system-ui,-apple-system,Roboto,sans-serif', padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <h1 style={{ fontSize: 26, margin: '0 0 10px' }}>Er ging iets mis</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, margin: '0 0 20px' }}>
            Open de link in Chrome. Sommige apps (zoals WhatsApp) openen links in een eigen, beperkte browser waarin Maatklaar niet goed werkt. Je gegevens op dit apparaat blijven bewaard.
          </p>
          {android && intent && (
            <a href={intent} style={{ ...knop, background: '#2B2623', color: '#F5EFE6' }}>
              Openen in Chrome
            </a>
          )}
          <button type="button" onClick={() => location.reload()} style={{ ...knop, background: 'transparent', color: '#2B2623' }}>
            Opnieuw laden
          </button>
          <p style={{ marginTop: 28, fontSize: 11, lineHeight: 1.4, color: '#7A6F66', wordBreak: 'break-word' }}>
            Foutmelding: {this.state.fout.message || String(this.state.fout)} · {typeof navigator !== 'undefined' ? navigator.userAgent : ''}
          </p>
        </div>
      </div>
    )
  }
}
