/** Optionele AI-modus voor Maatklaar-hulp: gebruikt de eigen sleutel uit Instellingen → AI, gegrond in de kennisbank. */
import { AiFout, foutVoorStatus, tekstUitAntwoord, type ActieveAi, type Verzoek } from '../ai'
import { KENNIS } from './kennis'

export interface ChatBericht {
  rol: 'gebruiker' | 'hulp'
  tekst: string
}

export function systeemPrompt(scherm: string): string {
  const kb = KENNIS.map((k) => `- V: ${k.vraag}\n  A: ${k.antwoord}`).join('\n')
  return [
    'Je bent Maatklaar-hulp, de hulpassistent in de web-app Maatklaar (opmeten, 2D/3D-ontwerp, materiaalberekening, inkooplijst, offerte, factuur en planning voor badkamer, toilet, keuken en vloer; voor aannemers en klussers).',
    'Antwoord altijd in eenvoudig Nederlands, kort (max. ca. 120 woorden), praktisch en vriendelijk. Gebruik geen markdown-koppen; korte opsommingen met "- " mogen.',
    'Baseer uitleg over de app UITSLUITEND op de kennisbank hieronder. Verzin geen knoppen, functies of prijzen die er niet in staan. Weet je het niet zeker, zeg dat eerlijk en raad aan het Maatklaar-team te mailen of te appen.',
    'Algemene vakvragen (tegelen, kitten, droogtijden, materiaalkeuze) mag je met algemene vakkennis beantwoorden; zeg erbij dat het een algemene tip is en dat fabrieksvoorschriften voorgaan. Geef geen juridisch of fiscaal advies (verwijs naar een boekhouder).',
    `De gebruiker is nu op het scherm: ${scherm}.`,
    'KENNISBANK:',
    kb,
  ].join('\n')
}

export function maakChatVerzoek(ai: ActieveAi, historie: ChatBericht[], scherm: string): Verzoek {
  const systeem = systeemPrompt(scherm)
  const laatste = historie.slice(-8)
  if (ai.provider.soort === 'gemini') {
    const generationConfig: Record<string, unknown> = { temperature: 0.3, maxOutputTokens: 600 }
    if (/^gemini-2\.5-flash/.test(ai.model)) generationConfig.thinkingConfig = { thinkingBudget: 0 }
    return {
      url: `${ai.baseUrl}/models/${encodeURIComponent(ai.model)}:generateContent`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': ai.sleutel },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systeem }] },
          contents: laatste.map((b) => ({ role: b.rol === 'gebruiker' ? 'user' : 'model', parts: [{ text: b.tekst }] })),
          generationConfig,
        }),
      },
    }
  }
  const body: Record<string, unknown> = {
    model: ai.model,
    messages: [{ role: 'system', content: systeem }, ...laatste.map((b) => ({ role: b.rol === 'gebruiker' ? 'user' : 'assistant', content: b.tekst }))],
  }
  if (!/^(o\d|gpt-5)/.test(ai.model)) body.temperature = 0.3
  return {
    url: `${ai.baseUrl}/chat/completions`,
    init: { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ai.sleutel}` }, body: JSON.stringify(body) },
  }
}

export async function vraagAi(ai: ActieveAi, historie: ChatBericht[], scherm: string, doeFetch: typeof fetch = fetch, signal?: AbortSignal): Promise<string> {
  const { url, init } = maakChatVerzoek(ai, historie, scherm)
  let res: Response
  try {
    res = await doeFetch(url, { ...init, signal })
  } catch {
    throw new AiFout('netwerk', 'Kon de AI-dienst niet bereiken. Controleer je internetverbinding.')
  }
  if (!res.ok) throw foutVoorStatus(res.status, await res.text().catch(() => ''), ai.provider.id)
  const json = await res.json().catch(() => {
    throw new AiFout('antwoord', 'De AI-dienst gaf een onleesbaar antwoord.')
  })
  return tekstUitAntwoord(ai.provider.soort, json).trim()
}
