import { BeoordeelDialoog } from './Beoordeel'
import { reviewDialoog } from '../lib/reviews'
import type { ReactNode } from 'react'
import { Plus, Settings } from 'lucide-react'
import { Logo } from './Logo'
import { OpslagWaarschuwing } from './Opslag'
import { Button } from './ui'
import { TestBanner } from './Testversie'
import { InAppBanner } from './InAppBanner'
import { TEST_MODUS } from '../lib/modus'
import { APP_VERSIE_KORT } from '../lib/versie'
import { useCloud } from '../lib/cloud/sync'
import { STATUS_TEKST } from './SyncStatus'
import { ga, type Route } from '../lib/router'

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const cloud = useCloud()
  const syncKleur = !cloud.gebruiker || !cloud.syncAan ? null : cloud.status === 'ok' ? 'bg-sage' : cloud.status === 'bezig' ? 'bg-gold-400' : cloud.status === 'offline' ? 'bg-sand-400' : 'bg-rust'
  const link = (actief: boolean) =>
    `rounded-lg px-1 py-2 text-[0.85rem] font-medium whitespace-nowrap transition sm:px-3 sm:text-sm ${actief ? 'text-ink' : 'text-ink-muted hover:text-ink'}`
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#inhoud" onClick={(e) => { e.preventDefault(); document.getElementById('inhoud')?.focus() }} className="sr-only z-50 rounded-lg bg-ink px-4 py-2 text-sand-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Naar de inhoud
      </a>
      <InAppBanner />
      {TEST_MODUS && <TestBanner />}
      <header className="no-print sticky top-0 z-40 border-b border-sand-300/60 bg-sand-100/85 backdrop-blur-md supports-[backdrop-filter]:bg-sand-100/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:h-[4.5rem] sm:gap-3 sm:px-6">
          <a href="#/" className="rounded-lg">
            <span className="sm:hidden">
              <Logo compact />
            </span>
            <span className="hidden sm:block">
              <Logo />
            </span>
            <span className="sr-only">, naar projecten</span>
          </a>
          <nav className="flex items-center gap-0.5 sm:gap-1">
            <a href="#/" aria-current={route.naam === 'home' ? 'page' : undefined} className={`${link(route.naam === 'home')} hidden sm:block`}>
              Projecten
            </a>
            <a href="#/facturen" aria-current={route.naam === 'facturen' || route.naam === 'factuur' ? 'page' : undefined} className={link(route.naam === 'facturen' || route.naam === 'factuur')}>
              Facturen
            </a>
            <a href="#/prijzen" aria-current={route.naam === 'prijzen' ? 'page' : undefined} className={link(route.naam === 'prijzen')}>
              Prijzen
            </a>
            <a href="#/tarieven" aria-current={route.naam === 'tarieven' ? 'page' : undefined} className={`${link(route.naam === 'tarieven')} hidden sm:block`}>
              Tarieven
            </a>
            <a href="#/over" aria-current={route.naam === 'over' ? 'page' : undefined} className={`${link(route.naam === 'over')} hidden sm:block`}>
              Over
            </a>
            <a
              href="#/instellingen"
              aria-label="Instellingen"
              title="Instellingen"
              aria-current={route.naam === 'instellingen' ? 'page' : undefined}
              className={`relative grid h-10 w-8 place-items-center rounded-lg transition sm:w-10 ${route.naam === 'instellingen' ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              <Settings className="h-[1.15rem] w-[1.15rem]" />
              {syncKleur && (
                <span className={`absolute top-2 right-0.5 h-2 w-2 rounded-full ring-2 ring-sand-100 sm:right-1.5 ${syncKleur}`} title={`Cloud: ${STATUS_TEKST[cloud.status]}`}>
                  <span className="sr-only">Cloud: {STATUS_TEKST[cloud.status]}</span>
                </span>
              )}
            </a>
            <span className="ml-1.5 hidden sm:block">
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => ga('/nieuw')}>
                Nieuw project
              </Button>
            </span>
            <button
              type="button"
              aria-label="Nieuw project"
              onClick={() => ga('/nieuw')}
              className="ml-0.5 grid h-10 w-10 place-items-center rounded-xl bg-ink text-sand-50 shadow-[0_6px_18px_-10px_rgba(43,38,32,.7)] active:scale-95 sm:hidden"
            >
              <Plus className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </header>
      <OpslagWaarschuwing />
      <BeoordeelDialoog />
      <main id="inhoud" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <footer className={`no-print border-t border-sand-300/60 ${route.naam === 'home' || route.naam === 'over' || route.naam === 'prijzen' || route.naam === 'instellingen' || route.naam === 'facturen' || route.naam === 'account' || route.naam === 'privacy' || route.naam === 'tarieven' || route.naam === 'voorwaarden' ? '' : 'pb-20'}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © 2026 Maatklaar – alle rechten voorbehouden · {TEST_MODUS ? 'testversie' : `versie ${APP_VERSIE_KORT}`} ·{' '}
            <a href="#/over" className="underline underline-offset-2 hover:text-ink">
              Over de app
            </a>{' '}
            ·{' '}
            <button type="button" onClick={reviewDialoog.open} className="underline underline-offset-2 hover:text-ink">
              Beoordeel Maatklaar
            </button>{' '}
            ·{' '}
            <a href="#/account" className="underline underline-offset-2 hover:text-ink">
              {cloud.gebruiker ? `Account${cloud.syncAan ? ` (${STATUS_TEKST[cloud.status].toLowerCase()})` : ''}` : 'Inloggen'}
            </a>{' '}
            ·{' '}
            <a href="#/tarieven" className="underline underline-offset-2 hover:text-ink">
              Tarieven
            </a>{' '}
            ·{' '}
            <a href="#/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy
            </a>{' '}
            ·{' '}
            <a href="#/voorwaarden" className="underline underline-offset-2 hover:text-ink">
              Voorwaarden
            </a>
          </p>
          <p>{TEST_MODUS ? 'Voorbeeldprijzen, tenzij je eigen prijzen invult · gegevens blijven op dit apparaat' : 'Nu gratis · vul je eigen prijzen in · gegevens blijven op dit apparaat'}</p>
        </div>
      </footer>
    </div>
  )
}
