import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRightLeft,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  Percent,
  RotateCcw,
  Search,
  Sparkles,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react'
import { Badge, Button, Card, Dialog, LeegStaat, PageTitle, Switch } from '../components/ui'
import { GROEP_ICONS } from '../components/groepIcons'
import { toast } from '../components/Toast'
import { GROEPEN, type Groep, type ProductId } from '../lib/calc'
import { CATALOGUS, eenheidLabel, type CatalogusItem } from '../lib/catalogus'
import { downloadBestand, vandaagIso } from '../lib/download'
import {
  importeerPrijzen,
  laatstBijgewerkt,
  telEigenPrijzen,
  naarCsv,
  naarJson,
  type EigenPrijs,
  type EigenPrijzen,
  type KopieerModus,
} from '../lib/eigenPrijzen'
import { datum, euro, getal, kortDatum, leesGetal } from '../lib/format'
import { VOORBEELD_PEILDATUM, WINKELS, voorbeeldPrijsBron, winkelNaam, type WinkelId } from '../lib/prices'
import { prijsStore, useEigenPrijzen } from '../lib/prijsStore'

type Filter = 'alle' | 'eigen' | 'voorbeeld' | 'niet'

const voorbeeldPrijs = (p: ProductId, w: WinkelId) => voorbeeldPrijsBron.aanbiedingen(p).find((a) => a.winkel === w)?.prijs
const heeftEigen = (e?: EigenPrijs) => e?.prijs != null
const TOTAAL_CELLEN = CATALOGUS.length * WINKELS.length
const TOTAAL_VOORBEELD = (() => {
  let n = 0
  for (const item of CATALOGUS) n += voorbeeldPrijsBron.aanbiedingen(item.id).length
  return n
})()

function celStatus(eigen: EigenPrijzen, p: ProductId, w: WinkelId): 'eigen' | 'voorbeeld' | 'niet' | 'geen' {
  const e = eigen[p]?.[w]
  if (e?.nietLeverbaar) return 'niet'
  if (heeftEigen(e)) return 'eigen'
  return voorbeeldPrijs(p, w) != null ? 'voorbeeld' : 'geen'
}

export function Prices({ terugNaar }: { terugNaar?: string }) {
  const eigen = useEigenPrijzen()
  const [zoek, setZoek] = useState('')
  const [filter, setFilter] = useState<Filter>('alle')
  const [groepFilter, setGroepFilter] = useState<Groep | 'alle'>('alle')
  const [detail, setDetail] = useState<{ item: CatalogusItem; winkel: WinkelId }>()
  const [bevestig, setBevestig] = useState(false)
  const [kopieerOpen, setKopieerOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const bestand = useRef<HTMLInputElement>(null)

  const aantalEigen = telEigenPrijzen(eigen)
  const laatst = laatstBijgewerkt(eigen)
  const leeg = aantalEigen === 0

  const telling = useMemo(() => {
    const t = { alle: CATALOGUS.length, eigen: 0, voorbeeld: 0, niet: 0 }
    for (const item of CATALOGUS) {
      const st = WINKELS.map((w) => celStatus(eigen, item.id, w.id))
      if (st.includes('eigen')) t.eigen++
      if (st.includes('voorbeeld')) t.voorbeeld++
      if (st.includes('niet')) t.niet++
    }
    return t
  }, [eigen])

  const groepen = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return GROEPEN.map((g) => ({
      ...g,
      items: CATALOGUS.filter((item) => {
        if (item.groep !== g.id) return false
        if (groepFilter !== 'alle' && item.groep !== groepFilter) return false
        if (filter !== 'alle' && !WINKELS.some((w) => celStatus(eigen, item.id, w.id) === filter)) return false
        if (!q) return true
        const namen = WINKELS.map((w) => eigen[item.id]?.[w.id]?.productNaam ?? '').join(' ')
        return `${item.naam} ${g.naam} ${namen}`.toLowerCase().includes(q)
      }),
    })).filter((g) => g.items.length)
  }, [zoek, filter, groepFilter, eigen])

  async function importeer(file?: File) {
    if (!file) return
    try {
      const nieuw = importeerPrijzen(await file.text(), voorbeeldPrijsBron)
      prijsStore.importeer(nieuw)
      const n = telEigenPrijzen(nieuw)
      toast(`${n} ${n === 1 ? 'prijs' : 'prijzen'} geïmporteerd uit ${file.name}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Importeren is mislukt.', 'fout')
    } finally {
      if (bestand.current) bestand.current.value = ''
    }
  }

  function overnemen() {
    const voor = aantalEigen
    prijsStore.voorbeeldOvernemen()
    const erbij = telEigenPrijzen(prijsStore.alle()) - voor
    toast(
      erbij > 0
        ? `${erbij} ${erbij === 1 ? 'voorbeeldprijs' : 'voorbeeldprijzen'} overgenomen – pas ze aan naar jouw inkoop`
        : 'Alle cellen hadden al een eigen prijs',
    )
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'alle', label: 'Alle' },
    { id: 'eigen', label: 'Eigen prijzen' },
    { id: 'voorbeeld', label: 'Voorbeeldprijzen' },
    { id: 'niet', label: 'Niet leverbaar' },
  ]

  return (
    <div className="bg-grain">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        {terugNaar && (
          <a href={`#/project/${terugNaar}/inkoop`} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Terug naar inkooplijst
          </a>
        )}
        <PageTitle
          eyebrow="Instellingen"
          title="Prijzen beheren"
          sub="Vul je eigen inkoopprijzen in (incl. btw). Ze gaan direct vóór de voorbeeldprijzen in de inkooplijst, winkeltotalen en offerte. Tik in een cel om snel te wijzigen."
        />

        {/* Snelle start – prominent als er nog geen eigen prijzen zijn */}
        {leeg && (
          <Card className="mt-7 overflow-hidden ring-1 ring-gold-300/60">
            <div className="bg-gradient-to-br from-gold-100/70 via-sand-50 to-paper px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-200/80 text-gold-700 ring-1 ring-gold-300">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1.35rem] font-semibold leading-tight">Snelle start</p>
                  <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">
                    Neem de {TOTAAL_VOORBEELD} voorbeeldprijzen over als startpunt en pas daarna alleen aan wat bij jou anders is.
                    Geen live winkelprijzen — dit zijn jouw eigen cijfers op dit apparaat.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="gold" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={overnemen}>
                      Voorbeeldprijzen overnemen
                    </Button>
                    <Button size="sm" variant="secondary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => bestand.current?.click()}>
                      Importeren (CSV/JSON)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Status en acties */}
        <Card className={`overflow-hidden ${leeg ? 'mt-4' : 'mt-7'}`}>
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">Eigen prijzen</p>
                  <p className="tabnum mt-1 font-display text-[2.2rem] leading-none font-semibold">
                    {aantalEigen}
                    <span className="ml-1.5 font-sans text-sm font-medium text-ink-muted">van {TOTAAL_CELLEN}</span>
                  </p>
                </div>
                <div className="min-w-0 pb-1 text-sm text-ink-soft">
                  {laatst ? (
                    <>
                      Laatst bijgewerkt op <span className="font-medium text-ink">{datum(Date.parse(laatst))}</span>
                    </>
                  ) : (
                    <>Nog geen eigen prijzen: alles is voorbeeldprijs (peildatum {datum(Date.parse(VOORBEELD_PEILDATUM))}).</>
                  )}
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand-200">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all" style={{ width: `${(aantalEigen / TOTAAL_CELLEN) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-sand-200 bg-sand-50/70 px-5 py-4 sm:px-6 lg:border-t-0 lg:border-l">
              {!leeg && (
                <>
                  <Button size="sm" variant="secondary" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} onClick={() => setKopieerOpen(true)}>
                    Winkel kopiëren
                  </Button>
                  <Button size="sm" variant="secondary" icon={<Percent className="h-3.5 w-3.5" />} onClick={() => setBulkOpen(true)}>
                    % aanpassen
                  </Button>
                </>
              )}
              {!leeg && (
                <Button size="sm" variant="ghost" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={overnemen} title="Vult alleen cellen die nog leeg zijn met voorbeeldprijzen">
                  Voorbeelden bijvullen
                </Button>
              )}
              <ExportKnop eigen={eigen} />
              <Button size="sm" variant="secondary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => bestand.current?.click()}>
                Importeren
              </Button>
              <input ref={bestand} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" data-testid="prijzen-import" onChange={(e) => importeer(e.target.files?.[0])} />
              <Button size="sm" variant="danger" icon={<RotateCcw className="h-3.5 w-3.5" />} disabled={!Object.keys(eigen).length} onClick={() => setBevestig(true)}>
                Terugzetten
              </Button>
            </div>
          </div>
        </Card>

        {/* Zoeken, statusfilter, categorie */}
        <div className="sticky top-16 z-20 -mx-4 mt-5 bg-sand-100/85 px-4 py-3 backdrop-blur-md sm:top-[4.5rem] sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="relative block md:w-80">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  value={zoek}
                  onChange={(e) => setZoek(e.target.value)}
                  placeholder="Zoek artikel, categorie of productnaam"
                  className="h-11 w-full rounded-xl border border-sand-300 bg-white/90 pr-9 pl-10 text-[0.92rem] placeholder:text-ink-muted/70 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
                />
                {zoek && (
                  <button type="button" aria-label="Zoekterm wissen" onClick={() => setZoek('')} className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-sand-100">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                <div className="flex min-w-max gap-1.5">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] font-medium ring-1 ring-inset transition ${
                        filter === f.id ? 'bg-ink text-sand-50 ring-ink' : 'bg-white/70 text-ink-soft ring-sand-300 hover:ring-gold-400'
                      }`}
                    >
                      {f.label}
                      <span className={`tabnum rounded-full px-1.5 text-[0.7rem] ${filter === f.id ? 'bg-white/15' : 'bg-sand-200/80'}`}>{telling[f.id]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <div className="flex min-w-max gap-1.5" role="tablist" aria-label="Categorie">
                <button
                  type="button"
                  role="tab"
                  aria-selected={groepFilter === 'alle'}
                  onClick={() => setGroepFilter('alle')}
                  className={`inline-flex h-8 items-center rounded-full px-3 text-[0.78rem] font-medium ring-1 ring-inset transition ${
                    groepFilter === 'alle' ? 'bg-gold-200/80 text-ink ring-gold-400' : 'bg-white/50 text-ink-muted ring-sand-300 hover:ring-gold-400'
                  }`}
                >
                  Alle categorieën
                </button>
                {GROEPEN.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={groepFilter === g.id}
                    onClick={() => setGroepFilter(g.id)}
                    className={`inline-flex h-8 items-center rounded-full px-3 text-[0.78rem] font-medium ring-1 ring-inset transition ${
                      groepFilter === g.id ? 'bg-gold-200/80 text-ink ring-gold-400' : 'bg-white/50 text-ink-muted ring-sand-300 hover:ring-gold-400'
                    }`}
                  >
                    {g.naam}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Kolomkoppen (desktop) */}
        <div className="mt-3 hidden grid-cols-[minmax(0,1.25fr)_repeat(4,minmax(0,1fr))] gap-3 px-6 pb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-muted lg:grid">
          <span>Artikel</span>
          {WINKELS.map((w) => (
            <span key={w.id}>{w.naam}</span>
          ))}
        </div>

        {groepen.length === 0 ? (
          <Card className="mt-3">
            <LeegStaat
              icon={<Search className="h-5 w-5" />}
              titel="Niets gevonden"
              tekst="Pas je zoekterm, statusfilter of categorie aan."
              actie={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setZoek('')
                    setFilter('alle')
                    setGroepFilter('alle')
                  }}
                >
                  Alles tonen
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="mt-3 space-y-4 lg:mt-0">
            {groepen.map((g) => {
              const Icon = GROEP_ICONS[g.id]
              return (
                <Card key={g.id} className="overflow-hidden">
                  <h2 className="flex items-center gap-2 border-b border-sand-200 bg-sand-50/60 px-5 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-gold-700 sm:px-6">
                    <Icon className="h-3.5 w-3.5" /> {g.naam}
                    <span className="ml-auto font-medium tracking-normal normal-case text-ink-muted">
                      {g.items.length} {g.items.length === 1 ? 'artikel' : 'artikelen'}
                    </span>
                  </h2>
                  <ul className="divide-y divide-sand-200">
                    {g.items.map((item) => (
                      <ArtikelRij key={item.id} item={item} eigen={eigen} onDetail={(w) => setDetail({ item, winkel: w })} />
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink-muted">
          Prijzen blijven alleen op dit apparaat. Gebruik Exporteren voor een back-up of om ze naar een ander apparaat te verhuizen. Importeer een CSV/JSON om snel te starten.
        </p>
      </div>

      {detail && <PrijsDetails item={detail.item} winkel={detail.winkel} eigen={eigen} onClose={() => setDetail(undefined)} />}

      <KopieerDialoog open={kopieerOpen} onClose={() => setKopieerOpen(false)} />
      <BulkDialoog open={bulkOpen} onClose={() => setBulkOpen(false)} eigen={eigen} />

      <Dialog
        open={bevestig}
        onClose={() => setBevestig(false)}
        title="Terug naar voorbeeldprijzen?"
        sub="Dit kan niet ongedaan worden gemaakt."
        footer={
          <>
            <Button variant="secondary" onClick={() => setBevestig(false)}>
              Annuleren
            </Button>
            <Button
              className="!bg-rust hover:!bg-[#9a4a35]"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                prijsStore.allesTerug()
                setBevestig(false)
                toast('Voorbeeldprijzen hersteld')
              }}
            >
              Ja, alles terugzetten
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          Al je eigen gegevens ({aantalEigen} {aantalEigen === 1 ? 'prijs' : 'prijzen'}, plus productnamen, links en ‘niet leverbaar’) worden verwijderd.
          Overal worden weer de voorbeeldprijzen gebruikt.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-4 py-3 ring-1 ring-sand-200">
          <p className="text-[0.82rem] text-ink-soft">Tip: maak eerst een back-up.</p>
          <ExportKnop eigen={eigen} compact />
        </div>
      </Dialog>
    </div>
  )
}

function KopieerDialoog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [van, setVan] = useState<WinkelId>('gamma')
  const [naar, setNaar] = useState<WinkelId>('praxis')
  const [modus, setModus] = useState<KopieerModus>('alleen-leeg')
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Prijzen van winkel kopiëren"
      sub="Gebruik één winkel als startpunt voor een andere (bijv. Gamma → Praxis)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            variant="gold"
            icon={<ArrowRightLeft className="h-4 w-4" />}
            disabled={van === naar}
            onClick={() => {
              const voor = telEigenPrijzen(prijsStore.alle())
              prijsStore.kopieerWinkel(van, naar, modus)
              const na = telEigenPrijzen(prijsStore.alle())
              toast(`${winkelNaam(van)} → ${winkelNaam(naar)}: ${Math.max(0, na - voor)} ${na - voor === 1 ? 'prijs' : 'prijzen'} gezet`)
              onClose()
            }}
          >
            Kopiëren
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Van</span>
            <select className="h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3 text-[0.92rem] focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none" value={van} onChange={(e) => setVan(e.target.value as WinkelId)}>
              {WINKELS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.naam}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Naar</span>
            <select className="h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3 text-[0.92rem] focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none" value={naar} onChange={(e) => setNaar(e.target.value as WinkelId)}>
              {WINKELS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.naam}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="space-y-2">
          <p className="text-[0.8rem] font-medium text-ink-soft">Wat kopiëren?</p>
          {(
            [
              { id: 'alleen-leeg' as const, titel: 'Alleen lege cellen vullen', tekst: 'Bestaande eigen prijzen bij de doelwinkel blijven staan.' },
              { id: 'overschrijven' as const, titel: 'Alles overschrijven', tekst: 'Alle prijzen van de bronwinkel gaan over; bestaande doelprijzen verdwijnen.' },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setModus(o.id)}
              className={`flex w-full flex-col rounded-xl px-4 py-3 text-left ring-1 ring-inset transition ${modus === o.id ? 'bg-gold-100/60 ring-gold-400' : 'bg-sand-50 ring-sand-200 hover:ring-gold-300'}`}
            >
              <span className="text-sm font-medium">{o.titel}</span>
              <span className="mt-0.5 text-xs text-ink-muted">{o.tekst}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-muted">
          Bron = jouw eigen prijs bij die winkel, anders de voorbeeldprijs. Geen live prijzen van de bouwmarkt.
        </p>
      </div>
    </Dialog>
  )
}

function BulkDialoog({ open, onClose, eigen }: { open: boolean; onClose: () => void; eigen: EigenPrijzen }) {
  const [winkel, setWinkel] = useState<WinkelId>('gamma')
  const [procent, setProcent] = useState('5')
  const n = useMemo(() => {
    let c = 0
    for (const rij of Object.values(eigen)) if (rij?.[winkel]?.prijs != null) c++
    return c
  }, [eigen, winkel])
  const p = Number(procent.replace(',', '.'))
  const ok = Number.isFinite(p) && p !== 0 && n > 0
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Percentage aanpassen"
      sub="Pas al je eigen prijzen bij één winkel in één keer aan (bijv. +5% of −3%)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            variant="gold"
            icon={<Percent className="h-4 w-4" />}
            disabled={!ok}
            onClick={() => {
              prijsStore.pasPercentage(winkel, p)
              toast(`${n} ${n === 1 ? 'prijs' : 'prijzen'} bij ${winkelNaam(winkel)} ${p > 0 ? '+' : ''}${p}%`)
              onClose()
            }}
          >
            Toepassen
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Winkel</span>
          <select className="h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3 text-[0.92rem] focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none" value={winkel} onChange={(e) => setWinkel(e.target.value as WinkelId)}>
            {WINKELS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.naam}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Percentage</span>
          <div className="relative">
            <input
              inputMode="decimal"
              className="tabnum h-11 w-full rounded-xl border border-sand-300 bg-white/90 pr-10 pl-3.5 text-[0.92rem] focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
              value={procent}
              onChange={(e) => setProcent(e.target.value.replace(/[^\d.,\-]/g, ''))}
              placeholder="5"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-ink-muted">%</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['-5', '-3', '3', '5', '10'].map((v) => (
              <button key={v} type="button" onClick={() => setProcent(v)} className="h-8 rounded-lg bg-sand-100 px-2.5 text-[0.78rem] font-medium text-ink-soft hover:bg-sand-200">
                {Number(v) > 0 ? `+${v}` : v}%
              </button>
            ))}
          </div>
        </label>
        <p className="text-xs text-ink-muted">
          {n === 0 ? `Nog geen eigen prijzen bij ${winkelNaam(winkel)}.` : `Past ${n} ${n === 1 ? 'eigen prijs' : 'eigen prijzen'} aan. Voorbeeldprijzen blijven onaangeroerd.`}
        </p>
      </div>
    </Dialog>
  )
}

function ExportKnop({ eigen, compact = false }: { eigen: EigenPrijzen; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const exporteer = (soort: 'json' | 'csv') => {
    if (soort === 'json') downloadBestand(`maatklaar-prijzen-${vandaagIso()}.json`, naarJson(eigen), 'application/json')
    else downloadBestand(`maatklaar-prijzen-${vandaagIso()}.csv`, naarCsv(eigen, voorbeeldPrijsBron), 'text/csv;charset=utf-8')
    setOpen(false)
    toast(soort === 'json' ? 'Back-up (JSON) gedownload' : 'Prijslijst (CSV) gedownload')
  }
  if (compact)
    return (
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="secondary" icon={<FileJson className="h-3.5 w-3.5" />} onClick={() => exporteer('json')}>
          JSON
        </Button>
        <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => exporteer('csv')}>
          CSV
        </Button>
      </div>
    )
  return (
    <div className="relative">
      <Button size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Exporteren
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-sand-300 bg-paper shadow-lift">
            <button type="button" onClick={() => exporteer('json')} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sand-50">
              <FileJson className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold-600" />
              <span>
                <span className="block text-sm font-medium">JSON-bestand</span>
                <span className="block text-xs text-ink-muted">Back-up of naar ander apparaat</span>
              </span>
            </button>
            <button type="button" onClick={() => exporteer('csv')} className="flex w-full items-start gap-3 border-t border-sand-200 px-4 py-3 text-left hover:bg-sand-50">
              <FileSpreadsheet className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold-600" />
              <span>
                <span className="block text-sm font-medium">CSV voor Excel</span>
                <span className="block text-xs text-ink-muted">Alle artikelen × winkels, bewerkbaar</span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ArtikelRij({ item, eigen, onDetail }: { item: CatalogusItem; eigen: EigenPrijzen; onDetail: (w: WinkelId) => void }) {
  return (
    <li className="px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1.25fr)_repeat(4,minmax(0,1fr))] lg:items-start lg:gap-3">
      <div className="mb-3 min-w-0 lg:mb-0 lg:pt-2">
        <p className="text-[0.92rem] font-semibold text-ink">{item.naam}</p>
        <p className="mt-0.5 text-[0.78rem] text-ink-muted">{eenheidLabel(item)}</p>
        {item.toelichting && <p className="mt-0.5 text-[0.72rem] text-ink-muted">{item.toelichting}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:contents">
        {WINKELS.map((w) => (
          <PrijsCel key={w.id} item={item} winkel={w.id} e={eigen[item.id]?.[w.id]} onDetail={() => onDetail(w.id)} />
        ))}
      </div>
    </li>
  )
}

function PrijsInvoer({
  waarde,
  placeholder,
  onChange,
  disabled,
  label,
  groot = false,
}: {
  waarde: number | null | undefined
  placeholder: string
  onChange: (v: number | null) => void
  disabled?: boolean
  label: string
  groot?: boolean
}) {
  const [tekst, setTekst] = useState(waarde != null ? prijsTekst(waarde) : '')
  const [focus, setFocus] = useState(false)
  const extern = waarde != null ? prijsTekst(waarde) : ''
  if (!focus && tekst !== extern && leesOfNull(tekst) !== (waarde ?? null)) setTekst(extern)
  return (
    <div className="relative">
      <span className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${groot ? 'text-base' : 'text-sm'} ${waarde != null ? 'text-ink-soft' : 'text-ink-muted/70'}`}>€</span>
      <input
        aria-label={label}
        inputMode="decimal"
        disabled={disabled}
        value={disabled ? '' : tekst}
        placeholder={disabled ? 'Niet leverbaar' : placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => {
          setFocus(false)
          const v = leesOfNull(tekst)
          setTekst(v != null ? prijsTekst(v) : '')
        }}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, '').replace(/([.,].*)[.,]/g, '$1')
          setTekst(t)
          onChange(leesOfNull(t))
        }}
        className={`tabnum w-full rounded-xl border bg-white/90 pr-3 pl-7 font-medium text-ink transition placeholder:font-normal placeholder:text-ink-muted/60 focus:border-gold-400 focus:bg-white focus:ring-4 focus:ring-gold-200/50 focus:outline-none disabled:cursor-not-allowed disabled:bg-sand-100 disabled:placeholder:text-ink-muted ${
          groot ? 'h-12 text-base' : 'h-10 text-[0.92rem]'
        } ${waarde != null ? 'border-gold-300' : 'border-sand-300'}`}
      />
    </div>
  )
}

const leesOfNull = (t: string): number | null => (t.trim() === '' ? null : leesGetal(t))
const prijsTekst = (n: number) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

function PrijsCel({ item, winkel, e, onDetail }: { item: CatalogusItem; winkel: WinkelId; e?: EigenPrijs; onDetail: () => void }) {
  const vb = voorbeeldPrijs(item.id, winkel)
  const niet = !!e?.nietLeverbaar
  const isEigen = heeftEigen(e) && !niet
  const afwijkend = isEigen && e?.inhoud != null && item.inhoud && e.inhoud !== item.inhoud.standaard
  return (
    <div className={`min-w-0 rounded-xl p-2.5 ring-1 ring-inset lg:rounded-none lg:p-0 lg:ring-0 ${niet ? 'bg-sand-100 ring-sand-300' : isEigen ? 'bg-gold-100/40 ring-gold-200' : 'bg-sand-50/70 ring-sand-200'} lg:bg-transparent`}>
      <p className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-wider text-ink-muted lg:hidden">{winkelNaam(winkel)}</p>
      <div className="flex gap-1.5">
        <div className="min-w-0 flex-1">
          <PrijsInvoer
            label={`Prijs ${item.naam} bij ${winkelNaam(winkel)}`}
            waarde={e?.prijs}
            placeholder={vb != null ? prijsTekst(vb) : '—'}
            disabled={niet}
            onChange={(v) => prijsStore.zet(item.id, winkel, { prijs: v })}
          />
        </div>
        <button
          type="button"
          onClick={onDetail}
          aria-label={`Details ${item.naam} bij ${winkelNaam(winkel)}`}
          className={`grid h-10 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition hover:ring-gold-400 ${
            e?.productNaam || e?.link || niet || afwijkend ? 'bg-gold-100 text-gold-700 ring-gold-300' : 'bg-white/80 text-ink-muted ring-sand-300'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-1">
        {niet ? (
          <Badge className="!bg-rust/10 !text-rust !ring-rust/20">Niet leverbaar</Badge>
        ) : isEigen ? (
          <>
            <Badge tone="gold">Eigen prijs</Badge>
            <span className="text-[0.68rem] text-ink-muted">{kortDatum(Date.parse(e!.bijgewerkt))}</span>
          </>
        ) : vb != null ? (
          <Badge>Voorbeeldprijs</Badge>
        ) : (
          <span className="text-[0.7rem] text-ink-muted">Geen voorbeeldprijs</span>
        )}
        {e?.link && (
          <a href={e.link} target="_blank" rel="noreferrer" aria-label="Productpagina openen" className="text-gold-600 hover:text-gold-700">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {(e?.productNaam || afwijkend) && (
        <p className="mt-1 truncate text-[0.7rem] text-ink-muted" title={e?.productNaam}>
          {afwijkend ? `${eenheidLabel(item, e?.inhoud)}` : ''}
          {afwijkend && e?.productNaam ? ' · ' : ''}
          {e?.productNaam}
        </p>
      )}
    </div>
  )
}

function PrijsDetails({ item, winkel, eigen, onClose }: { item: CatalogusItem; winkel: WinkelId; eigen: EigenPrijzen; onClose: () => void }) {
  const e = eigen[item.id]?.[winkel]
  const vb = voorbeeldPrijs(item.id, winkel)
  const zet = (w: Partial<Omit<EigenPrijs, 'bijgewerkt'>>) => prijsStore.zet(item.id, winkel, w)
  const linkOk = !!e?.link && /^https?:\/\/\S+\.\S+/.test(e.link)
  const veld = 'h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3.5 text-[0.92rem] placeholder:text-ink-muted/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none'
  return (
    <Dialog
      open
      onClose={onClose}
      title={item.naam}
      sub={`${winkelNaam(winkel)} · ${eenheidLabel(item, heeftEigen(e) ? e?.inhoud : null)}`}
      footer={
        <>
          {e && (
            <Button
              variant="ghost"
              className="sm:mr-auto"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                prijsStore.herstel(item.id, winkel)
                toast('Voorbeeldprijs hersteld')
                onClose()
              }}
            >
              Voorbeeldprijs herstellen
            </Button>
          )}
          <Button onClick={onClose}>Klaar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">Prijs incl. btw</p>
          <PrijsInvoer groot label="Prijs incl. btw" waarde={e?.prijs} placeholder={vb != null ? prijsTekst(vb) : '0,00'} disabled={!!e?.nietLeverbaar} onChange={(v) => zet({ prijs: v })} />
          <p className="mt-1.5 text-xs text-ink-muted">
            {vb != null ? `Voorbeeldprijs ${euro(vb)} (peildatum ${datum(Date.parse(VOORBEELD_PEILDATUM))}).` : 'Geen voorbeeldprijs voor deze winkel.'}{' '}
            {heeftEigen(e) ? `Jouw prijs is bijgewerkt op ${datum(Date.parse(e!.bijgewerkt))}.` : 'Leeg = voorbeeldprijs.'}
          </p>
        </div>

        {item.inhoud && (
          <div>
            <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">Inhoud per {item.inhoud.soort}</p>
            <div className="relative">
              <input
                inputMode="decimal"
                className={`${veld} tabnum pr-12`}
                placeholder={getal(item.inhoud.standaard, 2)}
                defaultValue={e?.inhoud != null ? getal(e.inhoud, 2) : ''}
                onChange={(ev) => zet({ inhoud: ev.target.value.trim() ? leesGetal(ev.target.value) : null })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-ink-muted">{item.inhoud.eenheid}</span>
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              Verkoopt {winkelNaam(winkel)} een andere verpakking (bijv. {getal(item.inhoud.standaard * 0.8, 1)} {item.inhoud.eenheid})? Dan rekent de inkooplijst het
              aantal zelf om. Geldt alleen samen met een eigen prijs.
            </p>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">Productnaam (optioneel)</p>
          <input className={veld} placeholder="Bijv. merk en type" defaultValue={e?.productNaam ?? ''} onChange={(ev) => zet({ productNaam: ev.target.value })} />
        </div>
        <div>
          <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">Link naar product (optioneel)</p>
          <div className="flex gap-2">
            <input className={veld} type="url" inputMode="url" placeholder="https://" defaultValue={e?.link ?? ''} onChange={(ev) => zet({ link: ev.target.value })} />
            {linkOk && (
              <a href={e!.link} target="_blank" rel="noreferrer" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper text-gold-700 ring-1 ring-sand-300 hover:ring-gold-400" aria-label="Link openen">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-sand-50 px-4 py-3 ring-1 ring-sand-200">
          <div>
            <p className="text-sm font-medium">Niet leverbaar bij {winkelNaam(winkel)}</p>
            <p className="text-xs text-ink-muted">Deze winkel telt dan niet mee voor dit artikel.</p>
          </div>
          <Switch label="Niet leverbaar" checked={!!e?.nietLeverbaar} onChange={(v) => zet({ nietLeverbaar: v })} />
        </div>
      </div>
    </Dialog>
  )
}
