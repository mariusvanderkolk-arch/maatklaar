import { veiligeUrl } from '../lib/veiligeUrl'
import { EigenArtikelDialoog } from '../components/Artikelen'
import { eigenArtikelStore, useEigenArtikelen, type EigenArtikel } from '../lib/eigenArtikelen'
import { combineerArtikelen } from '../lib/backup'
import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, Archive, Download, ExternalLink, FileJson, FileSpreadsheet, Percent, Plus, RotateCcw, Search, Sparkles, SlidersHorizontal, Upload, X } from 'lucide-react'
import { Badge, Button, Card, Dialog, LeegStaat, Notice, PageTitle } from '../components/ui'
import { GROEP_ICONS } from '../components/groepIcons'
import { toast } from '../components/Toast'
import { GROEPEN, type Groep, type ProductId } from '../lib/calc'
import { CATALOGUS, eenheidLabel, type CatalogusItem } from '../lib/catalogus'
import { downloadBestand, vandaagIso } from '../lib/download'
import { importeerPrijzen, laatstBijgewerkt, leveranciers, naarCsv, naarJson, telEigenPrijzen, type EigenPrijs, type EigenPrijzen, type ImportResultaat } from '../lib/eigenPrijzen'
import { datum, euro, getal, kortDatum, leesGetal } from '../lib/format'
import { VOORBEELD_PEILDATUM, VOORBEELD_PRIJZEN, prijsEenheid, voorbeeldPrijsBron, type OudeWinkelId } from '../lib/prices'
import { omzetMelding, omzetMeldingGelezen, oudePrijzen, prijsStore, useEigenPrijzen } from '../lib/prijsStore'

type Filter = 'alle' | 'eigen' | 'voorbeeld'

const vbPrijs = (p: ProductId): number | undefined => VOORBEELD_PRIJZEN[p]
const heeftEigen = (e?: EigenPrijs) => e?.prijs != null
const TOTAAL = CATALOGUS.filter((c) => !c.oud).length

export function Prices({ terugNaar }: { terugNaar?: string }) {
  const eigen = useEigenPrijzen()
  const [zoek, setZoek] = useState('')
  const [filter, setFilter] = useState<Filter>('alle')
  const [groepFilter, setGroepFilter] = useState<Groep | 'alle'>('alle')
  const [detail, setDetail] = useState<CatalogusItem>()
  const eigenArt = useEigenArtikelen()
  const [artDialoog, setArtDialoog] = useState<{ artikel?: EigenArtikel; groep?: Groep }>()
  const [bevestig, setBevestig] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [toonLev, setToonLev] = useState(() => leveranciers(eigen).length > 0)
  const [melding, setMelding] = useState(() => omzetMelding())
  const [oudImport, setOudImport] = useState<{ tekst: string; naam: string; res: ImportResultaat }>()
  const bestand = useRef<HTMLInputElement>(null)

  const aantalEigen = telEigenPrijzen(eigen)
  const laatst = laatstBijgewerkt(eigen)
  const leeg = aantalEigen === 0
  const backup = useMemo(() => oudePrijzen(), [])

  const telling = useMemo(() => ({ alle: TOTAAL, eigen: aantalEigen, voorbeeld: CATALOGUS.filter((i) => !i.oud && !heeftEigen(eigen[i.id])).length }), [eigen, aantalEigen])

  const groepen = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return GROEPEN.map((g) => ({
      ...g,
      items: CATALOGUS.filter((item) => {
        if (item.groep !== g.id) return false
        if (groepFilter !== 'alle' && item.groep !== groepFilter) return false
        const e = eigen[item.id]
        if (item.oud && !heeftEigen(e)) return false
        if (filter === 'eigen' && !heeftEigen(e)) return false
        if (filter === 'voorbeeld' && heeftEigen(e)) return false
        if (!q) return true
        return `${item.naam} ${g.naam} ${e?.productNaam ?? ''} ${e?.leverancier ?? ''}`.toLowerCase().includes(q)
      }),
    })).filter((g) => g.items.length)
  }, [zoek, filter, groepFilter, eigen])

  function verwerk(res: ImportResultaat, naam: string) {
    prijsStore.importeer(res.prijzen)
    const n = telEigenPrijzen(res.prijzen)
    const a = res.artikelen?.length ?? 0
    if (a) eigenArtikelStore.vervang(combineerArtikelen(eigenArtikelStore.alle(), res.artikelen, 'samenvoegen'))
    toast(`${n} ${n === 1 ? 'prijs' : 'prijzen'}${a ? ` en ${a} eigen ${a === 1 ? 'artikel' : 'artikelen'}` : ''} geïmporteerd uit ${naam}`)
  }

  async function importeer(file?: File) {
    if (!file) return
    try {
      const tekst = await file.text()
      const res = importeerPrijzen(tekst, voorbeeldPrijsBron)
      // Oud bestand met prijzen van meerdere winkels: laat kiezen welke winkel de prijslijst wordt.
      if (res.oud && res.oud.winkels.length > 1) setOudImport({ tekst, naam: file.name, res })
      else verwerk(res, file.name)
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
    toast(erbij > 0 ? `${erbij} ${erbij === 1 ? 'voorbeeldprijs' : 'voorbeeldprijzen'} overgenomen – pas ze aan naar jouw inkoop` : 'Alle artikelen hadden al een eigen prijs')
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'alle', label: 'Alle' },
    { id: 'eigen', label: 'Eigen prijzen' },
    { id: 'voorbeeld', label: 'Nog voorbeeld' },
  ]

  return (
    <div className="bg-grain">
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        {terugNaar && (
          <a href={`#/project/${terugNaar}/inkoop`} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Terug naar inkooplijst
          </a>
        )}
        <PageTitle
          eyebrow="Instellingen"
          title="Mijn prijslijst"
          sub="Eén prijs per artikel: jouw eigen inkoopprijs (incl. btw), met desgewenst de leverancier erbij. Deze prijzen gebruikt Maatklaar in de inkooplijst en de offerte."
        />

        {melding && (
          <Notice
            className="mt-6"
            tone="sage"
            title="Je prijzen zijn omgezet naar één prijslijst"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  omzetMeldingGelezen()
                  setMelding(null)
                }}
              >
                Begrepen
              </Button>
            }
          >
            Maatklaar vergelijkt geen winkels meer. We hebben je prijzen van <b>{melding.winkel}</b> overgenomen ({melding.uitHoofd} artikelen)
            {melding.uitAndere ? `, en voor ${melding.uitAndere} artikel${melding.uitAndere > 1 ? 'en' : ''} zonder prijs daar de prijs van een andere winkel` : ''}. De
            winkelnaam staat nu als leverancier. Je oude prijzen per winkel zijn bewaard{backup ? ' en kun je hieronder downloaden' : ''}.
          </Notice>
        )}

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
                    Neem de {TOTAAL} voorbeeldprijzen over als startpunt en pas daarna aan wat bij jou anders is. Het zijn voorbeeldprijzen, geen actuele
                    winkelprijzen — jouw cijfers blijven op dit apparaat.
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

        <Card className={`overflow-hidden ${leeg ? 'mt-4' : 'mt-7'}`}>
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">Eigen prijzen</p>
                  <p className="tabnum mt-1 font-display text-[2.2rem] leading-none font-semibold">
                    {aantalEigen}
                    <span className="ml-1.5 font-sans text-sm font-medium text-ink-muted">van {TOTAAL} artikelen</span>
                  </p>
                </div>
                <div className="min-w-0 pb-1 text-sm text-ink-soft">
                  {laatst ? (
                    <>
                      Laatst bijgewerkt op <span className="font-medium text-ink">{datum(Date.parse(laatst))}</span>
                    </>
                  ) : (
                    <>Nog geen eigen prijzen: alles is voorbeeldprijs (fictief, peildatum {datum(Date.parse(VOORBEELD_PEILDATUM))}).</>
                  )}
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand-200">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all" style={{ width: `${(aantalEigen / TOTAAL) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-sand-200 bg-sand-50/70 px-5 py-4 sm:px-6 lg:border-t-0 lg:border-l">
              {!leeg && (
                <Button size="sm" variant="secondary" icon={<Percent className="h-3.5 w-3.5" />} onClick={() => setBulkOpen(true)}>
                  % aanpassen
                </Button>
              )}
              {!leeg && aantalEigen < TOTAAL && (
                <Button size="sm" variant="ghost" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={overnemen} title="Vult alleen artikelen zonder eigen prijs met de voorbeeldprijs">
                  Voorbeelden bijvullen
                </Button>
              )}
              <ExportKnop eigen={eigen} />
              <Button size="sm" variant="secondary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => bestand.current?.click()}>
                Importeren
              </Button>
              <input ref={bestand} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" data-testid="prijzen-import" onChange={(e) => importeer(e.target.files?.[0])} />
              {backup && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Archive className="h-3.5 w-3.5" />}
                  title="Je prijzen per winkel van vóór de omzetting"
                  onClick={() => downloadBestand(`maatklaar-oude-prijzen-per-winkel-${vandaagIso()}.json`, JSON.stringify({ app: 'slimmer-wonen', type: 'prijzen', versie: 1, prijzen: backup }, null, 2), 'application/json')}
                >
                  Oude prijzen per winkel
                </Button>
              )}
              <Button size="sm" variant="danger" icon={<RotateCcw className="h-3.5 w-3.5" />} disabled={!Object.keys(eigen).length} onClick={() => setBevestig(true)}>
                Terugzetten
              </Button>
            </div>
          </div>
        </Card>

        {/* zoeken en filters */}
        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek artikel, productnaam of leverancier…"
              aria-label="Zoek in prijslijst"
              className="h-12 w-full rounded-2xl border border-sand-300 bg-white/90 pr-10 pl-10 text-[0.95rem] placeholder:text-ink-muted/70 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none"
            />
            {zoek && (
              <button type="button" aria-label="Zoekopdracht wissen" onClick={() => setZoek('')} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:bg-sand-100">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-1.5">
              {filters.map((f) => (
                <Chip key={f.id} aan={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label} <span className="tabnum ml-1 opacity-70">{telling[f.id]}</span>
                </Chip>
              ))}
              <span className="mx-1.5 h-5 w-px bg-sand-300" />
              <label className="inline-flex h-8 items-center gap-2 rounded-full bg-white/70 px-3 text-[0.8rem] font-medium text-ink-soft ring-1 ring-sand-300 ring-inset">
                <input type="checkbox" className="accent-gold-600" checked={toonLev} onChange={(e) => setToonLev(e.target.checked)} /> Leverancier
              </label>
            </div>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-1.5">
              <Chip aan={groepFilter === 'alle'} onClick={() => setGroepFilter('alle')}>
                Alle categorieën
              </Chip>
              {GROEPEN.filter((g) => CATALOGUS.some((i) => i.groep === g.id)).map((g) => {
                const Icon = GROEP_ICONS[g.id]
                return (
                  <Chip key={g.id} aan={groepFilter === g.id} onClick={() => setGroepFilter(g.id)}>
                    <Icon className="mr-1 h-3.5 w-3.5" /> {g.naam}
                  </Chip>
                )
              })}
            </div>
          </div>
        </div>

        <Card className="mt-4 overflow-hidden">
          {groepen.length === 0 ? (
            <LeegStaat icon={<Search className="h-5 w-5" />} titel="Niets gevonden" tekst="Pas je zoekopdracht of filter aan." />
          ) : (
            <div className="divide-y divide-sand-200">
              {groepen.map((g) => {
                const Icon = GROEP_ICONS[g.id]
                return (
                  <section key={g.id}>
                    <h2 className="flex items-center gap-2 bg-sand-50/80 px-5 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-gold-700 sm:px-6">
                      <Icon className="h-3.5 w-3.5" /> {g.naam}
                      <span className="ml-auto font-medium tracking-normal normal-case text-ink-muted">
                        {g.items.filter((i) => heeftEigen(eigen[i.id])).length}/{g.items.length} eigen
                      </span>
                    </h2>
                    <ul className="divide-y divide-sand-100">
                      {g.items.map((item) => (
                        <PrijsRij key={item.id} item={item} e={eigen[item.id]} toonLev={toonLev} onDetail={() => setDetail(item)} />
                      ))}
                      {eigenArt
                        .filter((a) => a.groep === g.id && (!zoek.trim() || `${a.naam} ${a.leverancier ?? ''}`.toLowerCase().includes(zoek.trim().toLowerCase())))
                        .map((a) => (
                          <li key={a.id}>
                            <button type="button" onClick={() => setArtDialoog({ artikel: a })} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-sand-50 sm:px-6">
                              <span className="min-w-0 flex-1">
                                <span className="block text-[0.9rem] font-medium text-ink">{a.naam} <Badge tone="gold">Eigen artikel</Badge></span>
                                <span className="block text-[0.75rem] text-ink-muted">{a.eenheid}{a.leverancier ? ` · ${a.leverancier}` : ''}</span>
                              </span>
                              <span className="tabnum text-[0.9rem] font-semibold text-ink">{a.prijs != null ? euro(a.prijs) : '—'}</span>
                            </button>
                          </li>
                        ))}
                    </ul>
                    <div className="px-5 pb-3 sm:px-6">
                      <button type="button" onClick={() => setArtDialoog({ groep: g.id })} className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-gold-700 hover:text-gold-800">
                        <Plus className="h-3.5 w-3.5" /> Eigen artikel in {g.naam.toLowerCase()}
                      </button>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </Card>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Arbeid reken je met je uurtarief per project (stap Offerte); de uren per onderdeel berekent Maatklaar uit de maten. Onvoorzien stel je per offerte in als
          percentage.
        </p>
      </div>

      <datalist id="maatklaar-leveranciers">
        {leveranciers(eigen).map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      {artDialoog && <EigenArtikelDialoog artikel={artDialoog.artikel} groep={artDialoog.groep} onClose={() => setArtDialoog(undefined)} />}
      {detail && <PrijsDetails item={detail} eigen={eigen} onClose={() => setDetail(undefined)} />}
      {bulkOpen && <BulkDialog eigen={eigen} onClose={() => setBulkOpen(false)} />}
      {oudImport && (
        <OudeWinkelKeuze
          res={oudImport.res}
          onKies={(w) => {
            try {
              verwerk(importeerPrijzen(oudImport.tekst, voorbeeldPrijsBron, w), oudImport.naam)
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Importeren is mislukt.', 'fout')
            }
            setOudImport(undefined)
          }}
          onClose={() => setOudImport(undefined)}
        />
      )}
      <Dialog
        open={bevestig}
        onClose={() => setBevestig(false)}
        title="Alle eigen prijzen wissen?"
        sub="Alle artikelen gaan terug naar de voorbeeldprijs. Exporteer eerst als je ze wilt bewaren."
        footer={
          <>
            <Button variant="ghost" onClick={() => setBevestig(false)}>
              Annuleren
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                prijsStore.allesTerug()
                setBevestig(false)
                toast('Prijslijst teruggezet naar voorbeeldprijzen')
              }}
            >
              Alles wissen
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Dit kan niet ongedaan worden gemaakt.</p>
      </Dialog>
    </div>
  )
}

function Chip({ aan, onClick, children }: { aan: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={aan}
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-full px-3 text-[0.8rem] font-medium ring-1 ring-inset transition ${
        aan ? 'bg-ink text-sand-50 ring-ink' : 'bg-white/70 text-ink-soft ring-sand-300 hover:ring-gold-400'
      }`}
    >
      {children}
    </button>
  )
}

function ExportKnop({ eigen }: { eigen: EigenPrijzen }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
        Exporteren
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Prijslijst exporteren"
        sub="CSV opent direct in Excel; JSON is een volledige back-up om terug te zetten."
        footer={
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Sluiten
          </Button>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Button
            variant="secondary"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={() => {
              downloadBestand(`maatklaar-prijslijst-${vandaagIso()}.csv`, naarCsv(eigen, voorbeeldPrijsBron, eigenArtikelStore.alle()), 'text/csv;charset=utf-8')
              setOpen(false)
            }}
          >
            CSV (Excel)
          </Button>
          <Button
            variant="secondary"
            icon={<FileJson className="h-4 w-4" />}
            onClick={() => {
              downloadBestand(`maatklaar-prijslijst-${vandaagIso()}.json`, naarJson(eigen, new Date(), eigenArtikelStore.alle()), 'application/json')
              setOpen(false)
            }}
          >
            JSON (back-up)
          </Button>
        </div>
      </Dialog>
    </>
  )
}

function PrijsRij({ item, e, toonLev, onDetail }: { item: CatalogusItem; e?: EigenPrijs; toonLev: boolean; onDetail: () => void }) {
  const vb = vbPrijs(item.id)
  const isEigen = heeftEigen(e)
  const afwijkend = isEigen && e?.inhoud != null && item.inhoud && e.inhoud !== item.inhoud.standaard
  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-3 sm:px-6 ${toonLev ? 'md:grid-cols-[minmax(0,1fr)_200px_150px_auto]' : 'md:grid-cols-[minmax(0,1fr)_150px_auto]'}`}>
      <div className="min-w-0">
        <p className="text-[0.92rem] font-semibold text-ink">
          {item.naam}
          {veiligeUrl(e?.link) && (
            <a href={veiligeUrl(e?.link)} target="_blank" rel="noreferrer" aria-label="Productpagina openen" className="ml-1.5 inline-flex translate-y-0.5 text-gold-600 hover:text-gold-700">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[0.76rem] text-ink-muted">
          <span>{eenheidLabel(item, afwijkend ? e?.inhoud : null)}</span>
          {e?.productNaam && <span className="truncate">· {e.productNaam}</span>}
          {isEigen ? (
            <span className="text-gold-700">· eigen prijs {kortDatum(Date.parse(e!.bijgewerkt))}</span>
          ) : vb != null ? (
            <span>· voorbeeld {euro(vb)} (fictief)</span>
          ) : null}
        </p>
      </div>
      {toonLev && (
        <input
          aria-label={`Leverancier ${item.naam}`}
          defaultValue={e?.leverancier ?? ''}
          key={e?.leverancier ?? ''}
          placeholder="Leverancier"
          list="maatklaar-leveranciers"
          onBlur={(ev) => ev.target.value.trim() !== (e?.leverancier ?? '') && prijsStore.zet(item.id, { leverancier: ev.target.value })}
          className="order-3 col-span-2 h-10 w-full rounded-xl border border-sand-300 bg-white/90 px-3 text-[0.88rem] placeholder:text-ink-muted/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none md:order-none md:col-span-1"
        />
      )}
      <div className="flex items-center gap-1.5">
        <div className="w-[130px]">
          <PrijsInvoer label={`Prijs ${item.naam}`} waarde={e?.prijs} placeholder={vb != null ? prijsTekst(vb) : '—'} onChange={(v) => prijsStore.zet(item.id, { prijs: v })} />
        </div>
        <span className="hidden w-6 text-[0.75rem] text-ink-muted md:inline">/{prijsEenheid(item.id)}</span>
      </div>
      <button
        type="button"
        onClick={onDetail}
        aria-label={`Details ${item.naam}`}
        className={`hidden h-10 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition hover:ring-gold-400 md:grid ${
          e?.productNaam || e?.link || afwijkend ? 'bg-gold-100 text-gold-700 ring-gold-300' : 'bg-white/80 text-ink-muted ring-sand-300'
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDetail} className="col-span-2 -mt-1 justify-self-start text-[0.75rem] font-medium text-gold-700 md:hidden">
        Details (inhoud, productnaam, link)
      </button>
    </li>
  )
}

function PrijsInvoer({ waarde, placeholder, onChange, label, groot = false }: { waarde: number | null | undefined; placeholder: string; onChange: (v: number | null) => void; label: string; groot?: boolean }) {
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
        value={tekst}
        placeholder={placeholder}
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
        className={`tabnum w-full rounded-xl border bg-white/90 pr-3 pl-7 font-medium text-ink transition placeholder:font-normal placeholder:text-ink-muted/60 focus:border-gold-400 focus:bg-white focus:ring-4 focus:ring-gold-200/50 focus:outline-none ${
          groot ? 'h-12 text-base' : 'h-10 text-[0.92rem]'
        } ${waarde != null ? 'border-gold-300 bg-gold-50/40' : 'border-sand-300'}`}
      />
    </div>
  )
}

const leesOfNull = (t: string): number | null => (t.trim() === '' ? null : leesGetal(t))
const prijsTekst = (n: number) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

function PrijsDetails({ item, eigen, onClose }: { item: CatalogusItem; eigen: EigenPrijzen; onClose: () => void }) {
  const e = eigen[item.id]
  const vb = vbPrijs(item.id)
  const zet = (w: Partial<Omit<EigenPrijs, 'bijgewerkt'>>) => prijsStore.zet(item.id, w)
  const linkOk = !!e?.link && /^https?:\/\/\S+\.\S+/.test(e.link)
  const veld = 'h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3.5 text-[0.92rem] placeholder:text-ink-muted/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 focus:outline-none'
  return (
    <Dialog
      open
      onClose={onClose}
      title={item.naam}
      sub={eenheidLabel(item, heeftEigen(e) ? e?.inhoud : null)}
      footer={
        <>
          {e && (
            <Button
              variant="ghost"
              className="sm:mr-auto"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                prijsStore.herstel(item.id)
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
          <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">Prijs incl. btw (per {prijsEenheid(item.id)})</p>
          <PrijsInvoer groot label="Prijs incl. btw" waarde={e?.prijs} placeholder={vb != null ? prijsTekst(vb) : '0,00'} onChange={(v) => zet({ prijs: v })} />
          <p className="mt-1.5 text-xs text-ink-muted">
            {vb != null ? `Voorbeeldprijs ${euro(vb)} (fictief, peildatum ${datum(Date.parse(VOORBEELD_PEILDATUM))}).` : 'Geen voorbeeldprijs.'}{' '}
            {heeftEigen(e) ? `Jouw prijs is bijgewerkt op ${datum(Date.parse(e!.bijgewerkt))}.` : 'Leeg = voorbeeldprijs.'}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">Leverancier (optioneel)</p>
          <input className={veld} list="maatklaar-leveranciers" placeholder="Bijv. Bouwvoordeel Barneveld" defaultValue={e?.leverancier ?? ''} onChange={(ev) => zet({ leverancier: ev.target.value })} />
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
            <p className="mt-1.5 text-xs text-ink-muted">Koop je een andere verpakking? Dan rekent de inkooplijst het aantal zelf om. Geldt samen met een eigen prijs.</p>
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
              <a href={veiligeUrl(e!.link)} target="_blank" rel="noreferrer" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper text-gold-700 ring-1 ring-sand-300 hover:ring-gold-400" aria-label="Link openen">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

function BulkDialog({ eigen, onClose }: { eigen: EigenPrijzen; onClose: () => void }) {
  const [procent, setProcent] = useState('')
  const [groep, setGroep] = useState<string>('')
  const [lev, setLev] = useState<string>('')
  const p = leesOfNull(procent.replace('-', '')) ?? 0
  const pct = procent.trim().startsWith('-') ? -p : p
  const levs = leveranciers(eigen)
  const sel = 'h-11 w-full rounded-xl border border-sand-300 bg-white/90 px-3 text-[0.92rem] focus:border-gold-400 focus:outline-none'
  return (
    <Dialog
      open
      onClose={onClose}
      title="Prijzen in één keer aanpassen"
      sub="Bijv. +5 voor een prijsstijging of -10 voor je vaste korting. Alleen eigen prijzen veranderen."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            disabled={!pct}
            onClick={() => {
              prijsStore.pasPercentage(pct, { groep: groep || undefined, leverancier: lev || undefined })
              toast(`Prijzen ${pct > 0 ? 'verhoogd' : 'verlaagd'} met ${getal(Math.abs(pct), 1)}%`)
              onClose()
            }}
          >
            Toepassen
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Percentage</span>
          <input inputMode="decimal" aria-label="Percentage" className={sel} placeholder="+5 of -10" value={procent} onChange={(e) => setProcent(e.target.value.replace(/[^\d.,+-]/g, ''))} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Categorie</span>
          <select className={sel} value={groep} onChange={(e) => setGroep(e.target.value)}>
            <option value="">Alle categorieën</option>
            {GROEPEN.map((g) => (
              <option key={g.id} value={g.id}>
                {g.naam}
              </option>
            ))}
          </select>
        </label>
        {levs.length > 0 && (
          <label className="block">
            <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Leverancier</span>
            <select className={sel} value={lev} onChange={(e) => setLev(e.target.value)}>
              <option value="">Alle leveranciers</option>
              {levs.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </Dialog>
  )
}

function OudeWinkelKeuze({ res, onKies, onClose }: { res: ImportResultaat; onKies: (w: OudeWinkelId) => void; onClose: () => void }) {
  const o = res.oud!
  return (
    <Dialog open onClose={onClose} title="Oud bestand met prijzen per winkel" sub="Maatklaar werkt nu met één prijslijst. Welke winkel wil je als basis gebruiken? Lege artikelen vullen we aan uit de andere winkels.">
      <div className="space-y-2">
        {o.winkels.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onKies(w.id)}
            className="flex w-full items-center justify-between rounded-xl bg-white/80 px-4 py-3 text-left ring-1 ring-sand-300 transition hover:ring-gold-400"
          >
            <span className="font-medium">{w.naam}</span>
            <span className="flex items-center gap-2 text-sm text-ink-muted">
              {w.aantal} prijzen {w.id === o.gekozen && <Badge tone="gold">meest ingevuld</Badge>}
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
