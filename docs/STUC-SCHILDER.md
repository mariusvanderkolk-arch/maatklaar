# Stucwerk en Schilderwerk (7 november 2026)

Twee afzonderlijke, client-side projecttypes. Oude projecten/offertelinks houden hun bestaande 21%-gedrag. Geen schemawijziging, nieuwe connector of betaalfunctie.

## Referentielock en keuzes

Direct-build volgens bestaande Maatklaar UI: ProjectForm typekaarten, Measure Card/CardHeader/NumberField en bestaande Plattegrond SVG met optionele verflaag. Ink/sand/gold rollen, typografie, responsive grids en bestaande controls behouden. Refero craft-details toegepast voor labels, toetsenbordfocus en mobiele formulierinvoer. Geen redesign, gegenereerde afbeeldingen of nieuw design-systeem.

- Netto vlakken per project, voorbereiding/ondergrond, afwerking, dikte of verflagen, productverbruik, verpakkingsinhoud en arbeidsnorm instelbaar.
- Eigen materiaalprijs inclusief gekozen btw per vlak mogelijk; anders bestaande eigen prijslijst/expliciete voorbeeldprijs. Productcontrole blijft nodig. Uurtarief instelbaar op Offerte. Deze prijzen zijn geen actuele marktprijsclaim.
- 9% alleen na twee expliciete bevestigingen: permanente particuliere bewoning, ouder dan twee jaar bij uitvoering sinds eerste gebruik als woning. Onbekend/niet bevestigd: 21%.
- Kwalificerende voorbereiding en gebruikte materialen horen ook bij 9%, niet alleen arbeid. Per vlak altijd terug te zetten op 21%; 'ander werk' en los toegevoegde artikelen veilig standaard 21%.
- Bij gemengde panden alleen het woongedeelte; meerdere bouwstadia minimaal 50% ouder dan twee jaar. Bijzondere situaties via bron controleren.
- Offertelink bewaart per-regel tarieven; preview/print-PDF benoemt tarieven en factuurconversie rekent per regel terug naar exclusief btw. Brutoprijzen veranderen niet door btw-keuze. Onvoorzien naar verhouding verdeeld over de tarieven van het gespecificeerde werk. Bestaande meerwerkbonnen blijven standaard 21%; expliciet op offerte vermeld, zo nodig op conceptfactuur corrigeren.

## Officiële btw-bronnen, geopend 7 november 2026

https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/diensten_9_btw/werkzaamheden_aan_woningen/stukadoren

https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/diensten_9_btw/werkzaamheden_aan_woningen/schilderen

https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/diensten_9_btw/werkzaamheden_aan_woningen/woningen_ouder_dan_2_jaar

Uitgesloten van deze 9%-regeling zijn onder andere gipswanden plaatsen, tegelwerk/vloeren, vervangende kozijnonderdelen, constructief kitwerk en glasplaatsen. UI licht dit per projecttype toe. Geen automatische fiscale garantie.

## Schilderplattegrond en kleurwaaiers

Rechthoekige ruimtes (maximaal vijf), vier apart selecteerbare wanden en plafond. Bestaande planrenderer hergebruikt. Maten × hoogte minus eigen aftrek voor ramen/deuren sturen netto m², materialen en uren. De planvlakken vervangen handmatige wand/plafondvlakken: geen dubbele telling. Houtwerk en overige werkzaamheden blijven apart mogelijk. Kleurcode/naam verschijnt ook in werkzaamheden, materiaal/arbeid en print/PDF. Plan staat in Opmeten én in de Ontwerp-stap van Schilderwerk. Dit is een 2D-schematische kleurenplattegrond, geen gekalibreerde 3D-verfvisualisatie.

Kleine voorbeeldselectie van kleurcodes/namen, geen volledige merkenbibliotheken. RAL Classic, NCS, Sikkens 5051/ACC, Flexa Mengcollectie en Sigma Voice of Colour als waaierreferentie; eigen code/naam en eigen illustratieve schetskleur mogelijk. Handmatige codes worden niet tegen een volledige waaier gevalideerd.

Bronnen:
- https://www.ral-farben.de/en/all-ral-colours — technische digitale kleurwaarden vereisen een licentie; deze zijn NIET overgenomen. Alleen enkele openbare code-/naamaanduidingen; schetskleuren zijn eigen illustraties, geen officiële RGB-waarden.
- https://ncscolour.com/en-int/products/ncs-index-2050
- https://ncscolour.com/en-int/products/s-0500-n
- https://www.sikkens.nl/nl/kleurcollecties/sikkens-5051-kleuren
- https://www.sikkens.nl/nl/kleur/s0-05-85-1478016
- https://www.flexa.nl/nl/producten/flexa-mengcollectie-kleurenwaaier
- https://www.flexa.nl/nl/kleur-informatie/filters
- https://www.sigma.nl/kleur/over-onze-kleuren/sigma-voice-of-colour

Zichtbaar bij selectie en in de gerelateerde offerte/print:
“Kleuren op je scherm zijn een benadering en kunnen afwijken van de echte verf. Controleer je keuze altijd met een fysieke kleurenwaaier of een proefvlak.”

## QA

Geautomatiseerd: type-/projectroundtrip, legacy, materiaal-/urenraming, scope uit, 9/21-voorwaardenmatrix, gemengde tarieven, linkdecodering, factuur/termijnen, per-wandkleur en m²/persistentie, quote/print HTML en bestaande plannen. Geen productieklantdata aangeraakt of berichten verzonden. Visuele browser-QA op mobiel/desktop en echte PDF-download blijven een aparte controle; SSR is geen visuele end-to-end-test.
