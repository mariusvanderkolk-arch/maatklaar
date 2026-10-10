import { Card, PageTitle } from '../components/ui'

const BLOKKEN: { titel: string; tekst: string }[] = [
  {
    titel: 'Zonder account',
    tekst:
      'Gebruik je de app zonder account, dan blijft alles op je eigen apparaat (in de browser): projecten, foto’s, prijzen, facturen en bedrijfsgegevens. Er gaat niets naar een server van Maatklaar.',
  },
  {
    titel: 'Met een account (optioneel)',
    tekst:
      'Log je in, dan bewaren we je e-mailadres (om in te loggen) en de gegevens die je laat synchroniseren: projecten (met planning en uren), facturen, eigen prijzen en bedrijfsgegevens. Dat kan klantgegevens bevatten die jij invult, zoals naam en adres van je klant. Foto’s en je AI-sleutel worden niet naar de cloud gestuurd.',
  },
  {
    titel: 'Waar staat het?',
    tekst:
      'De accountgegevens en gesynchroniseerde gegevens worden opgeslagen bij Supabase (een database- en inlogdienst). Alleen jij kunt je eigen gegevens lezen en wijzigen; dat is in de database afgedwongen per account.',
  },
  {
    titel: 'Andere diensten',
    tekst:
      'De app staat op GitHub Pages. Kies je zelf voor AI-fotoanalyse, dan gaan alleen de foto’s die jij laat analyseren naar de AI-dienst die je instelt, met je eigen sleutel. Een offerte-link bevat de offertegegevens in de link zelf; wie de link heeft, kan de offerte zien.',
  },
  {
    titel: 'Verwijderen en meenemen',
    tekst:
      'Onder Account kun je je cloudgegevens of je hele account verwijderen. Met Back-up exporteer je al je gegevens als bestand. Lokale gegevens wis je via de instellingen van je browser.',
  },
  {
    titel: 'Geen tracking',
    tekst: 'De app gebruikt geen advertentie- of trackingcookies en geen analysediensten.',
  },
]

export function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <PageTitle eyebrow="Privacy" title="Wat bewaren we?" sub="In gewone taal uitgelegd. Dit is geen juridisch advies of volledige privacyverklaring." />
      <div className="mt-7 grid gap-3">
        {BLOKKEN.map((b) => (
          <Card key={b.titel} className="p-5 sm:p-6">
            <p className="font-semibold">{b.titel}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{b.tekst}</p>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-ink-muted">
        Vragen? Neem contact op met de maker van de app. ·{' '}
        <a href="#/account" className="underline underline-offset-2 hover:text-ink">
          Account
        </a>
      </p>
    </div>
  )
}
