# Offertecheck — testversie

## Bestaand versus toegevoegd
- Bestaand: generieke `VergeetCheck` per projecttype, handmatig Toevoegen/Niet nodig en bevestiging alleen vóór de gewone deelknop. Losse meldingen voor fictieve prijzen/bedrijfsgegevens. Inkoop telt ontbrekende prijzen al als nul; eigen nulprijzen zijn toegestaan. Bestaande normalisatie/calculatie blijft leidend.
- Toegevoegd: bedragen-/invoercontrole vóór gewone link, PDF (inclusief bijbehorende QR/tekenlink), WhatsApp en nieuwe/hergebruikte tekenlink. Eén bewuste bevestiging voor onveranderde inhoud op dit offertescherm; geen automatische toeslagen, verzending of wijzigingen in berekening/btw.
- Hergebruikt: vergeetregels in één pure module. Alleen herinneringen met aanknopingspunt in gekozen scope. Geen algemene Perilex-/sloop-/doorbraakveronderstellingen. Geen ontbrekende container suggereren als de berekening al bigbags/stortkosten heeft. Kitwerk alleen bij relevant tegel-/sanitair-/aanrechtwerk. Afvoer van een gedemonteerde keuken is een bespreekpunt als die niet begroot is.
- Prijscontrole: positief aantal zonder prijs, onverwacht nulbedrag, behoefte met nul koop-aantal, niet-eindige bedragen/hoeveelheden/totalen. Niet-eindige of negatieve ruwe extra aantallen worden ook gemeld als de bestaande calculator die wegfiltert. Invoerfouten apart van bedragen en optionele werkzaamheden.
- Bewust eigen €0 geldt als expliciete gratis/inbegrepen prijs. Echte lege nulregels, subcent-afronding, negatieve prijzen/kortingen en aparte minderwerkbonnen worden niet als ontbrekende prijs aangemerkt. Uren met €0-tarief vragen één expliciete bevestiging (geen apart gratis-arbeid-vlag beschikbaar).
- Nieuwe offerte-inhoud/prijsstatus/btw/scope/project maakt een nieuwe controlepoort; een oude pending actie vervalt. Deel-/tekenstatus alleen maakt geen nieuwe inhoud. Geen opgeslagen reviewvlag of persoonsgegevens in analytics.

## Reference lock / keuzes
Direct-build op bestaande Quote, VergeetCheck en TekenKaart; bestaande Card/Button, sand/ink/gold en rust uitsluitend voor ongeldige invoer. Geen redesign of extern UI-patroon. Onderzoek: broncomponenten; Refero craft-details (focus en formulierfeedback). Invoerfouten, prijzen en optionele posten apart; concrete uitleg naast de regels. Inline bevestiging met naam van gekozen actie, toetsenbordfocus op het paneel, bestaande tikdoelen. Voorbeeld-/bedrijfsmeldingen blijven apart en worden niet gedupliceerd.

## Niet beloofd / handmatige QA
Geen zekerheid dat een offerte compleet is; bestaande installaties, eigen afspraken, constructieve geschiktheid en juiste btw moeten door de aannemer beoordeeld worden. Geen bedragen of scope automatisch toevoegen. Bewust doorgaan blijft ook bij een invoerwaarschuwing mogelijk. Browser- of print-menu's buiten de appknoppen (Ctrl+P) zijn geen gecontroleerde exportactie.

QA op TEST, zonder echte klantberichten:
1. Eigen artikel met ontbrekende prijs en aantal >0: Offertecheck. Gewone delen/PDF/WhatsApp/Tekenlink delen laten eerst controle zien; annuleren opent geen venster of link.
2. Controleer gekozen-actienaam, duidelijke prijsregel, focus en mobiel 375px zonder horizontale overflow. Alleen synthetische klantgegevens gebruiken. Niet werkelijk delen/WhatsApp versturen.
3. Bewust doorgaan opent alleen de gekozen bestaande actie. Dezelfde ongewijzigde offerte vraagt niet nogmaals. Wijzig prijs/aantal/notitie/btw: opnieuw controle; oude pending PDF voert niet later uit.
4. Badkamer met toilet/tegels zonder kit: optioneel aandachtspunt. Los schilder/stucproject geen badkamer-naglijst. Sloop met bigbags/stort geen onterechte afvoerwaarschuwing.
5. Bewuste eigen nulprijs, negatieve korting en minderwerk blijven toegestaan. Schilderplan/kleuren en 9%/21%-regels/preview blijven ongewijzigd.

## Testpublicatie
`npm run publiceer:test -- HEAD` publiceert expliciet deze feature-ref, niet de standaard origin/main. De test-publicatiestap is begrensd tot een normale fast-forward push (geen force): bestaande onafhankelijke testwijzigingen kunnen niet ongemerkt worden overschreven. Productie/main wordt niet gepusht of gemerged.

## Tooling
JSDOM is alleen een devDependency voor de echte ReactDOM-integratietests. Geen bestaande pakketversies bijgewerkt; npm nestelt de bestaande optionele PDF-canvasdependency onder pdfjs wegens de jsdom-peer. `npm audit` meldt een bestaande Vite high-advisory; geen ongerelateerde dependencyfix uitgevoerd.
