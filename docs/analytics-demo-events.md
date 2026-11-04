# Nieuwe analytics-events (demo + spraak)

| event | detail | wanneer |
|---|---|---|
| demo_bekeken | – | homepage-demo ≥50% in beeld (1×/sessie) |
| demo_interactie | maat / onderdeel | eerste tik in de demo (1×/sessie) |
| demo_cta | – | "Maak dit van jouw klus" |
| spraak_gestart | snelstart / geen_support | "Vertel de klus" |

supabase/analytics.sql in de repo is bijgewerkt, maar de LIVE database-policy nog NIET → inserts worden geweigerd en analytics stopt stil voor die sessie
(let op: dan ook geen latere events in die sessie). Daarom vóór live mergen deze SQL draaien (Marius OK):

```sql
-- in supabase/analytics.sql: voeg aan de name in (...) lijst toe:
--   'demo_bekeken','demo_interactie','demo_cta','spraak_gestart'
-- en aan de detail-check:
--   or (name = 'demo_interactie' and detail in ('maat','onderdeel'))
--   or (name = 'spraak_gestart' and detail in ('snelstart','geen_support'))
```
