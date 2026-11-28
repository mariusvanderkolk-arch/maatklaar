import { useRef, useState } from 'react'
import { Camera, Check, CircleCheck, ClipboardCheck, MessageCircle, Plus, Printer, ReceiptText, RotateCcw, Trash2, TriangleAlert, Undo2, X } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DateField, Dialog, Notice, TextField } from './ui'
import { HandtekeningVeld } from './Handtekening'
import { toast } from './Toast'
import { useBedrijf } from '../lib/bedrijf'
import { uid } from '../lib/defaults'
import { bewaarFoto, useFotoUrl, verkleinFoto } from '../lib/photos'
import { vandaag } from '../lib/planning'
import { ga } from '../lib/router'
import { projectStore } from '../lib/store'
import { openWhatsapp, whatsappUrl } from '../lib/whatsapp'
import { formatDatum, isoDatum } from '../lib/format'
import {
  getekend, nieuweOplevering, nietBekeken, openRestpunten, opleverStand, opleverTekst, restpunten, STAND_TEKST,
  type OpleverHandtekening, type OpleverPunt, type Oplevering, type PuntStatus,
} from '../lib/oplevering'
import type { Project } from '../lib/types'

const lang = (iso: string) => formatDatum({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, isoDatum(iso))
const tijd = (iso: string) => formatDatum({ day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }, new Date(iso))

/** Kaart op het planningscherm: start of open de oplevering. */
export function OpleverKaart({ p }: { p: Project }) {
  const o = p.oplevering
  const stand = opleverStand(o)
  const open = o ? openRestpunten(o).length : 0
  return (
    <Card className="no-print p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.98rem] font-semibold">Oplevering</p>
        {o && <Badge tone={stand === 'afgerond' ? 'sage' : 'gold'}>{STAND_TEKST[stand]}</Badge>}
      </div>
      <p className="mt-1 text-[0.82rem] leading-snug text-ink-muted">
        {o
          ? open
            ? `${open} ${open === 1 ? 'restpunt staat' : 'restpunten staan'} nog open. Vink ze af zodra ze klaar zijn.`
            : 'Loop de klus samen met de klant na en laat het rapport op je telefoon tekenen.'
          : 'Loop de klus samen met de klant na. De checklist staat al klaar met de werkzaamheden uit dit project. Restpunten met foto, allebei tekenen, PDF erbij.'}
      </p>
      <Button className="mt-3 w-full" variant={o ? 'secondary' : 'primary'} icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => ga(`/project/${p.id}/oplevering`)} data-testid="open-oplevering">
        {o ? 'Opleverrapport openen' : 'Oplevering starten'}
      </Button>
    </Card>
  )
}

/** Het opleverrapport: checklist, restpunten met foto, handtekeningen, PDF en WhatsApp-concept. */
export function OpleverScherm({ p }: { p: Project }) {
  const bedrijf = useBedrijf()
  const o = p.oplevering
  const zet = (f: (x: Oplevering) => Oplevering) => {
    const ok = projectStore.werkBij(p.id, (x) => ({ ...x, oplevering: f(x.oplevering ?? nieuweOplevering(x, vandaag(), uid)) }))
    if (!ok) toast('Opslaan mislukt: opslag vol.', 'fout')
  }
  const start = () => zet((x) => x)

  if (!o) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader icon={<ClipboardCheck className="h-5 w-5" />} title="Opleverrapport" sub="Leg vast hoe je het werk achterlaat, zodat er later geen discussie is." />
        <div className="space-y-4 p-5 sm:p-6">
          <ol className="space-y-2.5 text-[0.9rem] leading-relaxed text-ink-soft">
            <li><strong className="text-ink">1. Checklist staat klaar.</strong> De werkzaamheden uit dit project en getekend meerwerk staan er al in.</li>
            <li><strong className="text-ink">2. Per onderdeel: in orde of restpunt.</strong> Bij een restpunt schrijf je wat er nog moet gebeuren, met een foto en een datum.</li>
            <li><strong className="text-ink">3. Allebei tekenen.</strong> Jij en de klant tekenen op hetzelfde scherm. Daarna maak je er een PDF van.</li>
          </ol>
          <Button size="lg" className="w-full" icon={<ClipboardCheck className="h-4 w-4" />} onClick={start} data-testid="start-oplevering">
            Oplevering starten
          </Button>
        </div>
      </Card>
    )
  }

  const stand = opleverStand(o)
  const ondertekend = getekend(o)
  const rest = restpunten(o)
  const nogNaTeLopen = nietBekeken(o).length
  const zetPunt = (id: string, f: (x: OpleverPunt) => OpleverPunt) => zet((x) => ({ ...x, punten: x.punten.map((y) => (y.id === id ? f(y) : y)) }))

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* kop van het rapport (ook op de PDF) */}
      <Card className="print-plain">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-gold-600">Opleverrapport</p>
            <h2 className="mt-1 text-[1.6rem] leading-tight font-semibold">{p.naam || 'Project'}</h2>
            <p className="mt-1 text-[0.88rem] text-ink-muted">
              {[p.klant && `Opdrachtgever: ${p.klant}`, p.adres].filter(Boolean).join(' · ') || 'Geen klant ingevuld'}
            </p>
            <p className="mt-0.5 text-[0.88rem] text-ink-muted">
              Uitgevoerd door {bedrijf.naam || 'de aannemer'}
              {bedrijf.telefoon ? ` · ${bedrijf.telefoon}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            {bedrijf.logo && <img src={bedrijf.logo} alt="" className="max-h-12 max-w-36 object-contain" />}
            <Badge tone={stand === 'afgerond' ? 'sage' : 'gold'}>{STAND_TEKST[stand]}</Badge>
          </div>
        </div>
        <div className="grid gap-4 border-t border-sand-200 p-5 sm:grid-cols-2 sm:p-6">
          <div className="no-print">
            <DateField label="Opleverdatum" value={o.datum} onChange={(v) => v && zet((x) => ({ ...x, datum: v }))} />
          </div>
          <p className="print-only text-[0.95rem]">Opleverdatum: <strong>{lang(o.datum)}</strong></p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Teller label="In orde" waarde={o.punten.filter((x) => x.status === 'goed').length} />
            <Teller label="Restpunten" waarde={rest.length} />
            <Teller label="Nog nalopen" waarde={nogNaTeLopen} />
          </div>
        </div>
      </Card>

      <Card className="print-plain">
        <CardHeader title="Checklist" sub={<span className="no-print">{ondertekend ? 'Het rapport is getekend. Restpunten kun je nog afvinken als ze klaar zijn.' : 'Loop elk onderdeel samen met de klant na.'}</span>} />
        {o.punten.length === 0 && <p className="p-5 text-[0.88rem] text-ink-muted sm:p-6">Nog geen onderdelen. Voeg hieronder toe wat je samen nagelopen hebt.</p>}
        <ul className="divide-y divide-sand-200">
          {o.punten.map((x) => (
            <PuntRij key={x.id} p={p} x={x} vast={ondertekend} zet={(f) => zetPunt(x.id, f)} weg={() => zet((y) => ({ ...y, punten: y.punten.filter((z) => z.id !== x.id) }))} />
          ))}
        </ul>
        {!ondertekend && <NieuwPunt onToevoegen={(onderdeel) => zet((y) => ({ ...y, punten: [...y.punten, { id: uid(), onderdeel, status: 'open' }] }))} />}
      </Card>

      <Card className="print-plain">
        <div className="p-5 sm:p-6">
          <label htmlFor="opl-opmerking" className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Opmerking<span className="no-print"> (optioneel)</span></label>
          <textarea
            id="opl-opmerking"
            className="no-print min-h-20 w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-[0.95rem] outline-none focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 disabled:bg-sand-100"
            value={o.opmerking ?? ''}
            disabled={ondertekend}
            placeholder="Bijv. sleutels teruggegeven, onderhoudsadvies voor de kitnaden gegeven"
            onChange={(e) => zet((x) => ({ ...x, opmerking: e.target.value }))}
          />
          <p className="print-only text-[0.95rem]">{o.opmerking?.trim() || 'Geen opmerkingen.'}</p>
        </div>
      </Card>

      <Handtekeningen p={p} o={o} bedrijfNaam={bedrijf.contactpersoon || bedrijf.naam} nogNaTeLopen={nogNaTeLopen} zet={zet} />

      <Card className="no-print p-5">
        <p className="text-[0.98rem] font-semibold">Rapport delen</p>
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-muted">Maak een PDF via Afdrukken en kies "Opslaan als PDF". WhatsApp opent een conceptbericht met de restpunten; je verstuurt het zelf.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()} data-testid="oplevering-pdf">Afdrukken / PDF</Button>
          <Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />} onClick={() => openWhatsapp(whatsappUrl(opleverTekst(p, o, bedrijf.naam)))} data-testid="oplevering-whatsapp">
            WhatsApp-concept
          </Button>
          <Button variant="secondary" icon={<ReceiptText className="h-4 w-4" />} onClick={() => ga(`/project/${p.id}/offerte`)}>Naar factuur</Button>
        </div>
        {!ondertekend && (
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-ink-muted hover:text-rust"
            onClick={() => confirm('Oplevering opnieuw beginnen? De checklist wordt opnieuw opgebouwd uit de werkzaamheden.') && zet(() => nieuweOplevering(p, vandaag(), uid))}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Opnieuw beginnen
          </button>
        )}
      </Card>
    </div>
  )
}

function Teller({ label, waarde }: { label: string; waarde: number }) {
  return (
    <div className="rounded-xl bg-sand-100 px-2 py-2 ring-1 ring-inset ring-sand-200">
      <p className="tabnum text-[1.35rem] leading-none font-semibold">{waarde}</p>
      <p className="mt-1 text-[0.72rem] font-medium text-ink-muted">{label}</p>
    </div>
  )
}

const STATUS_KNOP: { s: PuntStatus; label: string }[] = [
  { s: 'goed', label: 'In orde' },
  { s: 'restpunt', label: 'Restpunt' },
]

function PuntRij({ p, x, vast, zet, weg }: { p: Project; x: OpleverPunt; vast: boolean; zet: (f: (x: OpleverPunt) => OpleverPunt) => void; weg: () => void }) {
  const fotoInput = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState(false)
  const foto = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    setBezig(true)
    try {
      const blob = await verkleinFoto(f)
      const ref = { id: uid(), naam: `Oplevering: ${x.onderdeel}`, createdAt: Date.now() }
      await bewaarFoto(ref.id, blob)
      projectStore.werkBij(p.id, (y) => ({ ...y, fotos: [...y.fotos, ref] }))
      zet((y) => ({ ...y, fotoId: ref.id }))
      void import('../lib/fotoCloud').then((m) => m.fotoSyncNu())
    } catch {
      toast('De foto kon niet worden opgeslagen.', 'fout')
    } finally {
      setBezig(false)
      if (fotoInput.current) fotoInput.current.value = ''
    }
  }
  const tekst = x.status === 'goed' ? 'In orde' : x.status === 'restpunt' ? (x.afgerondOp ? `Restpunt, afgerond ${lang(x.afgerondOp)}` : 'Restpunt') : 'Nog niet nagelopen'
  return (
    <li className="avoid-break px-5 py-4 sm:px-6" data-testid="opleverpunt">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1 ${x.status === 'goed' || x.afgerondOp ? 'bg-[#e8eee4] text-[#4c6547] ring-[#d3dfcd]' : x.status === 'restpunt' ? 'bg-gold-100 text-gold-700 ring-gold-300' : 'bg-paper text-ink-muted ring-sand-300'}`}>
            {x.status === 'goed' || x.afgerondOp ? <Check className="h-3.5 w-3.5" /> : x.status === 'restpunt' ? <TriangleAlert className="h-3.5 w-3.5" /> : null}
          </span>
          <div className="min-w-0">
            <p className="text-[0.95rem] font-medium break-words">{x.onderdeel}</p>
            <p className="print-only text-[0.85rem] text-ink-muted">{tekst}</p>
          </div>
        </div>
        {!vast ? (
          <div className="no-print flex shrink-0 items-center gap-1.5">
            <div className="inline-flex rounded-xl bg-sand-100 p-1 ring-1 ring-inset ring-sand-200" role="radiogroup" aria-label={`Status ${x.onderdeel}`}>
              {STATUS_KNOP.map((k) => (
                <button
                  key={k.s}
                  type="button"
                  role="radio"
                  aria-checked={x.status === k.s}
                  onClick={() => zet((y) => ({ ...y, status: y.status === k.s ? 'open' : k.s }))}
                  className={`h-10 rounded-lg px-3.5 text-[0.85rem] font-medium transition sm:h-9 ${x.status === k.s ? (k.s === 'goed' ? 'bg-[#4c6547] text-white' : 'bg-gold-500 text-ink') : 'text-ink-soft hover:text-ink'}`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <button type="button" aria-label={`${x.onderdeel} verwijderen`} onClick={weg} className="grid h-10 w-10 place-items-center rounded-lg text-ink-muted hover:bg-rust/10 hover:text-rust sm:h-9 sm:w-9">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="no-print shrink-0 text-[0.82rem] font-medium text-ink-muted">{tekst}</span>
        )}
      </div>

      {x.status === 'restpunt' && (
        <div className="mt-3 space-y-3 rounded-xl bg-gold-100/40 p-3.5 ring-1 ring-inset ring-gold-200 sm:ml-8.5">
          {!vast ? (
            <div className="no-print grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <TextField label="Wat moet er nog gebeuren?" value={x.notitie ?? ''} onChange={(v) => zet((y) => ({ ...y, notitie: v }))} placeholder="Bijv. kitnaad bij de douchebak opnieuw" />
              <DateField label="Uiterlijk klaar" value={x.uiterlijk ?? ''} onChange={(v) => zet((y) => ({ ...y, uiterlijk: v || undefined }))} />
            </div>
          ) : (
            <p className="no-print text-[0.88rem]">{x.notitie?.trim() || 'Geen omschrijving'}{x.uiterlijk ? ` · uiterlijk ${lang(x.uiterlijk)}` : ''}</p>
          )}
          <p className="print-only text-[0.9rem]">{x.notitie?.trim() || 'Geen omschrijving'}{x.uiterlijk ? ` · uiterlijk ${lang(x.uiterlijk)}` : ''}</p>
          <div className="flex flex-wrap items-center gap-2">
            {x.fotoId && <PuntFoto id={x.fotoId} />}
            <input ref={fotoInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void foto(e.target.files)} />
            <Button variant="secondary" size="sm" className="no-print" icon={<Camera className="h-3.5 w-3.5" />} disabled={bezig} onClick={() => fotoInput.current?.click()}>
              {x.fotoId ? 'Andere foto' : 'Foto erbij'}
            </Button>
            {vast &&
              (x.afgerondOp ? (
                <Button variant="ghost" size="sm" className="no-print" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => zet((y) => ({ ...y, afgerondOp: undefined }))}>
                  Toch nog open
                </Button>
              ) : (
                <Button size="sm" className="no-print" icon={<CircleCheck className="h-3.5 w-3.5" />} onClick={() => zet((y) => ({ ...y, afgerondOp: vandaag() }))} data-testid="restpunt-afvinken">
                  Afgerond
                </Button>
              ))}
          </div>
        </div>
      )}
    </li>
  )
}

function PuntFoto({ id }: { id: string }) {
  const url = useFotoUrl(id)
  if (!url) return null
  return <img src={url} alt="Foto van het restpunt" className="h-24 w-32 rounded-lg object-cover ring-1 ring-sand-300 print:h-40 print:w-56" />
}

function NieuwPunt({ onToevoegen }: { onToevoegen: (s: string) => void }) {
  const [t, setT] = useState('')
  const voeg = () => {
    if (!t.trim()) return
    onToevoegen(t.trim())
    setT('')
  }
  return (
    <form
      className="no-print flex items-end gap-2 border-t border-sand-200 px-5 py-4 sm:px-6"
      onSubmit={(e) => {
        e.preventDefault()
        voeg()
      }}
    >
      <div className="min-w-0 flex-1">
        <TextField label="Onderdeel toevoegen" value={t} onChange={setT} placeholder="Bijv. Deur badkamer afgesteld" />
      </div>
      <Button type="submit" variant="secondary" icon={<Plus className="h-4 w-4" />} disabled={!t.trim()}>
        Toevoegen
      </Button>
    </form>
  )
}

function Handtekeningen({ p, o, bedrijfNaam, nogNaTeLopen, zet }: { p: Project; o: Oplevering; bedrijfNaam: string; nogNaTeLopen: number; zet: (f: (x: Oplevering) => Oplevering) => void }) {
  const [wie, setWie] = useState<'aannemer' | 'klant' | null>(null)
  const [naam, setNaam] = useState('')
  const [png, setPng] = useState<string | null>(null)
  const open = (w: 'aannemer' | 'klant') => {
    setWie(w)
    setNaam(w === 'aannemer' ? bedrijfNaam : p.klant)
    setPng(null)
  }
  const bewaar = () => {
    if (!wie || !png || !naam.trim()) return
    const h: OpleverHandtekening = { naam: naam.trim(), handtekening: png, op: new Date().toISOString() }
    zet((x) => ({ ...x, [wie]: h }))
    setWie(null)
  }
  const blok = (w: 'aannemer' | 'klant', titel: string) => {
    const h = o[w]
    return (
      <div className="avoid-break min-w-0 rounded-xl p-4 ring-1 ring-sand-200">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{titel}</p>
        {h ? (
          <>
            <img src={h.handtekening} alt={`Handtekening ${h.naam}`} className="mt-2 h-20 w-full object-contain object-left" />
            <p className="mt-1 text-[0.9rem] font-medium">{h.naam}</p>
            <p className="text-[0.78rem] text-ink-muted">{tijd(h.op)}</p>
            {!getekend(o) && (
              <button type="button" className="no-print mt-1.5 inline-flex items-center gap-1 text-[0.78rem] font-medium text-ink-muted hover:text-rust" onClick={() => zet((x) => ({ ...x, [w]: undefined }))}>
                <X className="h-3.5 w-3.5" /> Wissen
              </button>
            )}
          </>
        ) : (
          <>
            <div className="print-only mt-10 border-b border-sand-400" />
            <Button className="no-print mt-3 w-full" variant="secondary" onClick={() => open(w)} data-testid={`teken-${w}`}>
              Laat tekenen
            </Button>
          </>
        )}
      </div>
    )
  }
  return (
    <Card className="print-plain">
      <CardHeader title="Handtekeningen" sub="Met tekenen bevestigen jullie de staat van het werk op de opleverdatum, inclusief de restpunten hierboven." />
      <div className="space-y-4 p-5 sm:p-6">
        {nogNaTeLopen > 0 && !getekend(o) && (
          <Notice className="no-print" title={`Nog ${nogNaTeLopen} ${nogNaTeLopen === 1 ? 'onderdeel' : 'onderdelen'} niet nagelopen`}>
            Kies bij elk onderdeel "In orde" of "Restpunt" voordat jullie tekenen.
          </Notice>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {blok('aannemer', 'Aannemer')}
          {blok('klant', 'Opdrachtgever')}
        </div>
      </div>
      <Dialog open={wie !== null} onClose={() => setWie(null)} title={wie === 'klant' ? 'Handtekening opdrachtgever' : 'Handtekening aannemer'}>
        <div className="space-y-4">
          <TextField label="Naam" value={naam} onChange={setNaam} placeholder="Voor- en achternaam" />
          <HandtekeningVeld onChange={setPng} />
          <Button className="w-full" disabled={!png || !naam.trim()} onClick={bewaar} data-testid="handtekening-bewaren">
            Handtekening bewaren
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
