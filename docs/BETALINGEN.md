# Betalingen en abonnementen (Maatklaar Pro)

**Status: staat UIT.** Zolang `VITE_BILLING_ENABLED` niet `true` is, is Maatklaar voor iedereen gratis en onbeperkt.
Er zijn dan geen limieten, geen betaalmuur en geen netwerkverkeer naar de abonnemententabel.

Voorbeeldschermen (niets wordt afgesloten):

- `#/abonnement?preview=1` (gratis), `?preview=trial`, `?preview=actief`, `?preview=opgezegd`, `?preview=mislukt`, `?preview=uitgelogd`
- `#/abonnement?preview=limiet` (melding als de gratis limiet is bereikt)

## Het model

| | Gratis | Maatklaar Pro |
|---|---|---|
| Actieve projecten | 2 (voorbeeldprojecten tellen niet) | onbeperkt |
| Alle kernfuncties (opmeten, ontwerp, berekening, offerte, factuur) | ja | ja |
| Prijs | €0 | €9,99 per maand of €99 per jaar |
| Proefperiode | — | 14 dagen, zonder betaalgegevens, één keer per account |

- Prijzen staan in `src/lib/billing/config.ts` en `supabase/functions/_shared/mollie.ts`. Standaard **exclusief btw**:
  bij Mollie wordt dan €12,09 per maand of €119,79 per jaar (incl. 21% btw) afgeschreven.
  Wil je prijzen inclusief btw, zet dan `VITE_PRICES_INCL_VAT=true` (app) en `PRICES_INCL_VAT=true` (functions).
  **Laat de prijsweergave en de btw-behandeling (ook voor particulieren) nakijken door je boekhouder.**
- Bestaande gegevens worden nooit verwijderd of op slot gezet. Alleen het **aanmaken van een nieuw project** boven de
  limiet toont een melding. Openen, bewerken, offertes delen, printen en back-ups blijven altijd mogelijk.
- In versie 1 wordt alleen de projectlimiet afgedwongen. Cloud-sync en 3D op de offerte staan als Pro-voordeel op de
  pagina, maar werken voor iedereen. Dit kan later per functie aan worden gezet.

## Hoe het werkt (techniek)

1. Gebruiker logt in (Supabase Auth) en kiest **14 dagen gratis proberen** → database-functie `start_trial()` maakt
   één keer een rij in `subscriptions` (status `trial`).
2. **Kies maandelijks/jaarlijks** → Edge Function `create-checkout` maakt een Mollie-klant en een eerste betaling
   (`sequenceType: first`, levert een incassomandaat op) en stuurt de gebruiker naar de betaalpagina van Mollie.
3. Mollie roept `mollie-webhook` aan. De functie haalt de betaling **zelf opnieuw op bij Mollie** (vertrouwt de
   aanroep niet). Bij een betaalde eerste betaling maakt ze een Mollie-abonnement aan
   (start na de betaalde periode) en zet `subscriptions.status = active`. Vervolgbetalingen verlengen de periode.
   Een mislukte vervolgbetaling zet de status op `past_due` (Pro blijft nog 7 dagen werken).
4. **Opzeggen** → `cancel-subscription` stopt het Mollie-abonnement en zet de status op `canceled`. Pro loopt door tot
   het einde van de betaalde periode.
5. Beveiliging: gebruikers kunnen hun eigen rij alleen **lezen** (RLS). Schrijven kan alleen via de functies
   (service role) en `start_trial()`.

Bestanden: `supabase/billing.sql`, `supabase/functions/{create-checkout,mollie-webhook,cancel-subscription}`,
`src/lib/billing/*`, `src/screens/Abonnement.tsx`, `src/components/Betaalmuur.tsx`.

## Wat jij (Marius) moet regelen, in deze volgorde

1. **KvK-inschrijving** (en btw-nummer van de Belastingdienst).
2. **Mollie-account** aanmaken op mollie.com, bedrijfsgegevens invullen en wachten tot het account is **goedgekeurd**.
   Zet in Mollie de betaalmethoden aan: **iDEAL** en/of **creditcard** (nodig voor het eerste mandaat) en
   **SEPA-incasso** (voor de maandelijkse/jaarlijkse afschrijving).
3. In Mollie bij *Developers → API keys*: kopieer eerst de **test-key** (`test_...`). De **live-key** (`live_...`) pas
   na de test.
4. Voorwaarden en privacy: zet abonnementsvoorwaarden (opzegtermijn, prijzen) op een pagina. Mollie vraagt hier ook om.
5. **Database**: plak `supabase/billing.sql` in Supabase → SQL Editor → Run.
6. **Edge Functions deployen**, kies één van de twee:
   - **Zelf met de Supabase CLI**:
     ```
     npx supabase login
     npx supabase link --project-ref cdhrbfawrhburztuzdha
     npx supabase functions deploy create-checkout
     npx supabase functions deploy cancel-subscription
     npx supabase functions deploy mollie-webhook --no-verify-jwt
     ```
   - **Of laat het mij doen** (zie onder).
7. **Secrets** zetten (Supabase → Edge Functions → Secrets, of met de CLI):
   ```
   npx supabase secrets set MOLLIE_API_KEY=test_xxx BILLING_ENABLED=true \
     APP_ORIGIN=https://mariusvanderkolk-arch.github.io
   ```
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY` en `SUPABASE_SERVICE_ROLE_KEY` zijn er automatisch.)
   De webhook-URL is `https://cdhrbfawrhburztuzdha.supabase.co/functions/v1/mollie-webhook`. Die wordt automatisch
   aan Mollie meegegeven; je hoeft hem niet in Mollie in te stellen.
8. **Testen op de testversie**: zet in de repo `maatklaar-test` de variabele `VITE_BILLING_ENABLED=true`
   (GitHub → Settings → Secrets and variables → Actions → Variables), publiceer de testversie en doorloop met de
   test-key: account → proef → betalen (Mollie testbetaling) → status actief → opzeggen.
9. **Live**: vervang de secret door de `live_...`-key, zet `VITE_BILLING_ENABLED=true` in de repo `maatklaar`, en
   publiceer. Uitzetten kan altijd door de variabele weer weg te halen of `BILLING_ENABLED=false` te zetten (dan
   weigeren de functies nieuwe betalingen; de app moet je dan ook opnieuw publiceren met de vlag uit).

> Let op: de workflow geeft `VITE_BILLING_ENABLED` alleen door als die variabele in de repo bestaat
> (`.github/workflows/pages.yml`). Zonder variabele blijft het uit.

## Wat ik (de assistent) voor je kan doen

Geef me via een **beveiligd veld** (niet in de chat) een **Supabase access token** (Supabase → Account → Access Tokens)
en de **Mollie test-key**. Dan kan ik:

- `billing.sql` uitvoeren en controleren dat de tabellen en RLS kloppen;
- de drie functies deployen en de secrets zetten;
- de hele flow testen met Mollie-testbetalingen op de testversie en de vlag daar aanzetten;
- daarna, na jouw akkoord, live gaan met de live-key.

Ik maak zelf geen accounts aan en zet niets live zonder jouw akkoord.
