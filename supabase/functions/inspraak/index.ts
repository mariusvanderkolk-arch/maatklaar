// Maatklaar – Inspreken: zet een gesproken/getypte omschrijving om naar projectvelden met Google Gemini.
// POST { tekst } → { resultaat }   (503 zolang GEMINI_API_KEY niet is ingesteld; de app valt dan terug op de eigen regel-parser)
// Eén bestand, zonder imports: kan zo in het Supabase-dashboard worden geplakt. Zet "Verify JWT" UIT (de app stuurt de publishable key).
// Secrets: GEMINI_API_KEY (verplicht), GEMINI_MODEL (optioneel, standaard gemini-2.5-flash), APP_ORIGIN (optioneel, komma-gescheiden).

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
}
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...cors, 'content-type': 'application/json' } })

const SCOPE = ['sloopwerk', 'container', 'dekvloer', 'egaliseren', 'leidingwerk', 'elektra', 'waterdicht', 'vloerverwarming', 'radiator', 'wandtegels', 'vloertegels',
  'spatwand', 'legvloer', 'ondervloer', 'plinten', 'inloopdouche', 'bad', 'toilet', 'wastafelmeubel', 'fontein', 'ventilatie', 'kitwerk', 'stucwerk', 'plafond', 'deur']

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    type: { type: 'STRING', enum: ['badkamer', 'toilet', 'keuken', 'vloer'] },
    lengte: { type: 'NUMBER', description: 'langste zijde in meter' },
    breedte: { type: 'NUMBER', description: 'kortste zijde in meter' },
    hoogte: { type: 'NUMBER', description: 'plafondhoogte in meter' },
    tegelhoogte: { type: 'STRING', description: "'plafond' of een getal in meter als tekst" },
    aan: { type: 'ARRAY', items: { type: 'STRING', enum: SCOPE } },
    uit: { type: 'ARRAY', items: { type: 'STRING', enum: SCOPE } },
    container: { type: 'OBJECT', properties: { maat: { type: 'INTEGER', enum: [3, 6, 10, 15] }, soort: { type: 'STRING', enum: ['gemengd', 'puin', 'hout', 'grond'] } } },
    klant: { type: 'STRING' },
    notitie: { type: 'STRING', description: 'overige wensen die niet in de velden passen, kort' },
  },
  required: ['aan', 'uit'],
}

const PROMPT = `Je zet de gesproken omschrijving van een Nederlandse aannemer om naar velden voor een renovatieproject.
Ruimtetypes: badkamer, toilet, keuken, vloer (woonkamer/slaapkamer/laminaat/pvc = vloer).
Onderdelen (gebruik alleen deze sleutels): ${SCOPE.join(', ')}.
Regels: "vervangen", "slopen", "eruit" → sloopwerk aan. "tegels" zonder meer in badkamer/toilet → wandtegels en vloertegels; in keuken → spatwand.
"douche" → inloopdouche. "bad" (niet badkamer) → bad. "laminaat"/"pvc vloer" → legvloer. "spots/stopcontacten" → elektra. "afzuiging" → ventilatie.
"geen X"/"zonder X" → X in uit. "big bags" → container in uit. Container: maat in m³/kuub (3, 6, 10, 15) en soort (gemengd, puin, hout, grond).
Maten in meter (cm omrekenen). "tegels tot plafond" → tegelhoogte "plafond". Laat velden weg die niet genoemd worden. Verzin niets.`

const recent = new Map<string, number[]>()
function teVaak(ip: string) {
  const nu = Date.now()
  const lijst = (recent.get(ip) ?? []).filter((t) => nu - t < 60_000)
  lijst.push(nu)
  recent.set(ip, lijst)
  return lijst.length > 10
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Alleen POST.' }, 405)
  const toegestaan = (Deno.env.get('APP_ORIGIN') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const origin = req.headers.get('origin') ?? ''
  if (toegestaan.length && origin && !toegestaan.some((o) => origin.startsWith(o))) return json({ error: 'Niet toegestaan.' }, 403)
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return json({ error: 'Geen Gemini-sleutel ingesteld.' }, 503)
  if (teVaak(req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'onbekend')) return json({ error: 'Even wachten.' }, 429)
  let tekst = ''
  try {
    tekst = String((await req.json())?.tekst ?? '').trim().slice(0, 600)
  } catch {
    /* */
  }
  if (!tekst) return json({ error: 'Geen tekst.' }, 400)
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: tekst }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
    })
    if (!r.ok) return json({ error: `Gemini ${r.status}` }, 502)
    const d = await r.json()
    const uit = d?.candidates?.[0]?.content?.parts?.[0]?.text
    const resultaat = JSON.parse(uit ?? '{}')
    if (typeof resultaat.tegelhoogte === 'string' && resultaat.tegelhoogte !== 'plafond') resultaat.tegelhoogte = Number(resultaat.tegelhoogte.replace(',', '.')) || undefined
    return json({ resultaat })
  } catch {
    return json({ error: 'Verwerken mislukt.' }, 502)
  }
})
