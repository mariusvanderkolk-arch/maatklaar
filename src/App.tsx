import { Suspense, useEffect } from 'react'
import { padVoor, track } from './lib/analytics'
import { Shell } from './components/Shell'
import { useRoute } from './lib/router'
import { projectStore } from './lib/store'
import { Home } from './screens/Home'
import { Toaster } from './components/Toast'
import { Foutgrens } from './components/Foutgrens'
import { Onboarding } from './components/Onboarding'
import { laadLater } from './lib/lazy'
import { CloudToestemming } from './components/CloudToestemming'
import { InAppBanner } from './components/InAppBanner'
import { HulpKnop } from './components/hulp/HulpKnop'
import { toast } from './components/Toast'

const ProjectForm = laadLater(() => import('./screens/ProjectForm').then((m) => m.ProjectForm))
const ProjectScreen = laadLater(() => import('./screens/ProjectScreen').then((m) => m.ProjectScreen))
const About = laadLater(() => import('./screens/About').then((m) => m.About))
const Prices = laadLater(() => import('./screens/Prices').then((m) => m.Prices))
const Demo = laadLater(() => import('./screens/Demo').then((m) => m.Demo))
const KlantOfferte = laadLater(() => import('./screens/KlantOfferte').then((m) => m.KlantOfferte))
const KlantTekenen = laadLater(() => import('./screens/KlantOfferte').then((m) => m.KlantTekenen))
const Voorwaarden = laadLater(() => import('./screens/Voorwaarden').then((m) => m.Voorwaarden))
const Facturen = laadLater(() => import('./screens/Facturen').then((m) => m.Facturen))
const FactuurScherm = laadLater(() => import('./screens/Facturen').then((m) => m.FactuurScherm))
const Instellingen = laadLater(() => import('./screens/Instellingen').then((m) => m.Instellingen))
const Account = laadLater(() => import('./screens/Account').then((m) => m.Account))
const Privacy = laadLater(() => import('./screens/Privacy').then((m) => m.Privacy))

function Laden() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6" aria-busy="true" aria-label="Laden">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-sand-200" />
      <div className="mt-6 h-64 animate-pulse rounded-2xl bg-sand-200/70" />
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const pad = padVoor(route as { naam: string; stap?: string; sectie?: string })
  useEffect(() => track('page_view', { path: pad }), [pad])
  // Offerte-opvolging: bij openen en bij terugkeren naar de app de status van gedeelde offertes ophalen
  useEffect(() => {
    if (route.naam === 'offerte-bekijken' || route.naam === 'offerte-tekenen') return
    let laatst = 0
    const kijk = () => {
      if (document.hidden || Date.now() - laatst < 60_000) return
      laatst = Date.now()
      void import('./lib/opvolgingSync').then(({ controleerOffertes }) =>
        controleerOffertes().then((nieuw) => {
          for (const p of nieuw) toast(`Offerte getekend door ${p.offerte?.teken?.getekend?.naam || p.klant || 'de klant'} — ${p.naam || 'project'}`)
        }),
      )
    }
    let fotoLaatst = 0
    const fotos = () => {
      if (document.hidden || Date.now() - fotoLaatst < 5 * 60_000) return
      fotoLaatst = Date.now()
      void import('./lib/fotoCloud').then((m) => m.fotoSyncNu())
    }
    // eerste echte gebruik: browser vragen de opslag niet op te ruimen
    if (projectStore.alle().some((p) => !p.voorbeeld)) void import('./lib/vasteOpslag').then((m) => m.vraagVasteOpslag())
    kijk()
    const t = setTimeout(fotos, 4000) // na het starten van de cloud-sync
    document.addEventListener('visibilitychange', kijk)
    document.addEventListener('visibilitychange', fotos)
    return () => {
      clearTimeout(t)
      document.removeEventListener('visibilitychange', kijk)
      document.removeEventListener('visibilitychange', fotos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.naam === 'offerte-bekijken' || route.naam === 'offerte-tekenen'])
  if (route.naam === 'offerte-bekijken' || route.naam === 'offerte-tekenen')
    return (
      <Foutgrens>
        <InAppBanner />
        <Suspense fallback={<Laden />}>
          {route.naam === 'offerte-bekijken' ? <KlantOfferte code={route.data} /> : <KlantTekenen token={route.token} />}
        </Suspense>
        <Toaster />
      </Foutgrens>
    )
  const sleutel = location.hash
  return (
    <Shell route={route}>
      <Foutgrens sleutel={sleutel}>
        <Suspense fallback={<Laden />}>
          {route.naam === 'home' && <Home />}
          {route.naam === 'nieuw' && <ProjectForm key="nieuw" />}
          {route.naam === 'bewerken' && <ProjectForm key={route.id} id={route.id} />}
          {route.naam === 'project' && <ProjectScreen id={route.id} stap={route.stap} />}
          {route.naam === 'over' && <About />}
          {route.naam === 'prijzen' && <Prices terugNaar={route.terugNaar} />}
          {route.naam === 'instellingen' && <Instellingen sectie={route.sectie} />}
          {route.naam === 'facturen' && <Facturen />}
          {route.naam === 'factuur' && <FactuurScherm id={route.id} />}
          {route.naam === 'account' && <Account />}
          {route.naam === 'privacy' && <Privacy />}
          {route.naam === 'voorwaarden' && <Voorwaarden />}
          {route.naam === 'demo' && <Demo stap={route.stap} />}
        </Suspense>
      </Foutgrens>
      {route.naam === 'home' && <Onboarding />}
      <CloudToestemming />
      {route.naam !== 'demo' && <HulpKnop route={route} />}
      <Toaster />
    </Shell>
  )
}
