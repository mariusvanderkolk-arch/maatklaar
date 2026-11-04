# Hulpchat-melding (e-mail + WhatsApp)

Elke vraag in de hulpchat (max 5 per bezoeker-sessie) → app POST naar Edge Function `hulp-melding` → mail via Resend én/of WhatsApp via CallMeBot.
De vraag wordt geanonimiseerd (mail/nummers weg). Ontvangeradres en nummer staan ALLEEN in Supabase-secrets, nooit in de app of deze repo.

## Instellen (eenmalig, door Marius)
1. Resend: account op resend.com (gratis tier), API key maken. Zonder eigen domein verstuurt hij vanaf onboarding@resend.dev (alleen naar het account-adres).
2. CallMeBot WhatsApp: stuur vanaf je eigen WhatsApp "I allow callmebot to send me messages" naar het CallMeBot-nummer (zie callmebot.com/blog/free-api-whatsapp-messages); je krijgt een apikey terug. Gratis.
3. Secrets zetten:
   ```
   supabase secrets set RESEND_API_KEY=... MELDING_EMAIL=<jouw maatklaar-mailadres> \
     WHATSAPP_TO=<jouw nummer, bv. 316xxxxxxxx> CALLMEBOT_APIKEY=... \
     APP_ORIGIN=https://maatklaar.nl,https://mariusvanderkolk-arch.github.io
   supabase functions deploy hulp-melding --no-verify-jwt
   ```
Zonder secrets/functie: app merkt niets (fire-and-forget).
