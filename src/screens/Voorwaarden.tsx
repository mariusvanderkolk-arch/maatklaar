import { Card, PageTitle } from '../components/ui'

const ARTIKELEN: { titel: string; tekst: string }[] = [
  { titel: '1. Wat Maatklaar is', tekst: 'Maatklaar is een rekenhulp voor vakmensen en klussers: opmeten, materiaal berekenen, offertes en facturen maken. Berekeningen en prijzen zijn indicatief; jij blijft verantwoordelijk voor wat je aan je klant aanbiedt.' },
  { titel: '2. Gebruik', tekst: 'Je mag Maatklaar gebruiken voor je eigen werk en je eigen klanten. Offertes, facturen en lijsten die je met de app maakt, zijn van jou.' },
  { titel: '3. Auteursrecht — niet kopiëren', tekst: '© 2026 Maatklaar – alle rechten voorbehouden. De app, de broncode, het ontwerp, de teksten, rekenregels, prijstabellen en afbeeldingen zijn auteursrechtelijk beschermd. Het is niet toegestaan Maatklaar of delen ervan te kopiëren, na te maken, te verspreiden, te verkopen, onder een andere naam aan te bieden of te gebruiken om een concurrerende dienst te bouwen, zonder schriftelijke toestemming van Maatklaar. Dat de broncode openbaar te bekijken is, geeft geen recht om hem over te nemen.' },
  { titel: '4. Digitaal tekenen', tekst: 'Een offerte die een klant via Maatklaar tekent, wordt vastgelegd met naam, handtekening, tijdstip, het type browser, een onleesbaar gemaakte (gehashte) code van het IP-adres en een controlecode van de getekende versie. Maatklaar faciliteert alleen; de afspraak is tussen aannemer en klant.' },
  { titel: '5. Gegevens van je klanten (verwerkersafspraak)', tekst: 'Zet je met een account klantgegevens in Maatklaar (zoals naam, adres en telefoon) of deel je een offerte, dan ben jij de verantwoordelijke voor die gegevens en verwerkt Maatklaar ze alleen in jouw opdracht. Maatklaar gebruikt ze uitsluitend om de app te laten werken (opslaan, synchroniseren, offerte laten tekenen), verkoopt of deelt ze niet, slaat ze op in de EU (Supabase, Ierland), beveiligt ze passend (versleuteling, toegang alleen per account of per offerte-link) en laat alleen betrouwbare subverwerkers toe die daarvoor nodig zijn (Supabase voor opslag; Google Gemini voor inspreken). Een datalek melden we zo snel mogelijk aan jou, zodat jij kunt doen wat de AVG vraagt. Verwijder je je account, dan wissen we je cloudgegevens en offerte-links; gedeelde links verlopen bovendien vanzelf. Jij zorgt dat je klant weet dat je zijn gegevens hiervoor gebruikt.' },
  { titel: '6. Geen garantie', tekst: 'Maatklaar wordt geleverd zoals hij is. We doen ons best om alles goed te laten werken, maar zijn niet aansprakelijk voor schade door rekenfouten, verkeerde prijzen of het niet beschikbaar zijn van de app. Maak regelmatig een back-up.' },
  { titel: '7. Wijzigingen en contact', tekst: 'Deze voorwaarden kunnen worden aangepast; de actuele versie staat altijd op deze pagina. Vragen? Neem contact op met het Maatklaar-team via de knop "Vraag het Maatklaar-team" in de hulpchat.' },
]

export function Voorwaarden() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <PageTitle eyebrow="Juridisch" title="Gebruiksvoorwaarden" sub="Kort en duidelijk. Laatst bijgewerkt: november 2026." />
      <div className="mt-8 grid gap-4">
        {ARTIKELEN.map((a) => (
          <Card key={a.titel} className="p-5 sm:p-6">
            <h2 className="font-sans text-[1rem] font-semibold tracking-normal">{a.titel}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{a.tekst}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
