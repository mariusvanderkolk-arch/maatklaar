# Concept: live demo-plattegrond in de homepage-hero

**Wat** — Een tikbare voorbeeld-badkamer (bestaande `Plattegrond`-component) in de hero. Bezoeker verstelt lengte/breedte per 10 cm en zet inloopdouche/toilet/wastafel aan of uit; de tekening schaalt mee en vloer- en tegelwand-m² rekenen direct mee. Knop **"Maak dit van jouw klus"** → `/nieuw` (bestaande flow, Probeer het gratis, geen prijzen).

**Waarom** — 59 bezoekers, 5% start een project. Meteen zelf iets bedienen laat zien wat de app doet, zonder video of uitleg.

**Desktop (lg+)** — Demo vervangt de hero-video in de rechterkolom (zelfde zand/goud/ink, card, Button).
**Mobiel** — Hero ongewijzigd (poster + uitgestelde video, LCP blijft de h1/poster). Compacte demo-kaart direct onder de hero, buiten de eerste viewport.

**Toegankelijkheid** — Echte knoppen met aria-labels, `aria-pressed` voor onderdelen, `aria-live` voor maten/m², focus-ring goud, `motion-reduce` zonder transities.
**Privacy** — Alles in React-state; niets in localStorage/IndexedDB (zoals `src/lib/demo.ts`). Pure logica in `src/lib/heroDemo.ts` + tests.

**Analytics** — Bewust geen nieuw event: `EVENT_NAMEN` is gespiegeld in de Supabase RLS-policy. Voorstel later: `hero_demo_gebruikt` + `hero_demo_start` toevoegen (code + policy samen).
