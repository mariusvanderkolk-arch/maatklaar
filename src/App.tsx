import { Suspense } from 'react'
import { Shell } from './components/Shell'
import { useRoute } from './lib/router'
import { Home } from './screens/Home'
import { Toaster } from './components/Toast'
import { Foutgrens } from './components/Foutgrens'
import { Onboarding } from './components/Onboarding'
import { laadLater } from './lib/lazy'
import { CloudToestemming } from './components/CloudToestemming'
import { InAppBanner } from './components/InAppBanner'

const ProjectForm = laadLater(() => import('./screens/ProjectForm').then((m) => m.ProjectForm))
const ProjectScreen = laadLater(() => import('./screens/ProjectScreen').then((m) => m.ProjectScreen))
const About = laadLater(() => import('./screens/About').then((m) => m.About))
const Prices = laadLater(() => import('./screens/Prices').then((m) => m.Prices))
const KlantOfferte = laadLater(() => import('./screens/KlantOfferte').then((m) => m.KlantOfferte))
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
  if (route.naam === 'offerte-bekijken')
    return (
      <Foutgrens>
        <InAppBanner />
        <Suspense fallback={<Laden />}>
          <KlantOfferte code={route.data} />
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
        </Suspense>
      </Foutgrens>
      {route.naam === 'home' && <Onboarding />}
      <CloudToestemming />
      <Toaster />
    </Shell>
  )
}
