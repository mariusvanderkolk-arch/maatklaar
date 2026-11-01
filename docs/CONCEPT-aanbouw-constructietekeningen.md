# CONCEPT — Aanbouw + constructietekening invoegen (niet gebouwd)

Status: concept. Niets gebouwd/gedeployed. Gebaseerd op `main` @ `d6fe9e8` (repo `/workspace/slimmer-wonen`).
Regel: elke "kan nu" heeft een codebewijs. Alles zonder bewijs staat als **GAP**.

## Samenvatting voor Marius
Maatklaar kent vandaag **geen aanbouw**: projecttypes zijn alleen badkamer/toilet/keuken/vloer, de plattegrond is een rechthoekige binnenruimte, en er is **geen enkele manier om een tekening/PDF als ondergrond in de plattegrond te zetten**. Aanbouw-specifieke offerteposten (fundering, dak, kozijnen, isolatie…) bestaan niet. Daarom adviseer ik **géén SEO-pagina "aanbouw-offerte"** nu — die zou een productclaim doen die de app niet waarmaakt. Wél haalbaar: een MVP (Fase B) van ~12–18 dagen.

## Wat de app nu doet (bewezen)
| Onderdeel | Bewijs |
|---|---|
| Projecttypes = 4 ruimtes | `src/lib/types.ts:42` `export type ProjectType = 'badkamer' \| 'toilet' \| 'keuken' \| 'vloer'` |
| Onbekend type valt terug op badkamer | `src/lib/ontwerp/model.ts:518` `... : 'badkamer'` |
| Ruimte = rechthoek L×B×H | `src/lib/ontwerp/model.ts:218` `interface Kamer { L; B; H; tegelH; type }`; `src/lib/types.ts:77` `Afmetingen { lengte, breedte, hoogte, ... }` |
| Openingen: alleen deur/raam als maten (geen positie) | `src/lib/types.ts:53` `type: 'deur' \| 'raam'`, breedte/hoogte/vanafVloer |
| Plattegrond-tekening = vaste rechthoekige wand | `src/components/ontwerp/OntwerpPlan.tsx:203` path `M0 0V${B}H${L}V0Z`; `:174` achtergrond = effen `fill="#FBF8F2"` rect (geen afbeelding) |
| Schematische plattegrond schaalt mee met maten | `src/components/Plattegrond.tsx:5` "Schematische plattegrond die meeschaalt met de ingevoerde maten." |
| Symbolen/items zijn interieur (sanitair, meubels, keuken) | `src/lib/ontwerp/model.ts:68` `ITEMS` met `ruimtes: ['badkamer']` e.d. |
| Plattegrond export naar PNG | `OntwerpPlan.tsx:226` `planNaarPng(...)` |
| 3D-weergave van de ruimte | `src/lib/ontwerp/scene3d.ts` |
| Foto's toevoegen (alleen afbeeldingen, los van plattegrond) | `src/components/Fotos.tsx:69` `accept="image/*"`; `types.ts:202` `fotos: PhotoRef[]` |
| Werkzaamheden (scope) = interieur/afbouw | `src/lib/types.ts:3` `ScopeKey`: sloopwerk, container, egaliseren, dekvloer, stucwerk, plafond, elektra, leidingwerk, ventilatie, deur, voorzetwand, … |
| Eigen extra artikelen op offerte | `src/lib/types.ts:241` `ExtraArtikel { id: ProductId of 'eigen-…', aantal }` |
| Meer-/minderwerk met bedrag of materiaal+uren | `src/lib/meerwerk.ts:16,26` `MeerwerkItem`, `modus: 'bedrag' \| 'berekend'` |

## GAPs (even belangrijk als features)
- **GAP** projecttype aanbouw/uitbouw/uitbreiding — bestaat niet (`types.ts:42`).
- **GAP** niet-rechthoekige of samengestelde plattegrond (L-vorm, aansluiting op bestaand huis) — Kamer is alleen L×B.
- **GAP** openingen met positie op een wand (kozijnen plaatsen) — `Opening` heeft geen positie/wand.
- **GAP** tekening/PDF/afbeelding als achtergrond of overlay in de plattegrond — achtergrond is effen kleur; geen file-input in ontwerp (enige file-inputs: `Fotos.tsx`, `MeerwerkKaart.tsx`, beide `image/*`).
- **GAP** PDF-import überhaupt (geen `pdf`-input; "PDF" in code = offerte/bon-export).
- **GAP** DXF/DWG/IFC — geen hits in `src/`.
- **GAP** schaal-kalibratie, lagen, eigen maatlijnen tekenen.
- **GAP** constructie-symbolen (fundering, balken, kolommen, dakopbouw).
- **GAP** aanbouw-posten in scope: fundering, grondwerk, buitenmuren/spouw, dak/dakbedekking, isolatie (Rc), kozijnen/glas, doorbraak bestaande gevel, staalconstructie, hemelwaterafvoer — geen ScopeKey hiervoor.
- **GAP** m²/m³-berekeningen fundering/beton/metselwerk.
- Kan nu alleen als **workaround** (bewezen mechanisme, geen aanbouw-functionaliteit): posten handmatig als `ExtraArtikel 'eigen-…'` of meerwerk-bedrag, en tekeningen als foto (afbeelding) in het project. Of dat een bruikbare aanbouw-offerte oplevert is **niet getest** → niet claimen.

## Voorstel gefaseerd
### Fase A — SEO/gids: **nu niet**
Geen onderbouwing dat de app aanbouw ondersteunt. Hoogstens later een neutrale gids (kostenposten aanbouw) zónder productclaim — liever wachten tot Fase B live staat. 0 dagen.

### Fase B — MVP (≈12–18 dagen)
1. `ProjectType` + `'aanbouw'` (types, `ruimteIcons`, `VERGEET_REGELS`, fallback model.ts:518, effectieveScope, compacte link) — 2–3 d. Risico: alle `Record<ProjectType,…>` moeten worden gevuld (compiler helpt).
2. Nieuwe ScopeKeys aanbouw: fundering, grondwerk, buitenmuur, dak, isolatie, kozijnen, gevel-doorbraak, hwa (+ hergebruik elektra/leidingwerk/stucwerk/dekvloer). Berekening m² vloer/dak/gevel uit L×B×H; geen constructieve berekening — 3–4 d.
3. Onderlegger in plattegrond: upload PNG/JPG (+ PDF eerste pagina → rasteren in browser, bv. pdf.js) als `<image>` onder de wanden in `OntwerpPlan`; opacity-slider, aan/uit — 3–4 d.
4. Schaal-kalibratie: klik 2 punten + vul bekende maat in → px/cm; verplaatsen/roteren onderlegger — 2–3 d.
5. Openingen met positie op wand (kozijnen) in plan + 3D — 2–4 d.
Datamodel: `Ontwerp.onderlegger?: { fotoId, schaalPxPerCm, x, y, rot, opacity, pagina? }` (bestand via bestaande foto-opslag, niet in offerte-link). Security: bestanden lokaal/privé, PDF client-side renderen (geen server-parse), grootte-limiet, geen SVG-upload (XSS).
Niet-rechthoekige vorm blijft buiten MVP → aanbouw = rechthoek.

### Fase C — later (≈15–25+ dagen)
DXF-import (2D-lijnen als laag), lagen-paneel, vrije polygonen/L-vorm, eigen maatlijnen, constructie-symbolen, fundering-m³/beton/metselwerk, aansluiting bestaand huis. DWG/IFC alleen via conversie (licentie/complexiteit).

## Bewust NIET in v1
Constructieve berekeningen/sterkte, vergunning-/Bbl-check, DWG/IFC, BIM, automatische herkenning van tekeningen, publieke prijzen/betaal-claims (Hornbach), SEO-claims vóór livegang.

## Afhankelijkheid dossier/meerdere ruimtes
Aanbouw = vaak aanbouw + keuken/badkamer erin → past op `docs/CONCEPT-meerdere-ruimtes.md` (dossier). Fase B kan los (1 project = de aanbouw); dossier maakt combi-offerte later netjes. Bij abonnementen: dossier als 1 project tellen.

## Beslispunten Marius
1. Bouwen (Fase B) of eerst niets/neutrale gids zonder productclaim?
2. Onderlegger: alleen PNG/JPG, of ook PDF (pdf.js, +1–2 d)? DXF pas Fase C?
3. Aanbouw als rechthoek in v1 akkoord?
4. Welke aanbouw-posten standaard (lijst hierboven ok?) en met eenheden m²/m¹/stuk?
5. Eerst dossier (meerdere ruimtes) of eerst aanbouw?

---

## Status MVP (fase B) — branch `feature/aanbouw-mvp` (niet live)

**Gebouwd**
- Projecttype **Aanbouw** met fase "Casco aanbouw": grondwerk, fundering, buitenmuur/gevel, isolatie, dak (+ daktrim), HWA, kozijnen, gevel-doorbraak (+ sloopwerk/container, afbouw zoals dekvloer, elektra, stucwerk).
- Hoeveelheden uit L×B×H + doorbraak + overstek (`src/lib/aanbouw.ts`): vloer m², fundering m¹ (L+2B), gevel netto m² (min kozijnen), isolatie m², dak m² met overstek, daktrim m¹, doorbraak m¹. **Geen sterkte-/constructieberekening**; teksten verwijzen naar de constructeur.
- Casco-posten hebben **geen richtprijs** ("Geen prijs" tot de aannemer een eigen prijs invult). Geen Hornbach-prijzen of betaalclaims.
- Ontwerp: items **Kozijn** en **Schuifpui** in de wand (2D-symbool + 3D met gat; schuifpui met middenstijl, geen vensterbank op vloerniveau). Knop "Overnemen in berekening" zet kozijnen/deuren uit het ontwerp in de openingen bij Meten.
- **Onderlegger**: PNG/JPG of PDF (alleen pagina 1, in de browser omgezet met pdf.js, `isEvalSupported:false`), max 15 MB, controle op echte bestandsinhoud (SVG en overige geweigerd), opnieuw getekend als PNG (max 3000 px; metadata weg). Aan/uit, zichtbaarheid 10–100%, draaien (1°/90°), verschuiven, kalibreren (2 punten + echte afstand in cm).
- Privacy: afbeelding alleen in IndexedDB op het apparaat (`onderlegger:<projectId>`); niet in cloud-sync van foto's, niet in de offerte-link, niet in de PNG-export (data-ui). Alleen de instellingen (schaal/positie) gaan mee met het ontwerp.

**Open / TODO**
- Geen automatische arbeidsuren voor casco-werk (alleen hoeveelheden).
- Kozijnhoogte/borstwering per kozijn instelbaar maken (nu vaste standaard 150/60 cm en 230 cm); dakvorm (plat/schuin), m³ grondwerk/beton.
- PDF: andere pagina's kiezen; onderlegger op een tweede apparaat opnieuw kiezen (afbeelding synct bewust niet).
- AI-herkenning en inspraak kennen 'aanbouw' nog niet (bewust).
- Geen SEO-/marketingpagina voor aanbouw; pas na test door Marius.
