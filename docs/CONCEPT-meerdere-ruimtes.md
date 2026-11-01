# Productconcept: meerdere ruimtes in één offerte (niet gebouwd)

## Huidige stand (geverifieerd in code)
- `Project` (src/lib/types.ts) = één ruimte: `type: 'badkamer'|'toilet'|'keuken'|'vloer'`, één `afmetingen`, één `scope`, tegels/legvloer/keuken-spec, `meerwerk[]`, `offerte` (nummer, teken-token), `planning`, `fotos`.
- Offerte: `maakOfferteData(p, b, bedrijf, …)` → `OfferteData` snapshot → `offerte_delen` RPC (token + hash) → klant tekent via link (ondertekenen.ts). Hash bindt handtekening aan exact die snapshot.
- Meerwerk: bonnen per project, bonnummer `<offerteNr>-MWn`, verrekend via `meerwerkFactuurRegels`.
- Factuur: `maakFactuur(OfferteData, { projectId, … })` — één project per factuur.
- Billing (uit, `VITE_BILLING_ENABLED`): gratis = `GRATIS_MAX_PROJECTEN = 2` actieve projecten. **Let op:** een totaalrenovatie als losse projecten raakt die limiet direct als billing aangaat.

## Voorstel: "Dossier" boven projecten (aanbevolen) i.p.v. ruimtes binnen een project
Optie A – ruimtes in Project (`ruimtes: Ruimte[]`): raakt bijna alle code (calc, ontwerp, 3D, inkooplijst, AI, sync). Groot risico.
Optie B – **Dossier** dat bestaande projecten groepeert (aanbevolen): calc/ontwerp per ruimte blijven ongewijzigd.

### Datamodel (B)
```ts
interface Dossier { id; naam; klant; adres; projectIds: string[]; offerte?: OfferteStatus; createdAt; updatedAt }
// Project krijgt optioneel: dossierId?: string
```
- Opslag: zelfde lokale store + cloud-sync als projecten (nieuwe tabel/collectie `dossiers`), backup.ts uitbreiden.
- Klant/adres op dossier = bron; projecten erven bij aanmaken (geen dubbele bron van waarheid: bij wijzigen dossier → projecten bijwerken).

### Offerte en delen
- `maakDossierOfferteData(dossier, projecten[])` → `OfferteData` met secties per ruimte (eigen subtotaal, schets/3D per ruimte), totaal, één blok aannames (samengevoegd + per ruimte).
- Eén dossiernummer; delen via bestaande `offerte_delen` RPC (snapshot is al vrij formaat → controleren of server-side schema/size-limiet past; 3D-beelden per ruimte maken snapshot groter).
- Ondertekenen: één handtekening voor de hele dossier-snapshot. v1: alles-of-niets (geen per-ruimte akkoord).
- Losse projectoffertes blijven mogelijk; als een project in een getekend dossier zit, waarschuwen bij losse offerte.

### Meerwerk en factuur
- Meerwerkbonnen blijven per project; bonnummer `<dossierNr>-MWn` wanneer project in dossier zit (nummer-teller op dossierniveau om dubbele nummers te voorkomen).
- Factuur: `maakFactuur` krijgt `dossierId` optie; regels = alle ruimtes + getekend meerwerk van alle projecten. `projectId` → `bronId` + `bronType`.

### Migratie
- Geen verplichte migratie: bestaande projecten zonder `dossierId` werken als nu. `normaliseer`/lees-functies tolerant voor ontbrekend veld. Cloud: kolom nullable.
- Oude gedeelde offertes (tokens) blijven geldig; hash-verificatie ongewijzigd.

### Billing
- Beslissen vóór bouw: telt een dossier als 1 project, of tellen ruimtes? Voorstel: dossier telt als 1 actief project (anders is totaalrenovatie voor gratis gebruikers onmogelijk). Geen publieke communicatie hierover tot pricing-OK.

## MVP (v1)
1. Dossier aanmaken, bestaande/nieuwe projecten toevoegen/verwijderen.
2. Gecombineerde offerte-weergave + PDF met secties per ruimte en totaal.
3. Delen + één handtekening voor het geheel.
4. Factuur vanuit getekend dossier (incl. getekend meerwerk).
5. Tests: calc-totalen = som projecten; hash/teken-flow; backup round-trip; sync.

## Bewust NIET in v1
- Akkoord per ruimte / optionele ruimtes die klant aan/uit zet.
- Eén gezamenlijke plattegrond of 3D van de hele woning.
- Gedeelde materialen/inkooplijst-optimalisatie over ruimtes (bijv. dozen tegels delen).
- Fasering/planning over ruimtes heen (planning blijft per project).
- Nieuwe ruimtetypen (woonkamer, slaapkamer) — alleen bestaande 4 types.
- Marketingclaims: SEO-pagina's blijven "één project = één ruimte" zeggen tot v1 live staat.

## Schatting
Datamodel + store/sync/backup: 1–2 dagen · offerte-data + weergave/PDF: 2–3 dagen · delen/teken/factuur: 1–2 dagen · tests + polish: 1–2 dagen.
