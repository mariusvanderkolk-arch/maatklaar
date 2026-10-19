import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Plus, RotateCcw, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardHeader } from './ui'
import { toast } from './Toast'
import { actieveAi, AiFout, analyseer, ELEMENTEN, MAAT_LABELS, zekerheidLabel, type MaatVeld } from '../lib/ai'
import { fotoVoorAi, useAi } from '../lib/aiStore'
import { useFotoUrl } from '../lib/photos'
import { ruimte, ruimteLabel, scopeItems } from '../lib/ruimtes'
import { projectStore } from '../lib/store'
import { getal, kortDatum } from '../lib/format'
import type { PhotoRef, Project } from '../lib/types'

const MAX_FOTOS = 4

function Zekerheid({ z }: { z: number }) {
  const l = zekerheidLabel(z)
  const kleur = l === 'hoog' ? 'bg-sage' : l === 'middel' ? 'bg-gold-500' : 'bg-rust/70'
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-ink-muted" title={`Zekerheid volgens het model: ${Math.round(z * 100)}%`}>
      <span className={`h-2 w-2 rounded-full ${kleur}`} aria-hidden="true" />
      zekerheid {l}
    </span>
  )
}

export default function AiAnalyse({ p }: { p: Project }) {
  const inst = useAi()
  const ai = actieveAi(inst)
  const [gekozen, setGekozen] = useState<string[]>(() => p.fotos.slice(-MAX_FOTOS).map((f) => f.id))
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<AiFout | null>(null)
  const stop = useRef<AbortController | null>(null)

  // nieuwe foto's automatisch meekiezen zolang er plek is; verwijderde foto's eruit
  const fotoIds = p.fotos.map((f) => f.id).join(',')
  useEffect(() => {
    setGekozen((g) => {
      const bestaand = g.filter((id) => p.fotos.some((f) => f.id === id))
      const nieuw = p.fotos.map((f) => f.id).filter((id) => !bestaand.includes(id))
      return [...bestaand, ...nieuw].slice(-MAX_FOTOS)
    })
  }, [fotoIds]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stop.current?.abort(), [])

  const wissel = (id: string) =>
    setGekozen((g) => (g.includes(id) ? g.filter((x) => x !== id) : g.length >= MAX_FOTOS ? g : [...g, id]))

  async function start() {
    if (!ai) return
    setBezig(true)
    setFout(null)
    const ctrl = new AbortController()
    stop.current = ctrl
    const timer = setTimeout(() => ctrl.abort(), 90_000)
    try {
      const beelden = (await Promise.all(gekozen.map((id) => fotoVoorAi(id).catch(() => null)))).filter((b) => b != null)
      const analyse = await analyseer(ai, beelden, p.type, fetch, ctrl.signal)
      const ok = projectStore.werkBij(p.id, (x) => ({
        ...x,
        aiAnalyse: { datum: Date.now(), provider: ai.provider.naam, model: ai.model, fotoIds: gekozen, analyse, overgenomen: [] },
      }))
      if (ok === false) toast('Resultaat getoond, maar opslaan lukte niet: opslag vol.', 'fout')
    } catch (e) {
      setFout(e instanceof AiFout ? e : new AiFout('dienst', 'Er ging iets mis bij de analyse. Probeer het opnieuw.'))
    } finally {
      clearTimeout(timer)
      setBezig(false)
    }
  }

  return (
    <Card>
      <CardHeader
        icon={<Sparkles className="h-5 w-5" />}
        title="AI-analyse van foto's"
        sub="Herkent sanitair, tegels, ramen en deuren, stelt werkzaamheden voor en schat de maten. Jij beslist wat je overneemt."
        action={<Badge tone="gold">Optioneel</Badge>}
      />
      <div className="p-5 sm:p-6">
        {!ai ? (
          <div className="rounded-xl bg-sand-50 p-4 ring-1 ring-sand-200">
            <p className="text-sm font-semibold text-ink">Nog niet ingesteld</p>
            <p className="mt-1 text-[0.83rem] leading-relaxed text-ink-soft">
              Hiervoor is een eigen API-sleutel van een AI-dienst nodig. Gratis te proberen met Google Gemini (met dagelijkse limieten), of betaald per gebruik bij OpenAI of
              xAI (enkele centen per foto). Zonder sleutel werkt de rest van de app gewoon.
            </p>
            <a
              href="#/instellingen/ai"
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-sand-50 hover:bg-[#3a332b] focus-visible:ring-4 focus-visible:ring-gold-300 focus-visible:outline-none"
            >
              <Sparkles className="h-4 w-4" /> AI activeren
            </a>
          </div>
        ) : p.fotos.length === 0 ? (
          <p className="rounded-xl bg-sand-50 px-4 py-3.5 text-[0.85rem] text-ink-soft ring-1 ring-sand-200">
            Maak of upload eerst een paar foto's hierboven (elke wand en de vloer). Daarna kun je ze hier laten analyseren.
          </p>
        ) : (
          <>
            <p className="text-[0.8rem] font-medium text-ink-soft">
              Kies max. {MAX_FOTOS} foto's <span className="font-normal text-ink-muted">({gekozen.length} gekozen)</span>
            </p>
            <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {p.fotos.map((f) => (
                <li key={f.id}>
                  <KiesFoto foto={f} gekozen={gekozen.includes(f.id)} onClick={() => wissel(f.id)} uit={!gekozen.includes(f.id) && gekozen.length >= MAX_FOTOS} />
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="gold"
                onClick={start}
                disabled={bezig || gekozen.length === 0}
                icon={bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              >
                {bezig ? 'Bezig met analyseren…' : `Analyseer ${gekozen.length} foto${gekozen.length === 1 ? '' : "'s"}`}
              </Button>
              {bezig ? (
                <Button variant="ghost" size="sm" onClick={() => stop.current?.abort()}>
                  Stoppen
                </Button>
              ) : (
                <p className="text-[0.75rem] leading-snug text-ink-muted">
                  Foto's gaan rechtstreeks naar {ai.provider.naam} ({ai.model}). <a href="#/instellingen/ai" className="underline underline-offset-2 hover:text-ink">Wijzigen</a>
                </p>
              )}
            </div>
            <div aria-live="polite">
              {bezig && <p className="mt-3 text-[0.8rem] text-ink-muted">Dit duurt meestal 5–30 seconden.</p>}
              {fout && (
                <div className="mt-4 flex gap-3 rounded-xl border border-rust/25 bg-rust/5 px-4 py-3 text-[0.83rem] text-ink-soft" role="alert">
                  <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rust" />
                  <div>
                    <p>{fout.message}</p>
                    {fout.soort === 'sleutel' || fout.soort === 'model' ? (
                      <a href="#/instellingen/ai" className="mt-1 inline-block font-medium text-ink underline underline-offset-2">
                        Naar AI-instellingen
                      </a>
                    ) : (
                      <button type="button" onClick={start} className="mt-1 inline-flex items-center gap-1 font-medium text-ink underline underline-offset-2">
                        <RotateCcw className="h-3.5 w-3.5" /> Opnieuw proberen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        {p.aiAnalyse && <Resultaat p={p} />}
      </div>
    </Card>
  )
}

function KiesFoto({ foto, gekozen, onClick, uit }: { foto: PhotoRef; gekozen: boolean; onClick: () => void; uit: boolean }) {
  const url = useFotoUrl(foto.id)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={gekozen}
      aria-label={`${foto.naam} ${gekozen ? '(gekozen)' : ''}`}
      disabled={uit}
      className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-sand-200 transition disabled:opacity-40 ${gekozen ? 'ring-[3px] ring-gold-500' : 'ring-1 ring-sand-300 hover:ring-gold-400'}`}
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {gekozen && (
        <span className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-gold-500 text-white shadow">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

function Resultaat({ p }: { p: Project }) {
  const r = p.aiAnalyse!
  const a = r.analyse
  const gedaan = (k: string) => r.overgenomen.includes(k)
  const markeer = (k: string, f: (x: Project) => Project = (x) => x) =>
    projectStore.werkBij(p.id, (x) => {
      const y = f(x)
      return y.aiAnalyse ? { ...y, aiAnalyse: { ...y.aiAnalyse, overgenomen: [...y.aiAnalyse.overgenomen, k] } } : y
    })
  const werkLabels = Object.fromEntries(scopeItems(p.type).map((s) => [s.key, s.label]))
  const past = new Set(ruimte(p.type).werk)
  const maten = (Object.keys(MAAT_LABELS) as MaatVeld[]).filter((k) => a.afmetingen[k] && (k !== 'tegelhoogte' || p.type === 'badkamer' || p.type === 'toilet'))
  const nogToevoegen = a.werkzaamheden.filter((w) => past.has(w.key) && !p.scope[w.key])

  const neemMaat = (k: MaatVeld, v: number) =>
    markeer(`maat:${k}`, (x) => {
      const af = { ...x.afmetingen, [k]: v }
      if (k === 'hoogte') af.tegelhoogte = Math.abs(x.afmetingen.tegelhoogte - x.afmetingen.hoogte) < 0.005 ? v : Math.min(x.afmetingen.tegelhoogte, v)
      if (k === 'tegelhoogte') af.tegelhoogte = Math.min(v, x.afmetingen.hoogte)
      return { ...x, afmetingen: af }
    })

  return (
    <div className="mt-6 border-t border-sand-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          Resultaat <span className="font-normal text-ink-muted">· {kortDatum(r.datum)} · {r.provider}</span>
        </p>
        <Button
          size="sm"
          variant="ghost"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={() => projectStore.werkBij(p.id, (x) => ({ ...x, aiAnalyse: undefined }))}
        >
          Wissen
        </Button>
      </div>

      {a.ruimte && a.ruimte !== p.type && (
        <p className="mt-3 rounded-xl bg-gold-100/60 px-4 py-2.5 text-[0.82rem] text-ink-soft ring-1 ring-gold-200">
          De AI denkt dat dit een <strong>{ruimteLabel(a.ruimte).toLowerCase()}</strong> is; dit project staat op {ruimteLabel(p.type).toLowerCase()}.
        </p>
      )}

      {a.elementen.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[0.75rem] font-semibold tracking-[0.14em] text-ink-muted uppercase">Herkend</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {a.elementen.map((e) => (
              <li key={e.type} className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-sand-300" title={e.toelichting || undefined}>
                <p className="text-[0.84rem] font-medium text-ink">
                  {e.aantal > 1 ? `${e.aantal}× ` : ''}
                  {ELEMENTEN[e.type]}
                </p>
                <Zekerheid z={e.zekerheid} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.werkzaamheden.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[0.75rem] font-semibold tracking-[0.14em] text-ink-muted uppercase">Voorgestelde werkzaamheden</h3>
            {nogToevoegen.length > 1 && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  projectStore.werkBij(p.id, (x) => ({ ...x, scope: { ...x.scope, ...Object.fromEntries(nogToevoegen.map((w) => [w.key, true])) } }))
                  toast(`${nogToevoegen.length} werkzaamheden toegevoegd`)
                }}
              >
                Alles toevoegen
              </Button>
            )}
          </div>
          <ul className="mt-2 divide-y divide-sand-200 rounded-xl bg-white/70 ring-1 ring-sand-200">
            {a.werkzaamheden.map((w) => {
              const actief = p.scope[w.key]
              const ok = past.has(w.key)
              return (
                <li key={w.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.88rem] font-medium text-ink">{werkLabels[w.key] ?? w.key}</p>
                    {w.reden && <p className="text-[0.78rem] leading-snug text-ink-muted">{w.reden}</p>}
                    <Zekerheid z={w.zekerheid} />
                  </div>
                  {actief ? (
                    <Badge tone="sage">
                      <Check className="h-3 w-3" /> In project
                    </Badge>
                  ) : ok ? (
                    <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => markeer(`werk:${w.key}`, (x) => ({ ...x, scope: { ...x.scope, [w.key]: true } }))}>
                      Toevoegen
                    </Button>
                  ) : (
                    <span className="text-right text-[0.75rem] text-ink-muted">Niet bij {ruimteLabel(p.type).toLowerCase()}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {maten.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[0.75rem] font-semibold tracking-[0.14em] text-ink-muted uppercase">Geschatte maten</h3>
          <ul className="mt-2 divide-y divide-sand-200 rounded-xl bg-white/70 ring-1 ring-sand-200">
            {maten.map((k) => {
              const m = a.afmetingen[k]!
              const huidig = p.afmetingen[k]
              const gelijk = Math.abs(huidig - m.waarde) < 0.005
              return (
                <li key={k} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.88rem] text-ink">
                      <span className="font-medium">{MAAT_LABELS[k]}</span>: <span className="tabnum font-semibold">{getal(m.waarde)} m</span>
                      <span className="text-ink-muted"> · nu {getal(huidig)} m</span>
                    </p>
                    {m.toelichting && <p className="text-[0.78rem] leading-snug text-ink-muted">{m.toelichting}</p>}
                    <Zekerheid z={m.zekerheid} />
                  </div>
                  {gelijk ? (
                    <Badge tone="sage">
                      <Check className="h-3 w-3" /> {gedaan(`maat:${k}`) ? 'Overgenomen' : 'Gelijk'}
                    </Badge>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => neemMaat(k, m.waarde)}>
                      Overnemen
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {a.opmerkingen.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[0.75rem] font-semibold tracking-[0.14em] text-ink-muted uppercase">Let op</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.84rem] text-ink-soft">
            {a.opmerkingen.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {a.elementen.length === 0 && a.werkzaamheden.length === 0 && maten.length === 0 && (
        <p className="mt-3 text-[0.85rem] text-ink-muted">De AI kon op deze foto's niets bruikbaars herkennen. Probeer foto's met meer overzicht.</p>
      )}

      <p className="mt-4 text-[0.75rem] leading-snug text-ink-muted">
        AI kan zich vergissen, vooral bij maten. Controleer altijd met een meetlint voordat je bestelt.
      </p>
    </div>
  )
}

