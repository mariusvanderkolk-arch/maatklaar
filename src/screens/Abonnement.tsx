/** Maatklaar Pro: abonnement, proefperiode, betalen (Mollie) en opzeggen. Alleen zichtbaar als billing aan staat of via ?preview=. */
import { useState } from 'react'
import { ArrowLeft, Check, CreditCard, Crown, Receipt, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Dialog, Notice, PageTitle } from '../components/ui'
import { Betaalmuur } from '../components/Betaalmuur'
import { ga } from '../lib/router'
import { BILLING_AAN, GRATIS_MAX_PROJECTEN, PRIJS_INCL_BTW, PROEF_DAGEN, type Plan } from '../lib/billing/config'
import { heeftPro, jaarBesparing, prijsLabel, proefDagenOver, proefMogelijk, statusTekst, type Abonnement } from '../lib/billing/logica'
import { startBetaling, startProef, useAbonnement, zegOp } from '../lib/billing/store'

const DAG = 864e5
/** Voorbeeldtoestanden voor #/abonnement?preview=… (alleen weergave, er gebeurt niets). */
function voorbeeld(soort: string): { abo: Abonnement | null; ingelogd: boolean } {
  const nu = Date.now()
  const iso = (t: number) => new Date(t).toISOString()
  if (soort === 'trial') return { ingelogd: true, abo: { status: 'trial', plan: null, trial_ends_at: iso(nu + 9.5 * DAG), current_period_end: null } }
  if (soort === 'actief') return { ingelogd: true, abo: { status: 'active', plan: 'jaar', trial_ends_at: iso(nu - 40 * DAG), current_period_end: iso(nu + 325 * DAG), mollie_subscription_id: 'sub_voorbeeld' } }
  if (soort === 'opgezegd') return { ingelogd: true, abo: { status: 'canceled', plan: 'maand', trial_ends_at: null, current_period_end: iso(nu + 12 * DAG) } }
  if (soort === 'mislukt') return { ingelogd: true, abo: { status: 'past_due', plan: 'maand', trial_ends_at: null, current_period_end: iso(nu - 2 * DAG) } }
  return { ingelogd: soort !== 'uitgelogd', abo: null }
}

const VOORDELEN = [
  'Onbeperkt projecten (gratis: ' + GRATIS_MAX_PROJECTEN + ' tegelijk)',
  'Offertes en facturen met je eigen huisstijl',
  '3D-ontwerp op de offerte en in de klantlink',
  'Cloud-sync tussen telefoon, tablet en laptop',
  'Maandelijks opzegbaar, gegevens blijven altijd van jou',
]

export function AbonnementScherm({ preview, terug }: { preview?: string; terug?: boolean }) {
  const echt = useAbonnement()
  const vb = preview ? voorbeeld(preview) : null
  const abo = vb ? vb.abo : echt.abo
  const ingelogd = vb ? vb.ingelogd : !!echt.gebruiker
  const [plan, setPlan] = useState<Plan>('jaar')
  const [opzeggen, setOpzeggen] = useState(false)
  const demo = (wat: string) => alert(`Voorbeeldweergave: hier zou "${wat}" gebeuren.`)

  if (preview === 'limiet') return <Betaalmuur aantal={GRATIS_MAX_PROJECTEN} />

  if (!BILLING_AAN && !vb)
    return (
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-32 sm:px-6">
        <PageTitle eyebrow="Abonnement" title="Maatklaar is gratis" sub="Op dit moment zijn alle functies gratis en onbeperkt te gebruiken. Er is niets af te sluiten." />
        <Button className="mt-6" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => ga('/')}>
          Naar je projecten
        </Button>
      </div>
    )

  const pro = heeftPro(abo)
  const dagen = proefDagenOver(abo)
  const bezig = !vb && echt.bezig
  const uid = echt.gebruiker?.id ?? ''
  const betaal = () => (vb ? demo(`betalen via Mollie (${plan})`) : startBetaling(plan))
  const proef = () => (vb ? demo('proefperiode starten') : startProef(uid))

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-32 sm:px-6 sm:pt-10">
      {vb && (
        <Notice className="mb-5" title="Voorbeeldweergave">
          Betalen staat nog uit. Dit scherm laat zien hoe het eruit komt te zien (toestand: {preview}). Er wordt niets afgesloten.
        </Notice>
      )}
      {terug && !vb && <Notice className="mb-5" tone="sage" title="Bedankt!">Zodra Mollie de betaling bevestigt, staat Pro aan. Dat duurt meestal een paar seconden.</Notice>}
      <PageTitle
        eyebrow="Abonnement"
        title={
          <span className="inline-flex items-center gap-3">
            Maatklaar <span className="text-gold-600">Pro</span>
          </span>
        }
        sub="Opgemeten, ontworpen, offerte klaar — zonder limiet. Je bestaande projecten blijven altijd van jou, ook zonder Pro."
      />

      {/* status */}
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${pro ? 'bg-gold-200/80 text-gold-700 ring-gold-300' : 'bg-sand-100 text-ink-muted ring-sand-300'}`}>
              <Crown className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-ink-muted">Jouw abonnement</p>
              <p className="mt-1 font-display text-[1.6rem] leading-tight font-semibold">{statusTekst(abo)}</p>
              {abo?.status === 'trial' && dagen > 0 && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand-200" aria-hidden="true">
                  <div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600" style={{ width: `${Math.max(6, (dagen / PROEF_DAGEN) * 100)}%` }} />
                </div>
              )}
              {!abo && <p className="mt-1 text-sm text-ink-muted">Gratis: maximaal {GRATIS_MAX_PROJECTEN} actieve projecten. Voorbeeldprojecten tellen niet mee.</p>}
              {abo?.status === 'past_due' && <p className="mt-1 text-sm text-rust">De laatste incasso is mislukt. Pro blijft nog een paar dagen werken; controleer je bank of betaal opnieuw.</p>}
            </div>
            {abo?.status === 'trial' && <Badge tone="gold">{dagen} {dagen === 1 ? 'dag' : 'dagen'} over</Badge>}
            {abo?.status === 'active' && <Badge tone="sage">Actief</Badge>}
          </div>
        </Card>
        <Card>
          <div className="flex h-full gap-3 p-5 text-[0.85rem] leading-relaxed text-ink-soft sm:p-6">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
            <p>
              Veilig betalen via <strong className="font-semibold text-ink">Mollie</strong> (iDEAL, creditcard, Bancontact). Daarna automatische incasso, maandelijks opzegbaar.
              Stop je, dan blijven al je projecten bruikbaar en kun je altijd exporteren.
            </p>
          </div>
        </Card>
      </div>

      {/* plannen */}
      {abo?.status !== 'active' && (
        <section className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {(['maand', 'jaar'] as Plan[]).map((pl) => {
              const l = prijsLabel(pl)
              const gekozen = plan === pl
              return (
                <button
                  key={pl}
                  type="button"
                  onClick={() => setPlan(pl)}
                  aria-pressed={gekozen}
                  className={`card relative p-5 text-left transition sm:p-6 ${gekozen ? 'ring-2 ring-gold-500' : 'hover:ring-1 hover:ring-gold-300'}`}
                >
                  {pl === 'jaar' && (
                    <span className="absolute -top-2.5 right-5 rounded-full bg-ink px-2.5 py-1 text-[0.75rem] font-semibold tracking-wide text-paper">
                      {jaarBesparing()} maanden gratis
                    </span>
                  )}
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-gold-700">{pl === 'maand' ? 'Maandelijks' : 'Jaarlijks'}</p>
                  <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-[2.4rem] leading-none font-semibold">{l.bedrag}</span>
                    <span className="text-sm text-ink-muted">{l.per}</span>
                  </p>
                  <p className="mt-1 text-[0.78rem] text-ink-muted">
                    <strong className="font-semibold text-ink-soft">{l.btw}</strong> · {l.sub}
                  </p>
                  <span className={`absolute top-5 left-auto right-5 hidden h-5 w-5 place-items-center rounded-full sm:grid ${gekozen ? 'bg-gold-500 text-white' : 'ring-1 ring-sand-300'}`} style={pl === 'jaar' ? { top: '1.9rem' } : undefined}>
                    {gekozen && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              )
            })}
          </div>
          <ul className="mt-5 grid gap-2.5 text-[0.9rem] text-ink-soft sm:grid-cols-2">
            {VOORDELEN.map((v) => (
              <li key={v} className="flex gap-2.5">
                <Check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold-600" /> {v}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {!ingelogd ? (
              <>
                <Button size="lg" icon={<UserRound className="h-4.5 w-4.5" />} onClick={() => ga('/account')}>
                  Eerst een account maken
                </Button>
                <p className="text-sm text-ink-muted">Pro en de proefperiode horen bij je account, zodat ze op al je apparaten werken.</p>
              </>
            ) : (
              <>
                {proefMogelijk(abo) && (
                  <Button size="lg" icon={<Sparkles className="h-4.5 w-4.5" />} disabled={bezig} onClick={proef}>
                    {PROEF_DAGEN} dagen gratis proberen
                  </Button>
                )}
                <Button size="lg" variant={proefMogelijk(abo) ? 'secondary' : 'primary'} icon={<CreditCard className="h-4.5 w-4.5" />} disabled={bezig} onClick={betaal}>
                  {abo?.status === 'past_due' ? 'Opnieuw betalen' : `Kies ${plan === 'jaar' ? 'jaarlijks' : 'maandelijks'}`}
                </Button>
              </>
            )}
          </div>
          <p className="mt-3 text-[0.76rem] leading-relaxed text-ink-muted">
            {proefMogelijk(abo) ? `Proberen kost niets en vraagt geen betaalgegevens; na ${PROEF_DAGEN} dagen stopt de proef vanzelf. ` : ''}
            Prijzen {PRIJS_INCL_BTW ? 'inclusief' : 'exclusief'} 21% btw.
          </p>
        </section>
      )}

      {echt.fout && !vb && (
        <Notice className="mt-6" title="Dat lukte niet">
          {echt.fout}
        </Notice>
      )}

      {/* beheren */}
      {abo && (abo.status === 'active' || abo.status === 'past_due' || abo.status === 'canceled') && (
        <Card className="mt-8">
          <CardHeader title="Beheren" sub={abo.plan ? `Plan: ${abo.plan === 'jaar' ? 'jaarlijks' : 'maandelijks'}` : undefined} />
          <div className="flex flex-col gap-3 p-5 text-sm text-ink-soft sm:flex-row sm:items-center sm:p-6">
            {abo.status === 'canceled' ? (
              <p className="flex-1">Je abonnement is opgezegd. Je houdt Pro tot het einde van de betaalde periode. Daarna gaat Maatklaar terug naar gratis; er verdwijnt niets.</p>
            ) : (
              <>
                <p className="flex-1">Opzeggen kan altijd. Je houdt Pro tot het einde van de periode waarvoor je al betaald hebt.</p>
                <Button variant="secondary" onClick={() => setOpzeggen(true)}>
                  Abonnement opzeggen
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      {/* betalingen */}
      <Card className="mt-6">
        <CardHeader title="Betalingen en facturen" sub="Je ontvangt van elke betaling een factuur per e-mail." />
        {vb && abo?.status === 'active' ? (
          <ul className="divide-y divide-sand-200 text-sm">
            {[
              ['Jaarabonnement Pro', '119,79', -40],
              ['Proefperiode', '0,00', -54],
            ].map(([w, b, d]) => (
              <li key={String(w)} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <Receipt className="h-4 w-4 text-ink-muted" />
                <span className="flex-1">{w}</span>
                <span className="text-ink-muted">{new Date(Date.now() + Number(d) * DAG).toLocaleDateString('nl-NL')}</span>
                <span className="tabnum w-20 text-right font-medium">€ {b}</span>
              </li>
            ))}
            <li className="px-5 py-3 text-[0.76rem] text-ink-muted sm:px-6">Voorbeeldregels.</li>
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-ink-muted sm:px-6">Nog geen betalingen. Facturen komen hier te staan zodra je Pro afsluit.</p>
        )}
      </Card>

      <Dialog
        open={opzeggen}
        onClose={() => setOpzeggen(false)}
        title="Abonnement opzeggen?"
        sub="Je houdt Pro tot het einde van de betaalde periode. Je projecten, offertes en facturen blijven bewaard."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpzeggen(false)}>
              Toch niet
            </Button>
            <Button
              onClick={() => {
                setOpzeggen(false)
                if (vb) demo('opzeggen')
                else void zegOp(uid)
              }}
            >
              Ja, opzeggen
            </Button>
          </div>
        }
      />
    </div>
  )
}
