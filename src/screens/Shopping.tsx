import { useState } from 'react'
import { ArrowRight, Copy, ExternalLink, RotateCcw, Share2, Truck, ListChecks, ShoppingCart } from 'lucide-react'
import { Badge, Button, Card, Checkbox, Notice, LeegStaat } from '../components/ui'
import { GROEP_ICONS } from '../components/groepIcons'
import { toast } from '../components/Toast'
import { datum, euro } from '../lib/format'
import { prijsEenheid } from '../lib/prices'
import { deelOfKopieer, inkoopTekst, kopieer } from '../lib/share'
import { projectStore } from '../lib/store'
import { useBerekening } from '../lib/useCalc'
import type { PrijsStatus } from '../lib/shopping'
import { VOORBEELD_PEILDATUM } from '../lib/prices'
import { ga } from '../lib/router'
import type { Project } from '../lib/types'

export function Shopping({ p }: { p: Project }) {
  const { inkoop } = useBerekening(p)
  const [toonLev, setToonLev] = useState(true)
  const afgevinkt = inkoop.regels.filter((r) => p.afgevinkt[r.sleutel]).length
  const levTotalen = Object.entries(
    inkoop.regels.reduce<Record<string, number>>((m, r) => ((m[r.leverancier || 'Zonder leverancier'] = (m[r.leverancier || 'Zonder leverancier'] ?? 0) + r.totaal), m), {}),
  ).sort((a, b) => b[1] - a[1])

  const wissel = (sleutel: string) =>
    projectStore.werkBij(p.id, (x) => ({ ...x, afgevinkt: { ...x.afgevinkt, [sleutel]: !x.afgevinkt[sleutel] } }))


  return (
    <div className="space-y-5">
      <PrijsMelding status={inkoop.prijsStatus} projectId={p.id} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="order-2 space-y-5 lg:order-1">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-sans text-[0.98rem] font-semibold tracking-normal">Inkooplijst</h2>
                <p className="text-[0.82rem] text-ink-muted">
                  {afgevinkt} van {inkoop.regels.length} artikelen afgevinkt
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Copy className="h-3.5 w-3.5" />}
                  onClick={async () => toast((await kopieer(inkoopTekst(p, inkoop))) === 'gekopieerd' ? 'Lijst gekopieerd' : 'Kopiëren mislukt')}
                >
                  Kopieer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Share2 className="h-3.5 w-3.5" />}
                  onClick={async () => {
                    const r = await deelOfKopieer(`Inkooplijst ${p.naam}`, inkoopTekst(p, inkoop))
                    if (r === 'gekopieerd') toast('Lijst gekopieerd')
                  }}
                >
                  Delen
                </Button>
              </div>
            </div>
            <div className="h-1 bg-sand-200">
              <div className="h-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all" style={{ width: `${inkoop.regels.length ? (afgevinkt / inkoop.regels.length) * 100 : 0}%` }} />
            </div>
            {inkoop.metLeverancier && (
              <label className="flex items-center justify-end gap-2 border-b border-sand-200 px-5 py-2.5 text-[0.8rem] text-ink-soft sm:px-6">
                <input type="checkbox" checked={toonLev} onChange={(e) => setToonLev(e.target.checked)} className="accent-gold-600" /> Leverancier tonen
              </label>
            )}

            {inkoop.regels.length === 0 ? (
              <LeegStaat
                icon={<ShoppingCart className="h-5 w-5" />}
                titel="De inkooplijst is nog leeg"
                tekst="Kies werkzaamheden en vul de maten in; daarna staat hier wat je moet kopen, met je eigen prijzen."
                actie={
                  <Button variant="secondary" icon={<ListChecks className="h-4 w-4" />} onClick={() => ga(`/project/${p.id}/bewerken`)}>
                  Werkzaamheden kiezen
                </Button>
                }
              />
            ) : (
              <div className="divide-y divide-sand-200">
                {inkoop.groepen.map((g) => {
                  const Icon = GROEP_ICONS[g.id]
                  return (
                    <section key={g.id} className="py-2">
                      <h3 className="flex items-center gap-2 px-5 pt-3 pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-gold-700 sm:px-6">
                        <Icon className="h-3.5 w-3.5" /> <span className="flex-1">{g.naam}</span>
                        <span className="tabnum tracking-normal normal-case text-ink-soft">{euro(g.totaal)}</span>
                      </h3>
                      <ul>
                        {g.regels.map((r) => {
                          const aan = !!p.afgevinkt[r.sleutel]
                          return (
                            <li key={r.sleutel}>
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={aan}
                                onClick={() => wissel(r.sleutel)}
                                className="flex w-full items-start gap-3.5 px-5 py-3 text-left transition hover:bg-sand-50 sm:px-6"
                              >
                                <Checkbox checked={aan} className="mt-0.5" />
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-[0.92rem] font-medium ${aan ? 'text-ink-muted line-through decoration-gold-500/70' : 'text-ink'}`}>
                                    <span className="tabnum mr-1.5 font-semibold text-gold-700">{r.koopAantal}×</span>
                                    {r.naam}
                                    {r.link && (
                                      <a
                                        href={r.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label="Productpagina openen"
                                        className="ml-1.5 inline-flex translate-y-0.5 text-gold-600 hover:text-gold-700"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </span>
                                  <span className="mt-0.5 block text-[0.78rem] text-ink-muted">
                                    {[
                                      r.productNaam ?? r.spec,
                                      r.koopVerpakking === 'stuk' || r.koopVerpakking === 'set' ? '' : r.koopVerpakking,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ') || r.verpakking}
                                  </span>
                                </span>
                                <span className={`shrink-0 text-right ${aan ? '[&_.text-ink]:text-ink-muted' : ''}`}>
                                  {r.bron !== 'geen' ? (
                                    <>
                                      <span className="tabnum block text-[0.92rem] font-semibold text-ink">{euro(r.totaal)}</span>
                                      <span className="mt-0.5 inline-flex flex-col items-end gap-0.5">
                                        <span className="text-[0.72rem] text-ink-muted">
                                          {euro(r.prijs ?? 0)}/{prijsEenheid(r.id)}
                                        </span>
                                        {toonLev && r.leverancier && <Badge tone="sand">{r.leverancier}</Badge>}
                                        {inkoop.prijsStatus.eigen > 0 && inkoop.prijsStatus.voorbeeld > 0 && (
                                          <span className={`text-[0.66rem] ${r.bron === 'eigen' ? 'font-semibold text-gold-700' : 'text-ink-muted'}`}>
                                            {r.bron === 'eigen' ? 'eigen prijs' : 'voorbeeldprijs'}
                                          </span>
                                        )}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-[0.75rem] text-ink-muted">Geen prijs</span>
                                  )}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )
                })}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-sand-200 bg-sand-50 px-5 py-4 sm:px-6">
              <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} disabled={!afgevinkt} onClick={() => projectStore.werkBij(p.id, (x) => ({ ...x, afgevinkt: {} }))}>
                Vinkjes wissen
              </Button>
              <p className="text-right">
                <span className="block text-[0.7rem] font-semibold uppercase tracking-wider text-ink-muted">
                  Totaal materiaal
                </span>
                <span className="tabnum font-display text-[1.6rem] leading-tight font-semibold">{euro(inkoop.totaal)}</span>
              </p>
            </div>
          </Card>
        </div>

        <aside className="order-1 space-y-5 lg:sticky lg:top-24 lg:order-2">
          <Card className="overflow-hidden">
            <div className="bg-ink px-5 py-5 text-sand-50 sm:px-6">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-gold-300">
                {inkoop.prijsStatus.voorbeeld === 0 && inkoop.prijsStatus.eigen > 0 ? 'Totaal materiaal' : 'Richtprijs materiaal'}
              </p>
              <p className="tabnum mt-1.5 font-display text-[2.4rem] leading-none font-semibold">{euro(inkoop.totaal)}</p>
              <p className="mt-2 text-xs text-sand-300">
                Eén eigen prijslijst · incl. btw ·{' '}
                {inkoop.prijsStatus.eigen === 0 ? 'voorbeeldprijzen' : inkoop.prijsStatus.voorbeeld === 0 ? 'eigen prijzen' : 'deels voorbeeld'}
              </p>
            </div>
            <div className="px-5 py-4 sm:px-6">
              <p className="mb-2 text-[0.82rem] font-semibold text-ink">Per onderdeel</p>
              <ul className="divide-y divide-sand-200">
                {inkoop.groepen.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-[0.88rem]">
                    <span className="min-w-0 text-ink-soft">{g.naam}</span>
                    <span className="tabnum shrink-0 font-semibold">{euro(g.totaal)}</span>
                  </li>
                ))}
              </ul>
              {inkoop.metLeverancier && (
                <>
                  <p className="mt-4 mb-2 flex items-center gap-2 text-[0.82rem] font-semibold text-ink">
                    <Truck className="h-4 w-4 text-gold-600" /> Per leverancier
                  </p>
                  <ul className="divide-y divide-sand-200">
                    {levTotalen.map(([l, t]) => (
                      <li key={l} className="flex items-center justify-between gap-3 py-2 text-[0.88rem]">
                        <span className="min-w-0 truncate text-ink-soft">{l}</span>
                        <span className="tabnum shrink-0 font-semibold">{euro(t)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

/** Melding boven de inkooplijst die zich aanpast aan de herkomst van de gebruikte prijzen. */
function PrijsMelding({ status, projectId }: { status: PrijsStatus; projectId: string }) {
  const knop = (tekst: string) => (
    <Button size="sm" variant="secondary" onClick={() => ga(`/prijzen/${projectId}`)}>
      {tekst} <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  )
  const totaal = status.eigen + status.voorbeeld
  if (status.eigen > 0 && status.voorbeeld === 0) {
    return (
      <Notice tone="sage" title={`Eigen prijzen, bijgewerkt op ${status.laatstBijgewerkt ? datum(Date.parse(status.laatstBijgewerkt)) : 'onbekende datum'}`} action={knop('Prijzen beheren')}>
        Alle prijzen in deze inkooplijst heb je zelf ingevoerd.
      </Notice>
    )
  }
  if (status.eigen > 0) {
    return (
      <Notice
        title={`${status.voorbeeld} van ${totaal} prijzen ${status.voorbeeld === 1 ? 'is' : 'zijn'} nog voorbeeldprijs`}
        action={knop('Prijzen aanvullen')}
      >
        {status.eigen} eigen {status.eigen === 1 ? 'prijs' : 'prijzen'}, laatst bijgewerkt op{' '}
        {status.laatstBijgewerkt ? datum(Date.parse(status.laatstBijgewerkt)) : '—'}. Artikelen met een voorbeeldprijs zijn gemarkeerd.
      </Notice>
    )
  }
  return (
    <Notice title="Voorbeeldprijzen — nog geen eigen prijslijst" action={knop('Eigen prijzen invullen')}>
      De prijzen komen uit een voorbeeldtabel (peildatum {datum(Date.parse(VOORBEELD_PEILDATUM))}) en zijn alleen bedoeld om de werking te tonen.
      Vul je eigen inkoopprijzen in voor een betrouwbare offerte.
    </Notice>
  )
}
