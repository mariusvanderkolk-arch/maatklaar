# Maatklaar

*Opgemeten, ontworpen, offerte klaar.* (voorheen Slimmer Wonen; de oude links sturen automatisch door)

**Opmeten, materialen berekenen, inkooplijst, offerte en planning voor badkamers, toiletten, keukens en vloeren** — voor aannemers en klussers.

🔗 Live (versie 1.2, nu gratis): https://mariusvanderkolk-arch.github.io/maatklaar/

![Maatklaar](public/logo.png)

## Wat kan de app?

1. **Nieuw project** — naam, klant, adres en type ruimte: **badkamer, toilet, keuken (spatwand) of vloer/woonkamer
   (laminaat, PVC of tegels, ondervloer, plinten)**, met een checklist met werkzaamheden per ruimte.
2. **Opmeten** — foto's maken of uploaden (verkleind tot max. 1600 px JPEG en alleen lokaal bewaard), maten invoeren
   (lengte, breedte, hoogte, tegelhoogte, deuren en ramen, douchezone, spatwand), tegelformaat en snijverlies, met
   uitleg-knopjes bij technische velden. Een schematische plattegrond tekent live mee.
   - **AI-fotoanalyse (optioneel, eigen API-sleutel)** — Google Gemini (standaard, gratis te proberen met limieten),
     OpenAI, xAI of een eigen OpenAI-compatibele dienst. Herkent elementen, stelt werkzaamheden voor en schat maten;
     alles zijn suggesties die je per stuk overneemt.
   - **AR-meten (beta)** — WebXR hit-test: tik twee punten aan en vul de afstand in als lengte, breedte of hoogte.
     Alleen op toestellen met AR in de browser (Android + Chrome + ARCore); elders een nette melding.
3. **Berekening** — oppervlakken en alle materialen met onderbouwing (tegels, lijm, voeg, primer, waterdichting,
   egaliseren, kit, profielen, laminaat/PVC per pak, ondervloer, plinten, sanitair, stucwerk).
4. **Inkooplijst** — gegroepeerd, af te vinken, met richtprijs, goedkoopste winkel per artikel en totaal per winkel.
5. **Offerte** — printvriendelijk met bedrijfsprofiel (naam, logo, KvK, btw, IBAN, contact), offertenummer,
   geldigheidsdatum en betaaltermijn. **Offerte-link voor de klant**: de klant opent de offerte op de telefoon
   (de gegevens zitten gecomprimeerd in de link, er is geen server) en stuurt zijn akkoord via WhatsApp of e-mail.
6. **Planning & uren** — dagplanning met droogtijden en weekenden, urenregistratie, extra kosten en
   budgetbewaking ten opzichte van de offerte.
7. **Prijzen beheren** — snelle start met voorbeeldprijzen, zoeken/filteren, inline bewerken, winkel kopiëren, % bulk, export/import CSV/JSON.
8. **Instellingen** — bedrijfsgegevens, offerte-instellingen, AI-sleutel en **volledige back-up**
   (alle projecten, foto's als data-URL, prijzen en bedrijfsgegevens; API-sleutels gaan niet mee) met samenvoegen of
   vervangen bij terugzetten, plus een back-upherinnering.

Verder: korte rondleiding bij het eerste bezoek, opslag-indicator en waarschuwing als de browseropslag vol is,
foutafhandeling zonder wit scherm, toetsenbordbediening en focusweergave, en lazy loading van zware onderdelen.

Alles wordt lokaal in de browser opgeslagen (localStorage; foto's in IndexedDB). Er gaat niets naar een server,
behalve foto's die je zelf laat analyseren door de AI-dienst die je kiest. Synchroniseren tussen apparaten
(cloud) is er nog niet; gebruik daarvoor het back-upbestand. De app is een installeerbare PWA.

## Wat is (nog) voorbeeld?

- **Standaard zijn prijzen voorbeeldprijzen.** Er zijn géén live winkelprijzen gekoppeld. De tabel in
  [`src/lib/prices.ts`](src/lib/prices.ts) is alleen bedoeld om de werking te tonen. Zodra je via *Prijzen beheren*
  eigen prijzen invult, gaan die vóór; de melding op de inkooplijst en in de offerte laat zien hoeveel prijzen nog
  voorbeeld zijn, of 'Eigen prijzen, bijgewerkt op …' als alles eigen is.
- **AI-analyse en AR-meten zijn hulpmiddelen.** AI-maten zijn grove schattingen en AR wijkt vaak een paar cm af;
  de berekening gebruikt altijd de maten die in de velden staan. AI vereist een eigen API-sleutel; AR een geschikt toestel.
- **Cloud-sync bestaat nog niet** (staat als 'binnenkort' in de app).
- **Arbeidsuren** in de offerte zijn een indicatieve schatting op basis van eenvoudige normen.

## Rekenregels

Alle formules staan in [`src/lib/calc.ts`](src/lib/calc.ts) (object `REGELS`) en zijn getest in `calc.test.ts`:

| Onderdeel | Vuistregel |
| --- | --- |
| Tegels | netto m² × (1 + snijverlies), afgerond op hele dozen |
| Tegellijm | 3,5 kg/m² (≤ 30 cm) · 4,5 kg/m² (≤ 60 cm) · 5,5 kg/m² (groter), zak 25 kg |
| Voegmiddel | (A + B) / (A × B) × voegbreedte × tegeldikte × 1,6 kg/m² + 10% |
| Primer | 0,15 L/m², bus 5 L |
| Waterdichting | 1,4 kg/m² (2 lagen) op vloer + douchewanden tot 2,10 m, emmer 7 kg |
| Egaliseren | 1,6 kg per m² per mm, zak 25 kg |
| Kit | ± 8 m voeg per koker van 310 ml |
| Vloerverwarming | mat op ca. 70% van de vloer |

## Eigen prijzen

Eigen prijzen worden per apparaat in `localStorage` bewaard (sleutel `slimmer-wonen:prijzen:v1`). Gebruik
*Exporteren* (JSON of CSV) om een back-up te maken of ze naar een ander apparaat te verhuizen, en *Importeren* om
ze terug te zetten (ingelezen prijzen winnen van wat er al stond). Het CSV-bestand (`;`, decimale komma) opent
direct in Excel; je kunt het daar ook invullen en weer importeren.

Techniek: de prijslaag werkt via een `PrijsBron`-interface in [`src/lib/prices.ts`](src/lib/prices.ts):

```ts
export interface PrijsBron {
  id: string
  naam: string
  isVoorbeeld: boolean
  peildatum: string
  aanbiedingen(product: ProductId): PrijsAanbod[] // { winkel, prijs, bron, inhoud?, productNaam?, link?, bijgewerkt? }
}
```

`metEigenPrijzen(voorbeeldPrijsBron, eigen)` in [`src/lib/eigenPrijzen.ts`](src/lib/eigenPrijzen.ts) legt de eigen
prijzen over de voorbeeldbron heen (eigen prijs wint, 'niet leverbaar' haalt de winkel weg, een afwijkende inhoud
per verpakking rekent het aantal verpakkingen om). `usePrijsBron()` uit `src/lib/prijsStore.ts` levert de actieve
bron aan inkooplijst, winkeltotalen, goedkoopste winkel en offerte. Wil je later een echte feed/API koppelen, maak
dan een eigen `PrijsBron` en gebruik die als basis in plaats van `voorbeeldPrijsBron`.

## Ontwikkelen

```bash
npm install
npm run dev      # lokale ontwikkelserver
npm test         # unit tests (vitest)
npm run build    # productiebuild in dist/
npm run icons    # PWA-iconen opnieuw genereren uit public/logo-mark.svg
```

Stack: Vite, React, TypeScript, Tailwind CSS. Publicatie via GitHub Actions naar GitHub Pages.

## Versie 1.0

Maatklaar 1.0 is live: opmeten, berekenen, inkooplijst, offerte, factuur, planning en eigen prijzen. De app is **nu gratis**; alle gegevens blijven op het apparaat. Vul onder Prijzen beheren je eigen inkoopprijzen in (geen live bouwmarkt-API).

## Account en cloud-sync (optioneel)

Zonder account werkt alles lokaal. Met een account (Supabase: inloglink of e-mail + wachtwoord) worden projecten
(incl. planning/uren), facturen, eigen prijzen en bedrijfsgegevens gesynchroniseerd als documenten in één tabel
`user_data` (laatste wijziging wint, verwijderen via tombstones). Foto's blijven lokaal. Bij de eerste keer inloggen
vraagt de app of lokale gegevens mogen worden samengevoegd; er wordt nooit lokaal iets verwijderd.

- Database inrichten: plak [`supabase/schema.sql`](supabase/schema.sql) in Supabase → SQL Editor → Run (idempotent, met RLS).
- Config: `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` (standaard het project van Maatklaar; de publishable key is publiek).
- De testversie bewaart haar documenten apart (`kind` met voorvoegsel `test-`) en heeft een eigen sessie.

## Testversie voor aannemers

Een aparte testlink om door te sturen: **https://mariusvanderkolk-arch.github.io/maatklaar-test/**

- Zelfde code, gebouwd met `VITE_TEST_MODE=true` (gebeurt automatisch in de repo `maatklaar-test`, omdat de reponaam op `-test` eindigt).
- Toont een banner "Testversie", een knop **Feedback geven** (formulier, versturen via WhatsApp of e-mail, geen server), titel "Maatklaar (test)" en `noindex`.
- Gebruikt een eigen opslag (`slimmer-wonen-test:*`), dus botst niet met de gewone app op hetzelfde apparaat. Voorbeeldprojecten en rondleiding verschijnen bij het eerste bezoek.
- Bijwerken: `npm run publiceer:test` zet de huidige `origin/main` op de testlink (of `npm run publiceer:test -- <branch>`). Lokaal bouwen: `npm run build:test` (map `dist-test`).

## Merknaam en opslag

De app heette eerder Slimmer Wonen. Opslagsleutels (`slimmer-wonen:*`, `slimmer-wonen-test:*`), IndexedDB-namen,
de interne back-up-id en de Supabase-`kind`-namen zijn bewust ongewijzigd, zodat bestaande gegevens en cloud-sync blijven werken.
De oude URL's (`/slimmer-wonen/`, `/slimmer-wonen-test/`) zijn kleine redirect-repo's naar `/maatklaar/` en `/maatklaar-test/`.
