import { STANDAARD_AANNAMES, uid } from '../lib/defaults'
import { MeerwerkKaart } from '../components/MeerwerkKaart'
import { meerwerkFactuurRegels } from '../lib/meerwerk'
import { ArtikelToevoegenKnop } from '../components/Artikelen'
import { VergeetCheck } from '../components/VergeetCheck'
import { TekenKaart, zelfdeVersie } from '../components/TekenKaart'
import { reviewStatus } from '../lib/reviews'
import { useEffect, useMemo } from 'react'
import { BadgeCheck, ReceiptText, Building2, Copy, ExternalLink, Printer, Send } from 'lucide-react'
import { OfferteDocument } from '../components/OfferteDocument'
import { Badge, Button, Card, Notice, NumberField, Switch, TextField } from '../components/ui'
import { toast } from '../components/Toast'
import { nieuwOffertenummer, useBedrijf } from '../lib/bedrijf'
import { formatDatum, isoDatum, kortDatum } from '../lib/format'
import { metVorige, offerteLink } from '../lib/offerte'
import { maakOfferteData } from '../lib/offerteMaken'
import { vandaag } from '../lib/planning'
import { ga } from '../lib/router'
import { inkoopTekst, kopieer } from '../lib/share'
import { projectStore } from '../lib/store'
import { useBerekening } from '../lib/useCalc'
import type { OfferteStatus, Project } from '../lib/types'
import type { OfferteData } from '../lib/offerte'
import { track } from '../lib/analytics'
import { factuurVanOfferte, useFacturen } from '../lib/factuurStore'
import { useOntwerp } from '../lib/ontwerp/store'
import { use3dBeeld } from '../lib/ontwerp/beeld'
import { btwOverzicht, effectieveStatus, STATUS_LABEL } from '../lib/factuur'

const datumIso = (iso: string) => formatDatum({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, isoDatum(iso))

export function Quote({ p }: { p: Project }) {
  const berekening = useBerekening(p)
  const bedrijf = useBedrijf()
  const of = p.offerte ?? {}
  const metArbeid = of.metArbeid ?? true
  const setOfferte = (patch: Partial<OfferteStatus>) => projectStore.werkBij(p.id, (x) => ({ ...x, offerte: { ...x.offerte, ...patch } }))

  useEffect(() => track('offerte_bekeken'), [])
  // Eén keer een offertenummer en -datum toekennen.
  useEffect(() => {
    const actueel = projectStore.alle().find((x) => x.id === p.id)
    if (actueel && !actueel.offerte?.nummer) setOfferte({ nummer: nieuwOffertenummer(), datum: actueel.offerte?.datum ?? vandaag() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id])

  const ontwerp = useOntwerp(p)
  const beeld3d = use3dBeeld(p.id)
  const data = useMemo(() => maakOfferteData(p, berekening, bedrijf, datumIso, ontwerp), [p, berekening, bedrijf, ontwerp])
  // herziene offerte: vergelijk met de laatst gedeelde tekenlink-versie (of, als die nog actueel is, met de versie daarvóór)
  const t = of.teken
  const weergave = useMemo(() => metVorige(data, t && !zelfdeVersie(t, data) ? t.code : t?.vorigeCode), [data, t])

  const deel = async () => {
    const metV = offerteLink(weergave)
    const url = metV.length < 11500 ? metV : offerteLink(data)
    setOfferte({ gedeeldOp: Date.now() })
    track('offerte_shared')
    reviewStatus.telOfferte()
    const titel = `Offerte ${data.nr}${data.bedrijf.naam ? ` – ${data.bedrijf.naam}` : ''}`
    const tekst = `Beste ${p.klant || 'klant'}, hierbij de offerte voor ${p.naam}. Je kunt hem bekijken en akkoord geven via deze link:`
    if (navigator.share) {
      try {
        await navigator.share({ title: titel, text: tekst, url })
        toast('Offerte-link gedeeld')
        return
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return
      }
    }
    toast((await kopieer(url)) === 'gekopieerd' ? 'Offerte-link gekopieerd' : 'Kopiëren mislukt', 'ok')
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="order-2 lg:order-1">
        <OfferteDocument d={weergave} logo={bedrijf.logo} beeld3d={data.ow ? beeld3d : null} ondertekening={of.teken?.getekend && zelfdeVersie(of.teken, data) ? { ...of.teken.getekend, hash: of.teken.hash } : null} />
      </div>

      <aside className="no-print order-1 space-y-4 lg:sticky lg:top-24 lg:order-2">
        {berekening.inkoop.prijsStatus?.voorbeeld && (
          <Notice title="Voorbeeldprijzen (fictief)" action={<Button size="sm" variant="secondary" onClick={() => ga('/prijzen')}>Eigen prijzen</Button>}>
            <span data-testid="offerte-fictief">Deze offerte rekent met fictieve, indicatieve voorbeeldprijzen. Vul je eigen prijzen in en controleer de maten (Opmeten) voordat je hem naar een klant stuurt.</span>
          </Notice>
        )}
        {!bedrijf.naam && (
          <Notice
            title="Zet je eigen bedrijf op de offerte"
            action={
              <Button size="sm" variant="secondary" icon={<Building2 className="h-4 w-4" />} onClick={() => ga('/instellingen')}>
                Bedrijfsgegevens
              </Button>
            }
          >
            Logo, KvK, btw-nummer, IBAN en contactgegevens.
          </Notice>
        )}

        <VergeetCheck p={p} />

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.98rem] font-semibold">Delen met de klant</p>
              <p className="mt-0.5 text-[0.82rem] leading-snug text-ink-muted">De klant bekijkt de offerte via een link en kan akkoord geven.</p>
            </div>
            {of.akkoord && (
              <Badge tone="sage">
                <BadgeCheck className="h-3.5 w-3.5" /> Akkoord
              </Badge>
            )}
          </div>
          <div className="mt-4 grid gap-2">
            <Button icon={<Send className="h-4 w-4" />} onClick={deel}>
              Deel offerte-link
            </Button>
            <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => window.open(offerteLink(data), '_blank', 'noopener')}>
              Bekijk als klant
            </Button>
          </div>
          <p className="mt-3 text-[0.76rem] leading-relaxed text-ink-muted">
            Er is geen server: de offerte zit in de link zelf. Iedereen met de link kan hem lezen. Pas je iets aan, deel dan een nieuwe link.
            {of.gedeeldOp ? ` Laatst gedeeld op ${kortDatum(of.gedeeldOp)}.` : ''}
          </p>
          <div className="mt-4 rounded-xl bg-sand-50 px-3.5 py-3 ring-1 ring-sand-200">
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Akkoord ontvangen
              <Switch
                checked={Boolean(of.akkoord)}
                label="Akkoord van de klant ontvangen"
                onChange={(v) => setOfferte({ akkoord: v ? { naam: p.klant, datum: vandaag() } : undefined })}
              />
            </label>
            <p className="mt-1 text-[0.74rem] leading-snug text-ink-muted">
              {of.akkoord ? `Vastgelegd op ${datumIso(of.akkoord.datum)}.` : 'Zet aan zodra je het akkoordbericht van de klant hebt ontvangen.'}
            </p>
          </div>
        </Card>

        <TekenKaart p={p} d={data} />
        <MeerwerkKaart p={p} d={data} />

        <Card className="p-5">
          <p className="text-[0.98rem] font-semibold">Offerte-instellingen</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <TextField label="Offertenummer" value={of.nummer ?? ''} onChange={(v) => setOfferte({ nummer: v })} />
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-sand-50 px-3.5 py-3 ring-1 ring-sand-200">
            <span className="text-sm font-medium">Arbeid meenemen</span>
            <Switch checked={metArbeid} onChange={(v) => setOfferte({ metArbeid: v })} label="Arbeid meenemen" />
          </label>
          {metArbeid && (
            <div className="mt-3">
              <NumberField label="Uurtarief (incl. btw)" unit="€" value={p.uurtarief} onChange={(v) => projectStore.werkBij(p.id, (x) => ({ ...x, uurtarief: v }))} />
            </div>
          )}
          <div className="mt-3">
            <NumberField label="Onvoorzien (stelpost)" unit="%" value={p.onvoorzien ?? 0} min={0} onChange={(v) => projectStore.werkBij(p.id, (x) => ({ ...x, onvoorzien: Math.min(50, Math.max(0, v)) }))} />
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Notities op offerte</span>
            <textarea
              rows={3}
              value={p.notities}
              onChange={(e) => projectStore.werkBij(p.id, (x) => ({ ...x, notities: e.target.value }))}
              className="w-full resize-none rounded-xl border border-sand-300 bg-white/80 px-3.5 py-2.5 text-sm focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
              placeholder="Bijv. afspraken of uitgangspunten"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 flex items-center justify-between text-[0.8rem] font-medium text-ink-soft">
              Aannames en niet inbegrepen
              {!p.aannames?.trim() && (
                <button type="button" className="text-[0.74rem] font-medium text-gold-700 underline-offset-2 hover:underline" onClick={() => projectStore.werkBij(p.id, (x) => ({ ...x, aannames: STANDAARD_AANNAMES }))}>
                  Standaardtekst invullen
                </button>
              )}
            </span>
            <textarea
              rows={5}
              maxLength={2000}
              value={p.aannames ?? ''}
              onChange={(e) => projectStore.werkBij(p.id, (x) => ({ ...x, aannames: e.target.value }))}
              className="w-full resize-y rounded-xl border border-sand-300 bg-white/80 px-3.5 py-2.5 text-sm focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
              placeholder="Eén punt per regel. Leeg laten = blok niet op de offerte."
            />
          </label>
          <p className="mt-2 text-[0.74rem] text-ink-muted">
            Geldigheid ({bedrijf.geldigheidDagen} dagen) en betaaltermijn stel je in bij{' '}
            <a href="#/instellingen" className="font-medium text-gold-700 underline-offset-2 hover:underline">
              Instellingen
            </a>
            .
          </p>
          <div className="mt-4 grid gap-2">
            <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => { track('offerte_printed'); reviewStatus.telOfferte(); window.print() }}>
              Afdrukken / PDF
            </Button>
            <Button
              variant="ghost"
              icon={<Copy className="h-4 w-4" />}
              onClick={async () => toast((await kopieer(inkoopTekst(p, berekening.inkoop))) === 'gekopieerd' ? 'Materiaallijst gekopieerd' : 'Kopiëren mislukt')}
            >
              Kopieer materiaallijst
            </Button>
            <ArtikelToevoegenKnop p={p} className="w-full" />
          </div>
        </Card>
        {!data.ow && (
          <Notice
            title="Laat de klant het ontwerp zien"
            action={
              <Button size="sm" variant="secondary" onClick={() => ga(`/project/${p.id}/ontwerp`)}>
                Naar ontwerp
              </Button>
            }
          >
            Maak een plattegrond met 3D-weergave; die komt dan op de offerte en in de klantlink.
          </Notice>
        )}
        <FactuurKaart p={p} data={data} />
      </aside>
    </div>
  )
}

function FactuurKaart({ p, data }: { p: Project; data: OfferteData }) {
  const facturen = useFacturen().filter((f) => f.projectId === p.id)
  const nu = vandaag()
  return (
    <Card className="no-print p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700 ring-1 ring-gold-200 ring-inset">
          <ReceiptText className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[0.98rem] font-semibold">Factuur</p>
          <p className="mt-0.5 text-[0.82rem] leading-snug text-ink-muted">
            Zet deze offerte{p.offerte?.akkoord ? '' : ' (ook zonder akkoord)'} om in een factuur met eigen nummer, btw-specificatie en betaalgegevens.
          </p>
        </div>
      </div>
      {facturen.length > 0 && (
        <ul className="mt-3 divide-y divide-sand-200 rounded-xl ring-1 ring-sand-200">
          {facturen.map((f) => (
            <li key={f.id}>
              <a href={`#/factuur/${f.id}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-sand-50">
                <span className="tabnum font-semibold">{f.nummer}</span>
                <span className="text-[0.78rem] text-ink-muted">{STATUS_LABEL[effectieveStatus(f, nu)]}</span>
                <span className="tabnum ml-auto">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(btwOverzicht(f.regels).totaalIncl)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant={facturen.length ? 'secondary' : 'gold'}
        className="mt-4 w-full"
        icon={<ReceiptText className="h-4 w-4" />}
        onClick={() => {
          const f = factuurVanOfferte(data, p.id, [100], meerwerkFactuurRegels(p, uid))
          if (!f) return toast('Factuur opslaan mislukt: opslag vol.', 'fout')
          toast(`Factuur ${f.nummer} aangemaakt`)
          ga(`/factuur/${f.id}`)
        }}
      >
        {facturen.length ? 'Nog een factuur maken' : 'Factuur maken'}
      </Button>
    </Card>
  )
}
