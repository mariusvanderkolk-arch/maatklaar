// Maatklaar – Hulpchat-melding: stuurt een korte e-mail als iemand een vraag stelt in de hulpchat.
// POST { vraag, beantwoord, scherm, site } → 204. Eén bestand, zonder imports (plakbaar in het Supabase-dashboard).
// Geen persoonsgegevens: de app anonimiseert de vraag al (mail/nummers weg); hier nogmaals.
// Kanalen (elk optioneel, minstens één nodig): e-mail via Resend en WhatsApp via CallMeBot. Nummer staat ALLEEN in secrets, nooit in de app.
// Secrets e-mail: RESEND_API_KEY + MELDING_EMAIL (ontvanger), MELDING_VAN (optioneel, bv. "Maatklaar <hulp@maatklaar.nl>"),
// Secrets WhatsApp: WHATSAPP_TO (eigen nummer, internationaal zonder +) + CALLMEBOT_APIKEY.
//          APP_ORIGIN (optioneel, komma-gescheiden). Zonder secrets: 503 en de app gaat gewoon door.
// Simpele limiet: max 10 meldingen per uur per instantie (tegen spam). Links worden weggefilterd (geen phishing-links naar je telefoon).

const toegestaan = () => (Deno.env.get('APP_ORIGIN') ?? 'https://maatklaar.nl,https://mariusvanderkolk-arch.github.io').split(',').map((x) => x.trim().replace(/\/$/, '')).filter(Boolean)
const corsVoor = (origin: string) => ({
  'access-control-allow-origin': toegestaan().includes(origin) ? origin : 'https://maatklaar.nl',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
  vary: 'Origin',
})
const anoniem = (t: string) => String(t ?? '').replace(/https?:\/\/\S+|www\.\S+/gi, '[link]').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[mail]').replace(/(\+?\d[\d\s-]{7,}\d)/g, '[nummer]').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 300)
let venster = { start: Date.now(), aantal: 0 }

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const cors = corsVoor(origin)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return new Response('method', { status: 405, headers: cors })
  if (!toegestaan().includes(origin)) return new Response('origin', { status: 403, headers: cors })
  const key = Deno.env.get('RESEND_API_KEY'), naar = Deno.env.get('MELDING_EMAIL')
  const waNr = (Deno.env.get('WHATSAPP_TO') ?? '').replace(/\D/g, ''), waKey = Deno.env.get('CALLMEBOT_APIKEY')
  const mail = Boolean(key && naar), wa = Boolean(waNr && waKey)
  if (!mail && !wa) return new Response('niet ingesteld', { status: 503, headers: cors })
  if (Date.now() - venster.start > 3600_000) venster = { start: Date.now(), aantal: 0 }
  if (++venster.aantal > 10) return new Response('limiet', { status: 429, headers: cors })
  let b: { vraag?: string; beantwoord?: boolean; scherm?: string; site?: string }
  try { b = await req.json() } catch { return new Response('json', { status: 400, headers: cors }) }
  const vraag = anoniem(b.vraag ?? '')
  if (!vraag) return new Response('leeg', { status: 400, headers: cors })
  const status = b.beantwoord ? 'beantwoord door de hulp' : 'NIET beantwoord – mogelijk even reageren'
  const site = b.site === 'test' ? 'testsite' : 'maatklaar.nl'
  // Kanalen parallel, elk met een eigen time-out. Een trage CallMeBot (die berichten in een wachtrij zet) mag nooit een 502 geven:
  // bij time-out geldt de melding als "aangenomen". 502 alleen als alle kanalen echt zijn mislukt (met logregel, zonder geheimen).
  type Uitslag = 'ok' | 'trage' | 'fout'
  const metTimeout = (naam: string, p: Promise<Response>): Promise<Uitslag> =>
    p.then(async (r) => {
      if (r.ok) return 'ok' as Uitslag
      console.error(`${naam}: HTTP ${r.status} ${(await r.text().catch(() => '')).slice(0, 200)}`)
      return 'fout' as Uitslag
    }).catch((e) => {
      const trage = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')
      console.error(`${naam}: ${trage ? 'time-out' : 'netwerkfout'}`)
      return (trage ? 'trage' : 'fout') as Uitslag
    })
  const taken: Promise<Uitslag>[] = []
  if (mail) taken.push(metTimeout('resend', fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      from: Deno.env.get('MELDING_VAN') ?? 'Maatklaar <onboarding@resend.dev>',
      to: [naar],
      subject: `Hulpchat (${site}): ${vraag.slice(0, 60)}`,
      text: `Nieuwe vraag in de hulpchat\n\nVraag: ${vraag}\nStatus: ${status}\nScherm: ${anoniem(b.scherm ?? '-').slice(0, 60)}\nSite: ${site}\n\nDe vrager is anoniem; reageren kan alleen als die zelf via WhatsApp/e-mail contact opneemt.`,
    }),
  })))
  if (wa) taken.push(metTimeout('callmebot', fetch(`https://api.callmebot.com/whatsapp.php?phone=${waNr}&apikey=${encodeURIComponent(waKey!)}&text=${encodeURIComponent(`Maatklaar hulpchat (${site}): ${vraag}\n${status}`)}`, { signal: AbortSignal.timeout(6000) })))
  const uitslagen = await Promise.all(taken)
  const ok = uitslagen.some((u) => u === 'ok' || u === 'trage')
  return new Response(null, { status: ok ? 204 : 502, headers: cors })
})
