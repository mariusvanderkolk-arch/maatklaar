/** Chatpaneel van Maatklaar-hulp: offline kennisbank, optioneel AI met eigen sleutel. Geschiedenis alleen in deze sessie. */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Mail, MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { ga, type Route } from '../../lib/router'
import { beantwoord, TIPS } from '../../lib/hulp/matcher'
import { kennisVan, type HulpItem, type HulpLink } from '../../lib/hulp/kennis'
import { vraagAi, type ChatBericht } from '../../lib/hulp/ai'
import { actieveAi } from '../../lib/ai'
import { aiStore } from '../../lib/aiStore'
import { projectStore } from '../../lib/store'
import { sessieOpslag } from '../../lib/veiligeOpslag'
import { sleutel } from '../../lib/modus'
import { mailtoLink, whatsappLink } from '../../lib/feedback'
import { LogoMark } from '../Logo'
import { track } from '../../lib/analytics'

interface Bericht {
  van: 'ik' | 'hulp'
  tekst: string
  links?: HulpLink[]
  opties?: string[]
  contact?: boolean
  ai?: boolean
  /** de vraag waarop dit een antwoord is (voor 'Slimmer antwoord met AI') */
  vraag?: string
}

const OPSLAG = sleutel('hulp:chat:v1')
const CHIPS: [string, string][] = [
  ['Hoe meet ik op?', 'Hoe meet ik op?'],
  ['Hoe zet ik mijn prijzen?', 'Hoe zet ik mijn prijzen?'],
  ['Hoe maak ik een offerte?', 'Hoe maak ik een offerte?'],
  ['3D-ontwerp', 'Hoe maak ik een 3D-ontwerp?'],
  ['Facturen', 'Hoe maak ik een factuur?'],
  ['Account & cloud', 'Hoe gebruik ik de app op meerdere apparaten?'],
  ['Is het gratis?', 'Is Maatklaar gratis?'],
  ['Privacy', 'Wat gebeurt er met mijn gegevens (privacy)?'],
]
const CONTACT_MAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? ''

const SCHERM: Record<string, string> = {
  home: 'Projecten (start)', nieuw: 'Nieuw project', bewerken: 'Project bewerken', prijzen: 'Prijzen', instellingen: 'Instellingen',
  facturen: 'Facturen', factuur: 'Factuur', account: 'Account', privacy: 'Privacy', over: 'Over de app', abonnement: 'Abonnement',
}
const schermNaam = (r: Route) => (r.naam === 'project' ? `Project, stap ${r.stap}` : SCHERM[r.naam] ?? r.naam)
const tipSleutel = (r: Route) => (r.naam === 'project' ? r.stap : r.naam === 'factuur' ? 'facturen' : r.naam)

function laad(): Bericht[] {
  try {
    const r = JSON.parse(sessieOpslag.getItem(OPSLAG) ?? '[]')
    return Array.isArray(r) ? r.slice(-40) : []
  } catch {
    return []
  }
}

function antwoordBericht(vraag: string): Bericht {
  const a = beantwoord(vraag)
  if (a.soort !== 'zeker') track('chat_question_unanswered', { detail: vraag })
  if (a.soort === 'zeker') return { van: 'hulp', tekst: a.item.antwoord, links: a.item.links, opties: a.anders.map((x) => x.id), vraag, contact: a.item.id === 'contact' || a.item.id === 'fout' }
  if (a.opties.length)
    return { van: 'hulp', tekst: 'Weet ik niet zeker. Bedoel je een van deze?', opties: a.opties.map((x) => x.id), vraag, contact: true }
  return { van: 'hulp', tekst: 'Weet ik niet zeker. Probeer het anders te vragen, kies hieronder een onderwerp, of stel je vraag aan het Maatklaar-team.', opties: ['start', 'offerte', 'prijzen'], vraag, contact: true }
}

export function HulpPaneel({ open, onClose, route, hoog }: { open: boolean; onClose: () => void; route: Route; hoog: boolean }) {
  const [berichten, setBerichten] = useState<Bericht[]>(laad)
  const [invoer, setInvoer] = useState('')
  const [bezig, setBezig] = useState(false)
  const lijst = useRef<HTMLDivElement>(null)
  const veld = useRef<HTMLInputElement>(null)
  const ai = actieveAi(aiStore.get())

  useEffect(() => {
    try {
      sessieOpslag.setItem(OPSLAG, JSON.stringify(berichten.slice(-40)))
    } catch {
      /* alleen in geheugen */
    }
    lijst.current?.scrollTo({ top: lijst.current.scrollHeight, behavior: 'smooth' })
  }, [berichten])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => veld.current?.focus({ preventScroll: true }), 60)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', esc)
    }
  }, [open, onClose])

  const stel = (vraag: string) => {
    const v = vraag.trim()
    if (!v) return
    setBerichten((b) => [...b, { van: 'ik', tekst: v }, antwoordBericht(v)])
    setInvoer('')
  }
  const toonItem = (it: HulpItem) => setBerichten((b) => [...b, { van: 'ik', tekst: it.vraag }, { van: 'hulp', tekst: it.antwoord, links: it.links, vraag: it.vraag }])

  const metAi = async (vraag: string) => {
    if (!ai || bezig) return
    setBezig(true)
    const historie: ChatBericht[] = [
      ...berichten.filter((b) => b.tekst).slice(-6).map((b) => ({ rol: b.van === 'ik' ? ('gebruiker' as const) : ('hulp' as const), tekst: b.tekst })),
      { rol: 'gebruiker', tekst: vraag },
    ]
    try {
      const t = await vraagAi(ai, historie, schermNaam(route))
      setBerichten((b) => [...b, { van: 'hulp', tekst: t, ai: true }])
    } catch (e) {
      setBerichten((b) => [...b, { van: 'hulp', tekst: (e as Error).message || 'De AI-dienst gaf een fout.', ai: true }])
    } finally {
      setBezig(false)
    }
  }

  const volg = (l: HulpLink) => {
    if (l.pad.startsWith('project:')) {
      const stap = l.pad.slice(8)
      const ps = projectStore.alle()
      const id =
        route.naam === 'project' || route.naam === 'bewerken'
          ? route.id
          : ([...ps].filter((p) => !p.voorbeeld).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? ps.find((p) => p.voorbeeld))?.id
      ga(id ? `/project/${id}/${stap}` : '/')
    } else ga(l.pad)
    if (window.matchMedia?.('(max-width: 639px)').matches) onClose()
  }

  const contactTekst = (vraag?: string) => `Vraag over Maatklaar${vraag ? `: ${vraag}` : ''}\n\n(scherm: ${schermNaam(route)})`
  const tips = (TIPS[tipSleutel(route)] ?? TIPS.home).map(kennisVan).filter(Boolean) as HulpItem[]

  if (!open) return null
  return (
    <div
      id="maatklaar-hulp"
      role="dialog"
      aria-modal="false"
      aria-labelledby="hulp-titel"
      className={`no-print fixed z-50 flex flex-col overflow-hidden bg-paper shadow-[0_24px_60px_-20px_rgba(60,45,25,.55)] ring-1 ring-sand-300 max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[min(88dvh,640px)] max-sm:rounded-t-3xl sm:right-6 sm:h-[min(620px,calc(100dvh-8rem))] sm:w-[380px] sm:rounded-3xl ${hoog ? 'sm:bottom-[9.6rem]' : 'sm:bottom-24'}`}
    >
      <header className="flex items-center gap-3 border-b border-sand-200 bg-gradient-to-br from-gold-100/70 via-sand-50 to-paper px-4 py-3.5">
        <LogoMark className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <h2 id="hulp-titel" className="font-display text-[1.25rem] leading-none font-semibold">
            Maatklaar-hulp
          </h2>
          <p className="mt-1 text-[0.75rem] text-ink-muted">{ai ? 'Offline hulp · AI-antwoord mogelijk' : 'Werkt offline · gratis'}</p>
        </div>
        {berichten.length > 0 && (
          <button type="button" onClick={() => setBerichten([])} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand-100 hover:text-ink" aria-label="Gesprek wissen" title="Gesprek wissen">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand-100 hover:text-ink" aria-label="Hulp sluiten">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div ref={lijst} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite" aria-relevant="additions">
        <Ballon van="hulp">
          <p>Hoi! 👋 Ik ben Maatklaar-hulp. Vraag me alles over de app, of kies een onderwerp.</p>
        </Ballon>
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Voorgestelde vragen">
          {CHIPS.map(([label, vraag]) => (
            <button key={label} type="button" role="listitem" onClick={() => stel(vraag)} className="rounded-full bg-sand-100 px-3 py-1.5 text-[0.8rem] font-medium text-ink-soft ring-1 ring-sand-300 transition hover:bg-gold-100 hover:ring-gold-300">
              {label}
            </button>
          ))}
        </div>
        {berichten.length === 0 && tips.length > 0 && (
          <div className="rounded-2xl border border-gold-200 bg-gold-100/40 p-3">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-700">Tips voor dit scherm</p>
            <ul className="mt-1.5 space-y-1">
              {tips.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => toonItem(t)} className="text-left text-[0.84rem] text-ink-soft underline decoration-gold-300 underline-offset-2 hover:text-ink">
                    {t.vraag}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {berichten.map((b, i) => (
          <Ballon key={i} van={b.van}>
            {b.ai && (
              <p className="mb-1 inline-flex items-center gap-1 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-gold-700">
                <Sparkles className="h-3 w-3" /> AI-antwoord · controleer zelf
              </p>
            )}
            <p className="whitespace-pre-line">{b.tekst}</p>
            {b.links && b.links.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {b.links.map((l) => (
                  <button key={l.pad + l.label} type="button" onClick={() => volg(l)} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[0.78rem] font-medium text-paper hover:bg-ink-soft">
                    {l.label} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}
            {b.opties && b.opties.length > 0 && (
              <div className="mt-2.5 space-y-1">
                {b.opties.map(kennisVan).filter(Boolean).map((o) => (
                  <button key={o!.id} type="button" onClick={() => toonItem(o!)} className="block text-left text-[0.82rem] text-ink-soft underline decoration-gold-300 underline-offset-2 hover:text-ink">
                    {o!.vraag}
                  </button>
                ))}
              </div>
            )}
            {b.van === 'hulp' && b.vraag && ai && !b.ai && (
              <button type="button" disabled={bezig} onClick={() => metAi(b.vraag!)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-[0.78rem] font-medium text-gold-700 ring-1 ring-gold-300 hover:bg-gold-200 disabled:opacity-50">
                <Sparkles className="h-3.5 w-3.5" /> Slimmer antwoord met AI
              </button>
            )}
            {b.contact && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <a href={whatsappLink(contactTekst(b.vraag))} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-full bg-[#E6EFE2] px-3 py-1.5 text-[0.78rem] font-medium text-[#2F5A33] ring-1 ring-[#CADBC4]">
                  <MessageCircle className="h-3.5 w-3.5" /> Vraag het Maatklaar-team via WhatsApp
                </a>
                <a href={CONTACT_MAIL ? `mailto:${CONTACT_MAIL}?subject=${encodeURIComponent('Vraag over Maatklaar')}&body=${encodeURIComponent(contactTekst(b.vraag))}` : mailtoLink(contactTekst(b.vraag))} className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-3 py-1.5 text-[0.78rem] font-medium text-ink-soft ring-1 ring-sand-300">
                  <Mail className="h-3.5 w-3.5" /> Mail
                </a>
              </div>
            )}
          </Ballon>
        ))}
        {bezig && (
          <Ballon van="hulp">
            <p className="text-ink-muted">AI denkt na…</p>
          </Ballon>
        )}
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          stel(invoer)
        }}
        className="flex items-center gap-2 border-t border-sand-200 bg-sand-50 px-3 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <label htmlFor="hulp-vraag" className="sr-only">
          Stel je vraag
        </label>
        <input
          ref={veld}
          id="hulp-vraag"
          value={invoer}
          onChange={(e) => setInvoer(e.target.value)}
          placeholder="Stel je vraag…"
          autoComplete="off"
          enterKeyHint="send"
          className="h-11 min-w-0 flex-1 rounded-xl border border-sand-300 bg-paper px-3.5 text-[0.95rem] outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
        />
        <button type="submit" disabled={!invoer.trim()} aria-label="Versturen" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-paper disabled:opacity-40">
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
      {!ai && (
        <p className="border-t border-sand-200 bg-sand-50 px-4 pb-2.5 text-[0.75rem] leading-snug text-ink-muted max-sm:hidden">
          Slimmere antwoorden? Zet een eigen AI-sleutel bij{' '}
          <button type="button" className="underline" onClick={() => volg({ label: '', pad: '/instellingen/ai' })}>
            Instellingen → AI
          </button>{' '}
          (optioneel, sleutel blijft op dit apparaat).
        </p>
      )}
    </div>
  )
}

function Ballon({ van, children }: { van: 'ik' | 'hulp'; children: React.ReactNode }) {
  return (
    <div className={`flex ${van === 'ik' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[0.88rem] leading-relaxed ${van === 'ik' ? 'rounded-br-md bg-ink text-paper' : 'rounded-bl-md bg-sand-100 text-ink-soft ring-1 ring-sand-200'}`}>{children}</div>
    </div>
  )
}
