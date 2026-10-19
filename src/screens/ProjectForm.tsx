import { toast } from '../components/Toast'
import { InsprekenKnop } from '../components/Inspreken'
import { pasInspraakToe, type Inspraak } from '../lib/inspraak'
import type { Afmetingen } from '../lib/types'
import { AFVAL_SOORTEN, CONTAINER_MATEN, MAX_ZWAAR_M3 } from '../lib/calc'
import type { AfvalSoort, ContainerKeuze, ContainerMaat } from '../lib/types'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Trash2 } from 'lucide-react'
import { Button, Card, CardHeader, PageTitle, TextField } from '../components/ui'
import { SCOPE_ICONS } from '../components/scopeIcons'
import { RUIMTE_ICONS } from '../components/ruimteIcons'
import { track } from '../lib/analytics'
import { nieuwProject, standaardAfmetingen } from '../lib/defaults'
import { RUIMTES, ruimte, scopeItems, scopePerFase, scopeVoor } from '../lib/ruimtes'
import { ga } from '../lib/router'
import { projectStore, useProject } from '../lib/store'
import { useProjectToegang } from '../lib/billing/store'
import { Betaalmuur } from '../components/Betaalmuur'
import type { ProjectType, Scope, ScopeKey } from '../lib/types'

export function ProjectForm({ id }: { id?: string }) {
  const bestaand = useProject(id)
  const [concept] = useState(() => bestaand ?? nieuwProject())
  const [naam, setNaam] = useState(concept.naam)
  const [klant, setKlant] = useState(concept.klant)
  const [adres, setAdres] = useState(concept.adres)
  const [scope, setScope] = useState<Scope>(concept.scope)
  const [type, setType] = useState<ProjectType>(concept.type)
  const [container, setContainer] = useState<ContainerKeuze>(concept.container ?? {})
  const [inspraak, setInspraak] = useState<Inspraak | null>(null)
  const maten = (a: Afmetingen): Afmetingen => (inspraak ? pasInspraakToe({ ...concept, afmetingen: a }, { ...inspraak, type: undefined, aan: [], uit: [] }).afmetingen : a)
  const toepassen = (r: Inspraak) => {
    const n = pasInspraakToe({ ...concept, type, scope, container, klant }, r)
    setType(n.type)
    setScope(n.scope)
    setContainer(n.container ?? {})
    if (n.klant && !klant) setKlant(n.klant)
    setInspraak(r)
    toast('Overgenomen uit je inspraak — controleer en sla op')
  }

  const toegang = useProjectToegang()
  if (id && !bestaand) return <NietGevonden />
  // Alleen bij een NIEUW project en alleen als betalen aan staat; bestaande projecten blijven altijd bewerkbaar.
  if (!id && !toegang.mag) return <Betaalmuur aantal={toegang.aantal} />

  const items = scopeItems(type)
  const wissel = (k: ScopeKey) => setScope((s) => ({ ...s, [k]: !s[k] }))
  const aantal = items.filter((i) => scope[i.key]).length
  const alles = aantal === items.length
  const kiesType = (t: ProjectType) => {
    if (t === type) return
    setType(t)
    setScope(scopeVoor(t))
  }

  const opslaan = () => {
    const velden = { naam: naam.trim() || `Nieuwe ${ruimte(type).label.toLowerCase()}`, klant: klant.trim(), adres: adres.trim(), scope, type, container }
    if (bestaand) {
      const anderType = bestaand.type !== type
      projectStore.werkBij(bestaand.id, (p) => ({
        ...p,
        ...velden,
        // bij een ander ruimtetype: typische maten (spatwand, tegelhoogte) van het nieuwe type, lengte/breedte blijven
        afmetingen: maten(anderType ? { ...standaardAfmetingen(type), lengte: p.afmetingen.lengte, breedte: p.afmetingen.breedte, openingen: p.afmetingen.openingen } : p.afmetingen),
        snijverlies: anderType ? ruimte(type).snijverlies : p.snijverlies,
      }))
      ga(`/project/${bestaand.id}/opmeten`)
    } else {
      const basis = nieuwProject({ type })
      const p = { ...concept, ...velden, afmetingen: maten(basis.afmetingen), snijverlies: basis.snijverlies, createdAt: Date.now(), updatedAt: Date.now() }
      projectStore.voegToe(p)
      track('project_created')
      ga(`/project/${p.id}/opmeten`)
    }
  }

  const verwijder = () => {
    if (bestaand && confirm(`Project “${bestaand.naam}” verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      projectStore.verwijder(bestaand.id)
      ga('/')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-32 sm:px-6 sm:pt-10">
      <button
        type="button"
        onClick={() => (bestaand ? ga(`/project/${bestaand.id}/opmeten`) : ga('/'))}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {bestaand ? 'Terug naar project' : 'Projecten'}
      </button>
      <PageTitle
        eyebrow={bestaand ? 'Project bewerken' : 'Stap 1 · Nieuw project'}
        title={bestaand ? 'Project & werkzaamheden' : 'Wat gaan we verbouwen?'}
        sub="Leg de basisgegevens vast en kies welke werkzaamheden in de klus zitten. Dit bepaalt welke materialen worden berekend."
      />

      <div className="mt-8 space-y-5">
        <Card>
          <CardHeader title="Projectgegevens" sub="Wordt gebruikt op de inkooplijst en de offerte." action={<InsprekenKnop type={type} onToepassen={toepassen} />} />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <TextField label="Projectnaam" value={naam} onChange={setNaam} placeholder="Bijv. Badkamer Jansen" autoFocus={!bestaand} />
            </div>
            <TextField label="Klant" value={klant} onChange={setKlant} placeholder="Naam opdrachtgever" />
            <TextField label="Adres (optioneel)" value={adres} onChange={setAdres} placeholder="Straat en plaats" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Type ruimte" sub="Bepaalt de checklist, de rekenregels en de standaardmaten." />
          <div role="radiogroup" aria-label="Type ruimte" className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4 sm:gap-3 sm:p-6">
            {RUIMTES.map((r) => {
              const actief = r.id === type
              const Icon = RUIMTE_ICONS[r.id]
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={actief}
                  onClick={() => kiesType(r.id)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl px-2.5 pt-4 pb-3.5 text-center ring-inset transition ${
                    actief ? 'bg-gold-100/70 ring-2 ring-gold-400' : 'bg-white/60 ring-1 ring-sand-300 hover:ring-gold-300'
                  }`}
                >
                  <span className={`grid h-11 w-11 place-items-center rounded-full ${actief ? 'bg-paper text-gold-700 ring-1 ring-gold-200' : 'bg-sand-100 text-ink-muted'}`}>
                    <Icon className="h-5.5 w-5.5" />
                  </span>
                  <span className="text-sm font-semibold text-ink">{r.label}</span>
                  <span className="text-[0.75rem] leading-snug text-ink-muted">{r.omschrijving}</span>
                  {actief && (
                    <span className="absolute top-2 right-2 grid h-5 w-5 place-items-center rounded-full bg-gold-500 text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {bestaand && bestaand.type !== type && (
            <p className="-mt-1 px-5 pb-5 text-[0.8rem] text-ink-muted sm:px-6">
              Bij opslaan krijgt het project de checklist en standaardmaten van een {ruimte(type).label.toLowerCase()}. Lengte, breedte en openingen blijven staan.
            </p>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Werkzaamheden"
            sub={`${aantal} van ${items.length} geselecteerd`}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScope((s) => ({ ...s, ...Object.fromEntries(items.map((i) => [i.key, !alles])) }))}
              >
                {alles ? 'Niets' : 'Alles'}
              </Button>
            }
          />
          <div className="space-y-4 p-4 sm:p-6">
            {scopePerFase(type).map((g) => (
            <div key={g.fase}>
            <p className="text-[0.75rem] font-semibold tracking-[0.14em] text-gold-700 uppercase">{g.naam}</p>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {g.items.map((item) => {
              const aan = scope[item.key]
              const Icon = SCOPE_ICONS[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  role="checkbox"
                  aria-checked={aan}
                  onClick={() => wissel(item.key)}
                  className={`flex w-full min-w-0 items-center gap-3.5 rounded-xl px-3.5 py-3 text-left ring-1 ring-inset transition ${
                    aan ? 'bg-gold-100/60 ring-gold-300' : 'bg-white/60 ring-sand-300 hover:ring-sand-400'
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg transition ${
                      aan ? 'bg-paper text-gold-700 ring-1 ring-gold-200' : 'bg-sand-100 text-ink-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[0.92rem] font-semibold text-ink">
                      {item.label}
                      {item.optioneel && <span className="text-[0.75rem] font-medium text-ink-muted">optioneel</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">{item.omschrijving}</span>
                  </span>
                  <span
                    className={`grid h-5.5 w-5.5 shrink-0 place-items-center rounded-md border transition ${
                      aan ? 'border-gold-500 bg-gold-500 text-white' : 'border-sand-400 bg-white'
                    }`}
                  >
                    {aan && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
            </div>
            {g.fase === 'sloop' && scope.container && g.items.some((i) => i.key === 'container') && (
              <div className="mt-2.5 grid gap-2.5 rounded-xl bg-sand-50 p-3.5 ring-1 ring-sand-200 sm:grid-cols-2" data-testid="container-keuze">
                <label className="block">
                  <span className="mb-1 block text-[0.78rem] font-medium text-ink-soft">Containermaat</span>
                  <select
                    className="h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3 text-[0.9rem] focus:border-gold-400 focus:outline-none"
                    value={container.maat ?? ''}
                    onChange={(e) => setContainer((c) => ({ ...c, maat: e.target.value ? (Number(e.target.value) as ContainerMaat) : undefined }))}
                  >
                    <option value="">Automatisch (op afvalvolume)</option>
                    {CONTAINER_MATEN.map((m) => (
                      <option key={m} value={m} disabled={AFVAL_SOORTEN[container.soort ?? 'gemengd'].zwaar && m > MAX_ZWAAR_M3}>
                        {m} m³
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.78rem] font-medium text-ink-soft">Soort afval</span>
                  <select
                    className="h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3 text-[0.9rem] focus:border-gold-400 focus:outline-none"
                    value={container.soort ?? 'gemengd'}
                    onChange={(e) => setContainer((c) => ({ ...c, soort: e.target.value as AfvalSoort }))}
                  >
                    {(Object.keys(AFVAL_SOORTEN) as AfvalSoort[]).map((k) => (
                      <option key={k} value={k}>
                        {AFVAL_SOORTEN[k].naam}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-[0.75rem] leading-snug text-ink-muted sm:col-span-2">
                  Huur en stortkosten staan als aparte regels in de inkooplijst. Puin en grond zijn zwaar: maximaal {MAX_ZWAAR_M3} m³ per container. Staat “Huur container” uit, dan rekent de app met big bags.
                </p>
              </div>
            )}
            </div>
            ))}
          </div>
        </Card>

        {bestaand && (
          <div className="flex justify-center pt-2">
            <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={verwijder}>
              Project verwijderen
            </Button>
          </div>
        )}
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-sand-300/70 bg-sand-100/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <p className="hidden text-sm text-ink-muted sm:block">
            {aantal} werkzaamheden · <span className="text-ink">{naam.trim() || 'Nog geen naam'}</span>
          </p>
          <Button size="lg" className="w-full sm:w-auto" onClick={opslaan} icon={bestaand ? <Check className="h-4.5 w-4.5" /> : undefined}>
            {bestaand ? 'Opslaan' : 'Project aanmaken'}
            {!bestaand && <ArrowRight className="h-4.5 w-4.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NietGevonden() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Project niet gevonden</h1>
      <p className="mt-2 text-sm text-ink-muted">Dit project bestaat niet (meer) op dit apparaat.</p>
      <Button className="mt-6" onClick={() => ga('/')}>
        Naar projecten
      </Button>
    </div>
  )
}
