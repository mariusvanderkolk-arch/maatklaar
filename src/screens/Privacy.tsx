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
      'Je projecten staan alleen op je eigen apparaat; Maatklaar kan ze niet inzien. Gedeelde offertes (om te laten tekenen) en optionele cloud-back-ups via een account worden opgeslagen in een beveiligde database van Supabase in de EU (Ierland). Andere bezoekers kunnen er niet bij: de toegang is per account en per offerte-link afgeschermd. De gegevens zijn versleuteld tijdens verzending (HTTPS) en bij opslag.',
  },
  {
    titel: 'Wie kijkt er mee?',
    tekst:
      'De beheerder van Maatklaar bekijkt de inhoud van gedeelde offertes of back-ups niet, tenzij dat nodig is om een storing op te lossen of als jij daarom vraagt.',
  },
  {
    titel: 'Andere diensten',
    tekst:
      'De app staat op GitHub Pages. Kies je zelf voor AI-fotoanalyse, dan gaan alleen de foto’s die jij laat analyseren naar de AI-dienst die je instelt, met je eigen sleutel. Wie een offerte-link heeft, kan die offerte zien. Offerte-links verlopen: niet getekend na 90 dagen, getekend na 365 dagen; daarna worden ze gewist.',
  },
  {
    titel: 'Verwijderen en meenemen',
    tekst:
      'Onder Account kun je je cloudgegevens of je hele account verwijderen. Met Back-up exporteer je al je gegevens als bestand. Lokale gegevens wis je via de instellingen van je browser. Wil je dat een gedeelde offerte of andere opgeslagen gegevens eerder worden verwijderd? Vraag het ons, dan wissen we het.',
  },
  {
    titel: 'Anonieme gebruikscijfers, geen cookies',
    tekst:
      'Om de app te verbeteren tellen we anoniem welke schermen en functies worden gebruikt (bijv. "offerte gedeeld"), met alleen het scherm, mobiel of desktop, de website waar je vandaan kwam en of je in een app-browser zit. Geen cookies, geen naam, e-mail of IP-adres en geen projectgegevens; alleen een willekeurige code die per dag en per browsertabblad verandert. Vragen die de hulpchat niet kon beantwoorden worden ingekort en zonder e-mailadressen of telefoonnummers bewaard om de hulp te verbeteren. Er zijn geen trackers of analysediensten van derden. Staat "Do Not Track" of "Global Privacy Control" aan in je browser, dan tellen we niets.',
  },
  {
    titel: 'Beoordelingen',
    tekst:
      'Als je Maatklaar beoordeelt, bewaren we alleen de sterren, je tekst en (als je die invult) je naam en bedrijf, met datum. Openbaar wordt het pas als jij daar toestemming voor geeft én Marius het heeft gecontroleerd. Wil je je beoordeling laten verwijderen? Stuur Marius een bericht.',
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
