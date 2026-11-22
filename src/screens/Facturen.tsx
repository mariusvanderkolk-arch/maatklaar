import { useMemo, useState } from 'react'
import { ArrowLeft, BadgeCheck, CircleAlert, Copy, FileText, MessageCircle, Printer, ReceiptText, RotateCcw, Send, Share2, ShieldCheck, Trash2 } from 'lucide-react'
import { FactuurDocument } from '../components/FactuurDocument'
import { Badge, Button, Card, DateField, Dialog, LeegStaat, PageTitle, Stat, Switch, TextField } from '../components/ui'
import { toast } from '../components/Toast'
import { btwOverzicht, vervaldatumVoor, dagenTeLaat, effectieveStatus, factuurTekst, factuurTotalen, STATUS_LABEL, type EffectieveStatus, type Factuur } from '../lib/factuur'
import { factuurStore, useFacturen, werkFactuurBij } from '../lib/factuurStore'
import { useBedrijf } from '../lib/bedrijf'
import { euro } from '../lib/format'
import { datumNl } from '../lib/offerte'
import { vandaag } from '../lib/planning'
import { ga } from '../lib/router'
import { deelOfKopieer, kopieer } from '../lib/share'
import { betalingsHerinneringTekst, factuurLink, factuurWhatsappTekst, decodeerFactuur } from '../lib/factuurDelen'
import { openWhatsapp, whatsappUrl } from '../lib/whatsapp'

const TOON: Record<EffectieveStatus, 'sand' | 'gold' | 'sage' | 'ink'> = { concept: 'sand', verzonden: 'gold', betaald: 'sage', 'te-laat': 'ink' }

export function StatusBadge({ s }: { s: EffectieveStatus }) {
  if (s === 'te-laat')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rust/10 px-2.5 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap text-rust ring-1 ring-rust/25 ring-inset">
        <CircleAlert className="h-3 w-3" /> Te laat
      </span>
    )
  return <Badge tone={TOON[s]}>{STATUS_LABEL[s]}</Badge>
}

const FILTERS: { id: 'alle' | EffectieveStatus; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'concept', label: 'Concept' },
  { id: 'verzonden', label: 'Verzonden' },
  { id: 'te-laat', label: 'Te laat' },
  { id: 'betaald', label: 'Betaald' },
]

export function Facturen() {
  const facturen = useFacturen()
  const nu = vandaag()
  const [filter, setFilter] = useState<'alle' | EffectieveStatus>('alle')
  const t = factuurTotalen(facturen, nu)
  const lijst = [...facturen]
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.nummer.localeCompare(a.nummer))
    .filter((f) => filter === 'alle' || effectieveStatus(f, nu) === filter)
  const aantal = (id: (typeof FILTERS)[number]['id']) => (id === 'alle' ? facturen.length : facturen.filter((f) => effectieveStatus(f, nu) === id).length)

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <PageTitle eyebrow="Administratie" title="Facturen" sub="Maak een factuur vanuit een offerte (stap Offerte van een project). Facturen worden alleen op dit apparaat bewaard en gaan mee in de back-up." />
      <Card className="mt-6 grid grid-cols-2 gap-5 p-5 sm:grid-cols-4 sm:p-6">
        <Stat label="Openstaand" value={euro(t.open)} sub="verzonden, nog niet betaald" />
        <Stat label="Te laat" value={<span className={t.aantalTeLaat ? 'text-rust' : ''}>{euro(t.teLaat)}</span>} sub={`${t.aantalTeLaat} ${t.aantalTeLaat === 1 ? 'factuur' : 'facturen'}`} />
        <Stat label="Betaald" value={euro(t.betaald)} sub="totaal ontvangen" />
        <Stat label="Concept" value={euro(t.concept)} sub="nog niet verzonden" />
      </Card>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2" role="group" aria-label="Filter op status">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={filter === x.id}
              onClick={() => setFilter(x.id)}
              className={`h-9 rounded-full px-4 text-[0.84rem] font-medium ring-1 ring-inset transition ${filter === x.id ? 'bg-ink text-sand-50 ring-ink' : 'bg-white/70 text-ink-soft ring-sand-300 hover:ring-gold-400'}`}
            >
              {x.label} <span className="tabnum opacity-70">{aantal(x.id)}</span>
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        {lijst.length === 0 ? (
          <LeegStaat
            icon={<ReceiptText className="h-5 w-5" />}
            titel={facturen.length ? 'Geen facturen met deze status' : 'Nog geen facturen'}
            tekst={facturen.length ? 'Kies een ander filter.' : 'Open een project, ga naar de stap Offerte en tik op “Factuur maken”. Regels, klant en bedragen worden overgenomen.'}
            actie={
              !facturen.length && (
                <Button variant="secondary" icon={<FileText className="h-4 w-4" />} onClick={() => ga('/')}>
                  Naar projecten
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-sand-200">
            {lijst.map((f) => {
              const s = effectieveStatus(f, nu)
              return (
                <li key={f.id}>
                  <a href={`#/factuur/${f.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-sand-50 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="tabnum font-semibold text-ink">{f.nummer}</span>
                        <StatusBadge s={s} />
                      </p>
                      <p className="mt-0.5 truncate text-[0.85rem] text-ink-soft">
                        {f.klant || 'Geen klant'}
                        {f.project ? ` · ${f.project}` : ''}
                      </p>
                      <p className="text-[0.75rem] text-ink-muted">
                        {datumNl(f.datum)} ·{' '}
                        {s === 'betaald' && f.betaaldOp ? `betaald ${datumNl(f.betaaldOp)}` : s === 'te-laat' ? `${dagenTeLaat(f, nu)} dagen over vervaldatum` : `vervalt ${datumNl(f.vervaldatum)}`}
                      </p>
                    </div>
                    <p className="tabnum shrink-0 text-right font-semibold text-ink">{euro(btwOverzicht(f.regels).totaalIncl)}</p>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function FactuurScherm({ id }: { id: string }) {
  const facturen = useFacturen()
  const bedrijf = useBedrijf()
  const f = facturen.find((x) => x.id === id)
  const nu = vandaag()
  const [betaaldOp, setBetaaldOp] = useState(nu)
  const [verwijderen, setVerwijderen] = useState(false)
  if (!f)
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Factuur niet gevonden</h1>
        <p className="mt-2 text-ink-soft">Misschien is hij verwijderd of staat hij op een ander apparaat.</p>
        <Button className="mt-5" onClick={() => ga('/facturen')}>
          Naar facturen
        </Button>
      </div>
    )
  const s = effectieveStatus(f, nu)
  const concept = f.status === 'concept'
  const upd = (w: (x: Factuur) => Factuur) => {
    if (!werkFactuurBij(f.id, w)) toast(factuurStore.fout() ?? 'Opslaan mislukt', 'fout')
  }
  const arbeid = f.regels.filter((r) => r.soort === 'arbeid')
  const alles9 = arbeid.length > 0 && arbeid.every((r) => r.btw === 9)
  const totaal = btwOverzicht(f.regels).totaalIncl

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6 sm:pt-7">
      <a href="#/facturen" className="no-print inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Facturen
      </a>
      <div className="no-print mt-3 flex flex-wrap items-center gap-3">
        <h1 className="tabnum text-[2rem] leading-none font-semibold sm:text-[2.4rem]">{f.nummer}</h1>
        <StatusBadge s={s} />
        <span className="tabnum ml-auto text-lg font-semibold">{euro(totaal)}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <FactuurDocument f={f} logo={bedrijf.logo} vandaag={nu} />

        <aside className="no-print space-y-5 lg:sticky lg:top-24">
          <Card className="p-5">
            <p className="text-[0.98rem] font-semibold">Status</p>
            {s === 'te-laat' && (
              <div className="mt-2 rounded-xl bg-rust/10 px-3 py-2 text-[0.82rem] text-rust">
                <p>{dagenTeLaat(f, nu)} dagen over de vervaldatum.</p>
                <Button
                  className="mt-2 w-full"
                  size="sm"
                  icon={<MessageCircle className="h-4 w-4" />}
                  onClick={() => {
                    const link = factuurLink(f)
                    if (link.length > 11500) return toast('De link is te lang. Gebruik Afdrukken / PDF.', 'fout')
                    openWhatsapp(whatsappUrl(betalingsHerinneringTekst(f, link, nu)))
                  }}
                  data-testid="stuur-betaalherinnering"
                >
                  Stuur herinnering via WhatsApp
                </Button>
                <p className="mt-1.5 text-[0.75rem] text-ink-soft">Er opent een conceptbericht in WhatsApp. Je verstuurt het zelf.</p>
              </div>
            )}
            <div className="mt-3 grid gap-2">
              {concept && (
                <Button icon={<Send className="h-4 w-4" />} onClick={() => upd((x) => ({ ...x, status: 'verzonden', verzondenOp: nu }))}>
                  Markeer als verzonden
                </Button>
              )}
              {f.status !== 'betaald' ? (
                <div className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
                  <DateField label="Betaald op" value={betaaldOp} onChange={setBetaaldOp} compact />
                  <Button variant="gold" className="mt-2 w-full" icon={<BadgeCheck className="h-4 w-4" />} onClick={() => upd((x) => ({ ...x, status: 'betaald', betaaldOp: betaaldOp || nu, verzondenOp: x.verzondenOp ?? nu }))}>
                    Markeer als betaald
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-[0.85rem] text-ink-soft">Betaald op {datumNl(f.betaaldOp ?? nu)}.</p>
                  <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={() => upd((x) => ({ ...x, status: 'verzonden', betaaldOp: undefined }))}>
                    Toch niet betaald
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[0.98rem] font-semibold">Gegevens</p>
            {!concept && <p className="mt-1 text-[0.78rem] text-ink-muted">Verzonden facturen pas je niet meer aan. Maak bij een fout een nieuwe factuur.</p>}
            <div className="mt-3 grid gap-3">
              {concept ? (
                <div className="grid grid-cols-2 gap-3">
                  <DateField label="Factuurdatum" value={f.datum} onChange={(v) => v && upd((x) => ({ ...x, datum: v, vervaldatum: vervaldatumVoor(v, bedrijf.betaalDagen || 14) }))} compact />
                  <DateField label="Vervaldatum" value={f.vervaldatum} onChange={(v) => v && upd((x) => ({ ...x, vervaldatum: v }))} compact />
                </div>
              ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.85rem]">
                  <dt className="text-ink-muted">Factuurdatum</dt>
                  <dd>{datumNl(f.datum)}</dd>
                  <dt className="text-ink-muted">Vervaldatum</dt>
                  <dd>{datumNl(f.vervaldatum)}</dd>
                  {f.verzondenOp && (
                    <>
                      <dt className="text-ink-muted">Verzonden</dt>
                      <dd>{datumNl(f.verzondenOp)}</dd>
                    </>
                  )}
                </dl>
              )}
              {concept && <TextField label="Opmerking op factuur" value={f.notitie} onChange={(v) => upd((x) => ({ ...x, notitie: v }))} placeholder="Bijv. aanbetaling al verrekend" />}
            </div>
            {arbeid.length > 0 && (
              <div className="mt-4 rounded-xl bg-sand-50 p-3.5 ring-1 ring-sand-200">
                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  9% btw op alle arbeid
                  <Switch
                    label="9% btw op alle arbeid"
                    checked={alles9}
                    onChange={(v) => concept && upd((x) => ({ ...x, regels: x.regels.map((r) => (r.soort === 'arbeid' ? { ...r, btw: v ? 9 : 21 } : r)) }))}
                  />
                </label>
                <ul className="mt-2 space-y-1.5">
                  {arbeid.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 text-[0.8rem] text-ink-soft">
                      <span className="min-w-0 truncate">{r.omschrijving}</span>
                      <button
                        type="button"
                        disabled={!concept}
                        aria-label={`Btw-tarief ${r.omschrijving}: ${r.btw}%`}
                        onClick={() => upd((x) => ({ ...x, regels: x.regels.map((y) => (y.id === r.id ? { ...y, btw: y.btw === 9 ? 21 : 9 } : y)) }))}
                        className={`tabnum h-7 shrink-0 rounded-full px-2.5 text-[0.75rem] font-semibold ring-1 ring-inset disabled:opacity-60 ${r.btw === 9 ? 'bg-ink text-sand-50 ring-ink' : 'bg-white ring-sand-300'}`}
                      >
                        {r.btw}%
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-[0.75rem] leading-snug text-ink-muted">
                  <strong className="text-ink-soft">Controleer zelf of dit mag.</strong> Het verlaagde tarief van 9% geldt alleen voor arbeidskosten bij renovatie en herstel van woningen
                  die ouder zijn dan 2 jaar. Materialen blijven 21%. Twijfel je? Check de regels van de Belastingdienst.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="grid gap-2">
              <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
                Afdrukken / PDF
              </Button>
              <Button
                icon={<MessageCircle className="h-4 w-4" />}
                onClick={() => {
                  const link = factuurLink(f)
                  if (link.length > 11500) return toast('De link is te lang. Gebruik Afdrukken / PDF.', 'fout')
                  openWhatsapp(whatsappUrl(factuurWhatsappTekst(f, link)))
                }}
                data-testid="deel-factuur-whatsapp"
              >
                WhatsApp naar klant
              </Button>
              <Button
                variant="secondary"
                icon={<Copy className="h-4 w-4" />}
                onClick={async () => {
                  const link = factuurLink(f)
                  if (link.length > 11500) return toast('De link is te lang. Gebruik Afdrukken / PDF.', 'fout')
                  const r = await kopieer(link)
                  toast(r === 'gekopieerd' ? 'Factuurlink gekopieerd' : 'Kopiëren mislukt', r === 'gekopieerd' ? undefined : 'fout')
                }}
                data-testid="factuur-link"
              >
                Kopieer factuurlink
              </Button>
              <Button
                variant="secondary"
                icon={<Share2 className="h-4 w-4" />}
                onClick={async () => {
                  const link = factuurLink(f)
                  const tekst = link.length > 11500 ? factuurTekst(f) : factuurWhatsappTekst(f, link)
                  const r = await deelOfKopieer(`Factuur ${f.nummer}`, tekst)
                  if (r === 'gekopieerd') toast('Factuurgegevens gekopieerd')
                  else if (r === 'mislukt') toast('Delen mislukt', 'fout')
                }}
              >
                Delen of kopiëren
              </Button>
              <p className="text-[0.75rem] leading-snug text-ink-muted">WhatsApp opent een conceptbericht met een link die de klant in de browser opent. Je verstuurt het zelf. Afdrukken / PDF blijft beschikbaar als bijlage.</p>
              {f.projectId && (
                <Button variant="ghost" icon={<FileText className="h-4 w-4" />} onClick={() => ga(`/project/${f.projectId}/offerte`)}>
                  Naar offerte {f.offerteNummer !== '—' ? f.offerteNummer : ''}
                </Button>
              )}
              {concept && (
                <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setVerwijderen(true)}>
                  Concept verwijderen
                </Button>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <Dialog
        open={verwijderen}
        onClose={() => setVerwijderen(false)}
        title="Concept verwijderen?"
        sub={`Factuur ${f.nummer}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setVerwijderen(false)}>
              Annuleren
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                factuurStore.update((l) => l.filter((x) => x.id !== f.id))
                toast(`Concept ${f.nummer} verwijderd`)
                ga('/facturen')
              }}
            >
              Verwijderen
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Het nummer {f.nummer} wordt niet opnieuw gebruikt, zodat er nooit twee facturen met hetzelfde nummer bestaan.</p>
      </Dialog>
    </div>
  )
}


/** Alleen-lezen factuur voor de klant, via een link in de URL-hash. */
export function KlantFactuur({ code }: { code: string }) {
  const resultaat = useMemo(() => {
    try {
      return { f: decodeerFactuur(code) }
    } catch (e) {
      return { fout: (e as Error).message }
    }
  }, [code])
  if (!resultaat.f) {
    return (
      <div className="flex min-h-dvh flex-col bg-grain">
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold">Factuur niet te openen</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{resultaat.fout}</p>
        </div>
      </div>
    )
  }
  const f = resultaat.f
  const vandaagIso = vandaag()
  return (
    <div className="flex min-h-dvh flex-col bg-grain">
      <header className="no-print border-b border-sand-300/60 bg-sand-100/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <p className="truncate font-display text-[1.35rem] font-semibold">{f.bedrijf.naam || 'Factuur'}</p>
          <span className="inline-flex items-center gap-1.5 text-[0.78rem] text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-gold-600" /> Alleen-lezen
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
        <FactuurDocument f={f} vandaag={vandaagIso} />
        <Button variant="secondary" className="no-print w-full" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
          Afdrukken / PDF
        </Button>
      </main>
    </div>
  )
}
