import { Star } from 'lucide-react'
import { ReviewsBlok } from '../components/Beoordeel'
import { reviewDialoog } from '../lib/reviews'
import { Calculator, Camera, Database, RotateCcw, ScanLine, ShoppingCart } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { ONBOARDING_SLEUTEL } from '../components/Onboarding'
import { Badge, Button, Card, PageTitle } from '../components/ui'
import { toast } from '../components/Toast'
import { projectStore } from '../lib/store'
import { ga } from '../lib/router'
import { APP_VERSIE } from '../lib/versie'
import { opslag } from '../lib/veiligeOpslag'

const BLOKKEN = [
  {
    icon: Calculator,
    titel: 'Berekeningen',
    badge: <Badge tone="sage">Werkt</Badge>,
    tekst:
      'Oppervlakken en materialen worden berekend met gangbare vuistregels: snijverlies (instelbaar), lijm per tegelformaat, voegmiddel volgens de fabrikantformule, primer, waterdichting, egaliseermiddel, kit en profielen, en voor vloeren laminaat/PVC per pak, ondervloer en plinten. Controleer bij twijfel altijd de technische fiche van het product.',
  },
  {
    icon: ShoppingCart,
    titel: 'Richtprijzen',
    badge: <Badge tone="gold">Voorbeeld of eigen</Badge>,
    actie: (
      <Button size="sm" variant="secondary" className="mt-3" onClick={() => ga('/prijzen')}>
        Prijzen beheren
      </Button>
    ),
    tekst:
      'Je werkt met één eigen prijslijst: per artikel jouw inkoopprijs, met desgewenst de leverancier. Zolang je niets invult rekent de app met voorbeeldprijzen. Eigen prijzen gaan direct voor in de inkooplijst en de offerte. Met exporteren en importeren (CSV/JSON) neem je ze mee naar een ander apparaat.',
  },
  {
    icon: Camera,
    titel: "Foto's & AI-analyse",
    badge: <Badge tone="gold">Optioneel, eigen sleutel</Badge>,
    actie: (
      <Button size="sm" variant="secondary" className="mt-3" onClick={() => ga('/instellingen/ai')}>
        AI instellen
      </Button>
    ),
    tekst:
      "Foto's maken en bewaren werkt altijd (verkleind, alleen op dit apparaat). Met een eigen API-sleutel (gratis te proberen met Google Gemini, of betaald bij OpenAI/xAI) kan een AI-model je foto's beoordelen: elementen herkennen, werkzaamheden voorstellen en maten schatten. Dat zijn suggesties die je zelf overneemt; maten die de AI schat zijn grof, dus meet altijd na. Foto's gaan alleen naar die dienst als jij op Analyseer drukt.",
  },
  {
    icon: ScanLine,
    titel: 'Meten met AR',
    badge: <Badge tone="gold">Beta</Badge>,
    tekst:
      'Bij Opmeten kun je met de knop AR een afstand meten door twee punten aan te tikken (WebXR). Dit werkt alleen op toestellen die AR in de browser ondersteunen, zoals Android-telefoons met Chrome en ARCore; Safari op iPhone ondersteunt het nog niet. AR-metingen wijken vaak een paar centimeter af: meet belangrijke maten na.',
  },
  {
    icon: Database,
    titel: 'Jouw gegevens',
    badge: <Badge tone="sage">Lokaal</Badge>,
    tekst:
      "Projecten, foto's, prijzen en bedrijfsgegevens worden alleen op dit apparaat opgeslagen (in de browser). Zonder account gaat er niets naar een server, behalve foto's die jij zelf laat analyseren door de AI-dienst die je kiest. Wis je de browsergegevens, dan is alles weg: maak dus regelmatig een back-up via Instellingen → Back-up. Wil je je gegevens op al je apparaten? Log dan (optioneel) in onder Account: projecten, facturen, prijzen en bedrijfsgegevens worden dan gesynchroniseerd. Foto’s blijven op het apparaat.",
    actie: (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => ga('/instellingen/backup')}>
          Back-up maken
        </Button>
        <Button size="sm" variant="ghost" onClick={() => ga('/account')}>
          Account en sync
        </Button>
        <Button size="sm" variant="ghost" onClick={() => ga('/privacy')}>
          Privacy
        </Button>
      </div>
    ),
  },
]

export function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <PageTitle
        eyebrow="Over de app"
        title="Maatklaar"
        sub={`Versie ${APP_VERSIE} · nu gratis. Een rekenhulp voor aannemers en klussers bij het renoveren van badkamers, toiletten, keukens en vloeren: van opmeten tot een nette inkooplijst, offerte en factuur.`}
      />
      <div className="mt-8 grid gap-4">
        {BLOKKEN.map((b) => (
          <Card key={b.titel} className="flex gap-4 p-5 sm:p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700 ring-1 ring-gold-200">
              <b.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {b.titel} {b.badge}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{b.tekst}</p>
              {'actie' in b && b.actie}
            </div>
          </Card>
        ))}
      </div>
      <ReviewsBlok className="mt-6" />
      <Card className="mt-6 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <Star className="h-10 w-10 shrink-0 fill-gold-200 text-gold-500" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Beoordeel Maatklaar</p>
          <p className="mt-0.5 text-sm text-ink-muted">Geef sterren en een korte reactie. Openbaar alleen met jouw toestemming en na controle.</p>
        </div>
        <Button variant="secondary" onClick={reviewDialoog.open}>
          Beoordelen
        </Button>
      </Card>
      <Card className="mt-4 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <LogoMark className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Voorbeeldproject</p>
          <p className="mt-0.5 text-sm text-ink-muted">Zet het voorbeeldproject met alle onderdelen (van sloop en container tot afwerking) terug om de app te verkennen.</p>
        </div>
        <Button
          variant="secondary"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => {
            projectStore.herstelVoorbeelden()
            toast('Voorbeeldproject hersteld')
            ga('/')
          }}
        >
          Herstellen
        </Button>
      </Card>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            opslag.removeItem(ONBOARDING_SLEUTEL)
            ga('/')
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Korte rondleiding opnieuw bekijken
        </button>
        <p className="mt-3 text-xs text-ink-muted">Maatklaar versie {APP_VERSIE} · gegevens blijven op dit apparaat</p>
      </div>
    </div>
  )
}
