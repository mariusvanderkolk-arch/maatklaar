import { useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Badge, Button, Dialog, NumberField, SelectField, TextField } from './ui'
import { toast } from './Toast'
import { GROEPEN, type Groep } from '../lib/calc'
import { CATALOGUS, eenheidLabel } from '../lib/catalogus'
import { eigenArtikelStore, useEigenArtikelen, type EigenArtikel } from '../lib/eigenArtikelen'
import { useEigenPrijzen, usePrijsBron } from '../lib/prijsStore'
import { euro } from '../lib/format'
import { projectStore } from '../lib/store'
import type { Project } from '../lib/types'

const groepOpties = GROEPEN.map((g) => ({ value: g.id, label: g.naam }))
const getal = (s: string) => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'))
  return s.trim() && Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Eigen artikel aanmaken of bewerken (naam, eenheid, prijs, leverancier, categorie). */
export function EigenArtikelDialoog({ artikel, groep, onClose, onOpgeslagen }: { artikel?: EigenArtikel; groep?: Groep; onClose: () => void; onOpgeslagen?: (a: EigenArtikel) => void }) {
  const [naam, setNaam] = useState(artikel?.naam ?? '')
  const [eenheid, setEenheid] = useState(artikel?.eenheid ?? 'per stuk')
  const [prijs, setPrijs] = useState(artikel?.prijs != null ? String(artikel.prijs).replace('.', ',') : '')
  const [lev, setLev] = useState(artikel?.leverancier ?? '')
  const [g, setG] = useState<Groep>(artikel?.groep ?? groep ?? 'afwerking')
  const ok = naam.trim().length > 1 && (prijs.trim() === '' || getal(prijs) != null)
  const opslaan = () => {
    const velden = { naam: naam.trim(), eenheid: eenheid.trim() || 'per stuk', prijs: getal(prijs), leverancier: lev.trim() || undefined, groep: g }
    if (artikel) eigenArtikelStore.werkBij(artikel.id, velden)
    const a = artikel ? { ...artikel, ...velden } : eigenArtikelStore.voegToe(velden)
    toast(artikel ? 'Artikel bijgewerkt' : 'Eigen artikel toegevoegd')
    onOpgeslagen?.(a)
    onClose()
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={artikel ? 'Eigen artikel' : 'Nieuw eigen artikel'}
      sub="Staat daarna in je prijslijst en is aan elk project toe te voegen."
      footer={
        <>
          {artikel && (
            <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => (eigenArtikelStore.verwijder(artikel.id), toast('Artikel verwijderd'), onClose())}>
              Verwijderen
            </Button>
          )}
          <Button disabled={!ok} onClick={opslaan}>
            Opslaan
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField label="Naam" value={naam} onChange={setNaam} placeholder="Bijv. Inbouwdoos hol 60 mm" autoFocus />
        </div>
        <SelectField label="Categorie" value={g} onChange={setG} options={groepOpties} />
        <TextField label="Eenheid" value={eenheid} onChange={setEenheid} placeholder="per stuk / per meter / per zak 25 kg" />
        <TextField label="Prijs (€ incl. btw)" value={prijs} onChange={setPrijs} inputMode="decimal" placeholder="0,00" fout={ok || !prijs ? undefined : 'Ongeldig bedrag'} />
        <TextField label="Leverancier (optioneel)" value={lev} onChange={setLev} placeholder="Bijv. Technische Unie" />
      </div>
    </Dialog>
  )
}

/** '+ artikel toevoegen' aan een project: zoek in de catalogus en je eigen artikelen, kies aantal. */
export function ArtikelToevoegenKnop({ p, className = '' }: { p: Project; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="secondary" className={className} icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
        Artikel toevoegen
      </Button>
      {open && <ArtikelToevoegenDialoog p={p} onClose={() => setOpen(false)} />}
    </>
  )
}

type Keuze = { id: string; naam: string; groep: Groep; eenheid: string; prijs?: number; voorbeeld: boolean; eigen: boolean }

function ArtikelToevoegenDialoog({ p, onClose }: { p: Project; onClose: () => void }) {
  const eigenArt = useEigenArtikelen()
  const bron = usePrijsBron()
  useEigenPrijzen()
  const [zoek, setZoek] = useState('')
  const [gekozen, setGekozen] = useState<Keuze>()
  const [aantal, setAantal] = useState(1)
  const [nieuw, setNieuw] = useState(false)
  const alle = useMemo<Keuze[]>(
    () => [
      ...eigenArt.map((a) => ({ id: a.id, naam: a.naam, groep: a.groep, eenheid: a.eenheid, prijs: a.prijs, voorbeeld: false, eigen: true })),
      ...CATALOGUS.filter((c) => !c.oud).map((c) => {
        const a = bron.aanbod(c.id)
        return { id: c.id, naam: c.naam, groep: c.groep, eenheid: eenheidLabel(c, a?.inhoud), prijs: a?.prijs, voorbeeld: a?.bron !== 'eigen', eigen: false }
      }),
    ],
    [eigenArt, bron],
  )
  const q = zoek.trim().toLowerCase()
  const groepNaam = (g: Groep) => GROEPEN.find((x) => x.id === g)?.naam ?? g
  const lijst = alle.filter((k) => !q || `${k.naam} ${groepNaam(k.groep)}`.toLowerCase().includes(q)).slice(0, 60)

  const voegToe = () => {
    if (!gekozen || !(aantal > 0)) return
    const sleutel = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
    projectStore.werkBij(p.id, (x) => ({ ...x, extraArtikelen: [...(x.extraArtikelen ?? []), { sleutel, id: gekozen.id, aantal }] }))
    toast(`${gekozen.naam} toegevoegd`)
    onClose()
  }

  if (nieuw) return <EigenArtikelDialoog onClose={() => setNieuw(false)} onOpgeslagen={(a) => (setGekozen({ id: a.id, naam: a.naam, groep: a.groep, eenheid: a.eenheid, prijs: a.prijs, voorbeeld: false, eigen: true }), setNieuw(false))} />

  return (
    <Dialog
      open
      onClose={onClose}
      title="Artikel toevoegen"
      sub="Uit de prijslijst of je eigen artikelen, met een eigen aantal. Komt op de inkooplijst en de offerte."
      footer={
        <>
          <Button variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setNieuw(true)}>
            Nieuw eigen artikel
          </Button>
          <Button disabled={!gekozen || !(aantal > 0)} onClick={voegToe}>
            Toevoegen
          </Button>
        </>
      }
    >
      {gekozen ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-sand-50 px-3.5 py-3 ring-1 ring-sand-200">
            <p className="font-medium text-ink">{gekozen.naam}</p>
            <p className="text-[0.8rem] text-ink-muted">
              {groepNaam(gekozen.groep)} · {gekozen.eenheid} · {gekozen.prijs != null ? `${euro(gekozen.prijs)}${gekozen.voorbeeld ? ' (voorbeeld)' : ''}` : 'geen prijs'}
            </p>
            <button type="button" className="mt-1 text-[0.8rem] font-medium text-gold-700 underline" onClick={() => setGekozen(undefined)}>
              Ander artikel kiezen
            </button>
          </div>
          <NumberField label="Aantal" value={aantal} onChange={setAantal} unit={gekozen.eenheid.replace(/^per /, '')} step={1} decimals={2} />
          {gekozen.prijs != null && <p className="text-sm text-ink-soft">Totaal: <strong className="tabnum">{euro(gekozen.prijs * aantal)}</strong></p>}
        </div>
      ) : (
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 rounded-xl border border-sand-300 bg-white px-3 py-2 focus-within:border-gold-400">
            <Search className="h-4 w-4 text-ink-muted" />
            <input autoFocus value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek, bijv. knelkoppeling, kimband, kit…" aria-label="Zoek artikel" className="w-full bg-transparent text-[0.92rem] outline-none" />
          </label>
          <ul className="max-h-[50vh] divide-y divide-sand-100 overflow-y-auto rounded-xl ring-1 ring-sand-200" data-testid="artikel-keuze">
            {lijst.map((k) => (
              <li key={k.id}>
                <button type="button" onClick={() => setGekozen(k)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-sand-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.88rem] font-medium text-ink">{k.naam}</span>
                    <span className="block text-[0.72rem] text-ink-muted">{groepNaam(k.groep)} · {k.eenheid}</span>
                  </span>
                  {k.eigen && <Badge tone="gold">Eigen</Badge>}
                  <span className="tabnum shrink-0 text-[0.82rem] text-ink-soft">{k.prijs != null ? euro(k.prijs) : '—'}</span>
                </button>
              </li>
            ))}
            {!lijst.length && <li className="px-3.5 py-4 text-sm text-ink-muted">Niets gevonden. Maak een nieuw eigen artikel.</li>}
          </ul>
        </div>
      )}
    </Dialog>
  )
}
