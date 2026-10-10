import { useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, Clock, Hourglass, Minus, Plus, Receipt, RotateCcw, Trash2, Gauge, TrendingUp, Wallet, ListChecks } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DateField, NumberField, SelectField, Switch, TextField, LeegStaat } from '../components/ui'
import { ga } from '../lib/router'
import { toast } from '../components/Toast'
import { uid } from '../lib/defaults'
import { euro, formatDatum, getal, isoDatum } from '../lib/format'
import { maakBudget, maakDagplanning, planTaken, plusDagen, standaardPlanning, vandaag, type BudgetRegel } from '../lib/planning'
import { projectStore } from '../lib/store'
import { useBerekening } from '../lib/useCalc'
import type { KostSoort, Planning, Project } from '../lib/types'

const dagLabel = (iso: string, opties: Intl.DateTimeFormatOptions) => formatDatum({ ...opties, timeZone: 'UTC' }, isoDatum(iso))
const KOST_SOORTEN: { value: KostSoort; label: string }[] = [
  { value: 'materiaal', label: 'Materiaal (bon)' },
  { value: 'meerwerk', label: 'Meerwerk' },
  { value: 'overig', label: 'Overig' },
]
const dagenTekst = (d: number) => (d === 0.5 ? '½ dag' : `${getal(d, 1)} ${d === 1 ? 'dag' : 'dagen'}`)

export function PlanningScherm({ p }: { p: Project }) {
  const { inkoop, arbeid } = useBerekening(p)
  const pl = p.planning ?? standaardPlanning()
  const upd = (f: (x: Planning) => Planning) => projectStore.werkBij(p.id, (x) => ({ ...x, planning: f(x.planning ?? standaardPlanning()) }))
  const taken = useMemo(() => planTaken(arbeid, pl), [arbeid, pl])
  const start = pl.start ?? vandaag()
  const dagen = useMemo(() => maakDagplanning(taken, start, pl.weekend), [taken, start, pl.weekend])
  const budget = maakBudget({ materialen: inkoop.totaal, arbeid, uurtarief: p.uurtarief }, pl)
  const werkdagen = taken.reduce((s, t) => s + t.dagen, 0)
  const eind = dagen[dagen.length - 1]?.datum

  return (
    <div className="space-y-5">
      <BudgetKaart budget={budget} uurtarief={p.uurtarief} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={<CalendarDays className="h-5 w-5" />}
              title="Planning"
              sub="Werkdagen per taak, geschat uit de arbeidsnormen van de offerte. Pas aan waar nodig; de offerte verandert daar niet door."
            />
            <div className="grid grid-cols-2 gap-4 border-b border-sand-200 p-5 sm:grid-cols-3 sm:p-6">
              <div className="col-span-2 sm:col-span-1">
                <DateField label="Startdatum" value={start} onChange={(v) => v && upd((x) => ({ ...x, start: v }))} />
              </div>
              <NumberField label="Uren per werkdag" unit="u" decimals={1} value={pl.dagUren} onChange={(v) => upd((x) => ({ ...x, dagUren: Math.min(Math.max(v, 1), 14) }))} />
              <div className="min-w-0">
                <p className="mb-1.5 truncate text-[0.8rem] font-medium text-ink-soft">Weekend</p>
                <label className="flex h-12 items-center gap-3 text-sm text-ink-soft">
                  <Switch checked={pl.weekend} onChange={(v) => upd((x) => ({ ...x, weekend: v }))} label="Ook in het weekend werken" />
                  {pl.weekend ? 'Ook za/zo' : 'Alleen ma–vr'}
                </label>
              </div>
            </div>
            {taken.length === 0 ? (
              <LeegStaat
                icon={<CalendarDays className="h-5 w-5" />}
                titel="Nog geen taken om te plannen"
                tekst="De planning maakt automatisch taken van de gekozen werkzaamheden, met uren en droogtijden."
                actie={
                  <Button variant="secondary" icon={<ListChecks className="h-4 w-4" />} onClick={() => ga(`/project/${p.id}/bewerken`)}>
                  Werkzaamheden kiezen
                </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-sand-200">
                {taken.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3.5 sm:gap-4 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[0.92rem] font-medium text-ink">
                        {t.naam}
                        {t.aangepast && <Badge tone="gold">aangepast</Badge>}
                      </p>
                      <p className="tabnum mt-0.5 text-[0.76rem] text-ink-muted">
                        {getal(t.uren, 1)} uur → geschat {dagenTekst(t.geschat)}
                        {t.droog > 0 && ` · ${t.droog} ${t.droog === 1 ? 'dag' : 'dagen'} droogtijd`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      {t.aangepast && (
                        <button
                          type="button"
                          aria-label={`${t.naam}: terug naar schatting`}
                          title="Terug naar schatting"
                          onClick={() => upd((x) => { const d = { ...x.dagen }; delete d[t.id]; return { ...x, dagen: d } })}
                          className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-sand-100 hover:text-ink"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <Stepper
                        label={`Werkdagen ${t.naam}`}
                        waarde={t.dagen}
                        tekst={dagenTekst(t.dagen)}
                        onChange={(v) => upd((x) => ({ ...x, dagen: { ...x.dagen, [t.id]: v } }))}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-[inherit] border-t border-sand-200 bg-sand-50/80 px-5 py-3.5 text-sm sm:px-6">
              <span className="text-ink-muted">
                Totaal <span className="tabnum font-semibold text-ink">{dagenTekst(werkdagen)}</span> werk
              </span>
              {eind && (
                <span className="text-ink-muted">
                  Klaar op <span className="font-semibold text-ink">{dagLabel(eind, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </span>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={<Hourglass className="h-5 w-5" />} title="Dag voor dag" sub="Taken achter elkaar in halve dagen. Droogtijd loopt door in het weekend." />
            {dagen.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-ink-muted">Nog niets te plannen.</p>
            ) : (
              <ol className="divide-y divide-sand-200">
                {dagen.map((d, i) => {
                  const vorig = dagen[i - 1]?.datum
                  const gat = vorig && plusDagen(vorig, 1) !== d.datum
                  return (
                    <li key={d.datum} className={`flex gap-4 px-5 py-3 sm:px-6 ${gat ? 'border-t-2 border-t-sand-300' : ''}`}>
                      <div className="w-16 shrink-0">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold-700">{dagLabel(d.datum, { weekday: 'short' })}</p>
                        <p className="tabnum text-[0.95rem] font-semibold text-ink">{dagLabel(d.datum, { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-wrap content-center gap-1.5">
                        {d.items.map((it, j) =>
                          it.soort === 'droog' ? (
                            <span key={j} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-sand-400 px-2.5 py-1 text-[0.76rem] text-ink-muted">
                              <Hourglass className="h-3 w-3" /> Droogtijd · {it.naam.toLowerCase()}
                            </span>
                          ) : (
                            <span key={j} className="inline-flex items-center gap-1.5 rounded-full bg-gold-100/80 px-2.5 py-1 text-[0.78rem] font-medium text-ink ring-1 ring-inset ring-gold-200">
                              {it.naam}
                              <span className="font-normal text-ink-muted">{it.deel >= 1 ? 'hele dag' : '½ dag'}</span>
                            </span>
                          ),
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <UrenKaart p={p} pl={pl} upd={upd} taken={taken.map((t) => ({ value: t.id, label: t.naam }))} perTaak={budget.perTaak} overigeUren={budget.overigeUren} />
          <KostenKaart pl={pl} upd={upd} />
        </div>
      </div>
    </div>
  )
}

function Stepper({ label, waarde, tekst, onChange }: { label: string; waarde: number; tekst: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-xl bg-white/80 ring-1 ring-sand-300" role="group" aria-label={label}>
      <button type="button" aria-label="Halve dag minder" disabled={waarde <= 0} onClick={() => onChange(Math.max(0, waarde - 0.5))} className="grid h-9 w-9 place-items-center rounded-l-xl text-ink-soft hover:bg-sand-100 disabled:opacity-35">
        <Minus className="h-4 w-4" />
      </button>
      <span className="tabnum min-w-[4.2rem] text-center text-[0.84rem] font-semibold text-ink sm:min-w-[4.6rem] sm:text-sm" aria-live="polite">{tekst}</span>
      <button type="button" aria-label="Halve dag meer" onClick={() => onChange(waarde + 0.5)} className="grid h-9 w-9 place-items-center rounded-r-xl text-ink-soft hover:bg-sand-100">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

function BudgetKaart({ budget: b, uurtarief }: { budget: ReturnType<typeof maakBudget>; uurtarief: number }) {
  const leeg = b.uren.werkelijk === 0 && b.totaal.werkelijk === 0
  const over = b.verschil > 0.5
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand-200 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700 ring-1 ring-inset ring-gold-200">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-sans text-[0.98rem] font-semibold tracking-normal text-ink">Offerte vs. werkelijk</h2>
            <p className="mt-0.5 text-[0.82rem] text-ink-muted">Begroot volgens de offerte, werkelijk volgens je geregistreerde uren en bonnen.</p>
          </div>
        </div>
        {leeg ? (
          <Badge>Nog niets geregistreerd</Badge>
        ) : over ? (
          <Badge className="!bg-rust/10 !text-rust !ring-rust/25">
            <TrendingUp className="h-3.5 w-3.5" /> {euro(b.verschil)} boven offerte
          </Badge>
        ) : (
          <Badge tone="sage">
            <Gauge className="h-3.5 w-3.5" /> {b.totaal.begroot > 0 ? Math.round((b.totaal.werkelijk / b.totaal.begroot) * 100) : 0}% van offerte besteed
          </Badge>
        )}
      </div>
      <div className="grid gap-px bg-sand-200 sm:grid-cols-3">
        <BudgetTegel titel="Materialen" regel={b.materiaal} sub="bonnen bij Extra kosten" />
        <BudgetTegel titel="Arbeid" regel={b.arbeid} sub={`${getal(b.uren.werkelijk, 1)} van ${getal(b.uren.begroot, 1)} uur · ${euro(uurtarief)}/u`} />
        <BudgetTegel
          titel="Totaal"
          regel={b.totaal}
          nadruk
          sub={b.meerwerk + b.overig > 0 ? `incl. ${euro(b.meerwerk)} meerwerk${b.overig ? ` en ${euro(b.overig)} overig` : ''}` : 'materialen + arbeid + extra kosten'}
        />
      </div>
    </Card>
  )
}

function BudgetTegel({ titel, regel, sub, nadruk }: { titel: string; regel: BudgetRegel; sub: ReactNode; nadruk?: boolean }) {
  const pct = regel.begroot > 0 ? regel.werkelijk / regel.begroot : regel.werkelijk > 0 ? 1.01 : 0
  const over = regel.werkelijk > regel.begroot + 0.5
  return (
    <div className={`px-5 py-4 sm:px-6 ${nadruk ? 'bg-sand-50' : 'bg-paper'}`}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{titel}</p>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <p className="tabnum font-display text-[1.75rem] leading-none font-semibold text-ink">{euro(regel.werkelijk)}</p>
        <p className="tabnum text-right text-[0.78rem] text-ink-muted">
          van <span className="font-medium text-ink-soft">{euro(regel.begroot)}</span>
        </p>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sand-200" role="progressbar" aria-label={`${titel}: werkelijk t.o.v. begroot`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(pct, 1) * 100)}>
        <div className={`h-full rounded-full ${over ? 'bg-rust' : 'bg-gradient-to-r from-gold-300 to-gold-500'}`} style={{ width: `${Math.min(pct, 1) * 100}%` }} />
      </div>
      <p className="mt-2 text-[0.76rem] text-ink-muted">{sub}</p>
    </div>
  )
}

function UrenKaart({
  pl,
  upd,
  taken,
  perTaak,
  overigeUren,
}: {
  p: Project
  pl: Planning
  upd: (f: (x: Planning) => Planning) => void
  taken: { value: string; label: string }[]
  perTaak: { taak: string; naam: string; begroot: number; werkelijk: number }[]
  overigeUren: number
}) {
  const [datum, setDatum] = useState(vandaag())
  const [taak, setTaak] = useState(taken[0]?.value ?? '')
  const [uren, setUren] = useState(8)
  const [oms, setOms] = useState('')
  const opties = [...taken, { value: '', label: 'Algemeen / overig' }]
  const logs = [...pl.logs].sort((a, b) => b.datum.localeCompare(a.datum))
  const naam = (id?: string) => opties.find((o) => o.value === (id ?? ''))?.label ?? 'Overig'
  return (
    <Card>
      <CardHeader icon={<Clock className="h-5 w-5" />} title="Uren registreren" sub="Leg per dag vast hoeveel uur je aan welke taak hebt gewerkt." />
      <form
        className="grid grid-cols-2 gap-3 border-b border-sand-200 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (uren <= 0) return toast('Vul het aantal uren in', 'fout')
          upd((x) => ({ ...x, logs: [...x.logs, { id: uid(), datum, taak: taak || undefined, uren, omschrijving: oms.trim() }] }))
          setOms('')
          toast(`${getal(uren, 1)} uur geregistreerd`)
        }}
      >
        <DateField compact label="Datum" value={datum} onChange={setDatum} />
        <NumberField compact label="Uren" unit="u" decimals={1} value={uren} onChange={setUren} />
        <div className="col-span-2">
          <SelectField compact label="Taak" value={taak} onChange={setTaak} options={opties} />
        </div>
        <div className="col-span-2">
          <TextField label="Omschrijving (optioneel)" value={oms} onChange={setOms} placeholder="Bijv. tegels wand links" />
        </div>
        <Button type="submit" className="col-span-2" icon={<Plus className="h-4 w-4" />}>
          Uren toevoegen
        </Button>
      </form>
      {perTaak.length > 0 && (
        <div className="border-b border-sand-200 px-5 py-4 sm:px-6">
          <p className="mb-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">Uren per taak · werkelijk / begroot</p>
          <ul className="space-y-2.5">
            {perTaak.map((t) => {
              const pct = t.begroot > 0 ? t.werkelijk / t.begroot : 0
              return (
                <li key={t.taak}>
                  <div className="flex items-baseline justify-between gap-3 text-[0.82rem]">
                    <span className="truncate text-ink-soft">{t.naam}</span>
                    <span className={`tabnum shrink-0 font-medium ${pct > 1 ? 'text-rust' : 'text-ink'}`}>
                      {getal(t.werkelijk, 1)} / {getal(t.begroot, 1)} u
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-sand-200">
                    <div className={`h-full rounded-full ${pct > 1 ? 'bg-rust' : 'bg-gold-400'}`} style={{ width: `${Math.min(pct, 1) * 100}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          {overigeUren > 0 && <p className="mt-2.5 text-[0.78rem] text-ink-muted">+ {getal(overigeUren, 1)} uur algemeen/overig</p>}
        </div>
      )}
      {logs.length === 0 ? (
        <p className="px-6 py-6 text-center text-[0.84rem] text-ink-muted">Nog geen uren geregistreerd.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-sand-200 overflow-y-auto">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
              <span className="tabnum w-14 shrink-0 text-[0.78rem] text-ink-muted">{dagLabel(l.datum, { day: 'numeric', month: 'short' })}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.86rem] font-medium text-ink">{naam(l.taak)}</span>
                {l.omschrijving && <span className="block truncate text-[0.76rem] text-ink-muted">{l.omschrijving}</span>}
              </span>
              <span className="tabnum shrink-0 text-sm font-semibold">{getal(l.uren, 1)} u</span>
              <button type="button" aria-label="Registratie verwijderen" onClick={() => upd((x) => ({ ...x, logs: x.logs.filter((y) => y.id !== l.id) }))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-rust/10 hover:text-rust">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function KostenKaart({ pl, upd }: { pl: Planning; upd: (f: (x: Planning) => Planning) => void }) {
  const [datum, setDatum] = useState(vandaag())
  const [soort, setSoort] = useState<KostSoort>('materiaal')
  const [oms, setOms] = useState('')
  const [bedrag, setBedrag] = useState(0)
  const kosten = [...pl.kosten].sort((a, b) => b.datum.localeCompare(a.datum))
  return (
    <Card>
      <CardHeader icon={<Receipt className="h-5 w-5" />} title="Extra kosten & bonnen" sub="Materiaalbonnen, meerwerk en overige kosten (incl. btw)." />
      <form
        className="grid grid-cols-2 gap-3 border-b border-sand-200 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (bedrag <= 0) return toast('Vul een bedrag in', 'fout')
          upd((x) => ({ ...x, kosten: [...x.kosten, { id: uid(), datum, soort, omschrijving: oms.trim() || KOST_SOORTEN.find((k) => k.value === soort)!.label, bedrag }] }))
          setOms('')
          setBedrag(0)
          toast(`${euro(bedrag)} toegevoegd`)
        }}
      >
        <DateField compact label="Datum" value={datum} onChange={setDatum} />
        <SelectField compact label="Soort" value={soort} onChange={setSoort} options={KOST_SOORTEN} />
        <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_8.5rem] gap-3">
          <TextField label="Omschrijving" value={oms} onChange={setOms} placeholder="Bijv. bon Gamma tegellijm" />
          <NumberField label="Bedrag" unit="€" value={bedrag} onChange={setBedrag} />
        </div>
        <Button type="submit" variant="secondary" className="col-span-2" icon={<Plus className="h-4 w-4" />}>
          Kosten toevoegen
        </Button>
      </form>
      {kosten.length === 0 ? (
        <p className="px-6 py-6 text-center text-[0.84rem] text-ink-muted">Nog geen kosten. Voeg je materiaalbonnen toe om te vergelijken met de offerte.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-sand-200 overflow-y-auto">
          {kosten.map((k) => (
            <li key={k.id} className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
              <span className="tabnum w-14 shrink-0 text-[0.78rem] text-ink-muted">{dagLabel(k.datum, { day: 'numeric', month: 'short' })}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.86rem] font-medium text-ink">{k.omschrijving}</span>
                <span className="block text-[0.74rem] text-ink-muted">{KOST_SOORTEN.find((s) => s.value === k.soort)?.label}</span>
              </span>
              <span className="tabnum shrink-0 text-sm font-semibold">{euro(k.bedrag)}</span>
              <button type="button" aria-label="Kosten verwijderen" onClick={() => upd((x) => ({ ...x, kosten: x.kosten.filter((y) => y.id !== k.id) }))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-rust/10 hover:text-rust">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
