import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardHeader, Button, NumberField, SelectField, TextField } from './ui'
import { Plattegrond } from './Plattegrond'
import { uid } from '../lib/defaults'
import { getal } from '../lib/format'
import { projectStore } from '../lib/store'
import type { Project } from '../lib/types'
import { KLEUR_DISCLAIMER, KLEUR_SELECTIE, WAAIERS, ZIJDEN, ZIJDE_NAAM, kleurTekst, nieuweSchilderKamer, schilderKamers, schilderM2, type SchilderKamer, type SchilderWand, type WandZijde } from '../lib/schilderplan'

export function SchilderPlan({ p }: { p: Project }) {
  const kamers = schilderKamers(p)
  const [kamerId, setKamerId] = useState(kamers[0]?.id ?? '')
  const [zijde, setZijde] = useState<WandZijde>('boven')
  const k = kamers.find((k) => k.id === kamerId) ?? kamers[0]
  const w = k?.wanden.find((w) => w.zijde === zijde)
  const zetKamers = (kamers: SchilderKamer[]) => projectStore.werkBij(p.id, (x) => ({ ...x, schilderPlan: { kamers } }))
  const zetKamer = (patch: Partial<SchilderKamer>) => zetKamers(kamers.map((x) => x.id === k.id ? { ...x, ...patch } : x))
  const zetWand = (patch: Partial<SchilderWand>) => zetKamer({ wanden: k.wanden.map((x) => x.zijde === zijde ? { ...x, ...patch } : x) })
  const voegToe = () => { const n = nieuweSchilderKamer(uid(), `Ruimte ${kamers.length + 1}`, p.afmetingen.lengte, p.afmetingen.breedte, p.afmetingen.hoogte); zetKamers([...kamers, n]); setKamerId(n.id) }
  return <Card><CardHeader title="Schilderplattegrond & kleuren" sub="Rechthoekige ruimtes, per wand een kleur en netto schilderoppervlak." />
    <div className="space-y-5 p-5 sm:p-6">
      <p className="rounded-xl bg-sand-100 p-3 text-sm font-medium" role="note">{KLEUR_DISCLAIMER}</p>
      <p className="text-sm text-ink-muted">De plattegrond vervangt de handmatige wand- en plafondoppervlakken in de berekening: geen dubbele telling. Aftrek voor ramen/deuren voer je per wand in. Andere vormen kun je verdelen over rechthoekige ruimtes. Maximaal 5 ruimtes per project.</p>
      {k && w && <>
        <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Ruimte kiezen" value={k.id} onChange={setKamerId} options={kamers.map((k) => ({ value: k.id, label: k.naam }))} /><TextField label="Naam ruimte" value={k.naam} onChange={(naam) => zetKamer({ naam })} /></div>
        <div className="grid grid-cols-3 gap-3"><NumberField label="Lengte" unit="m" value={k.lengte} onChange={(lengte) => zetKamer({ lengte })} /><NumberField label="Breedte" unit="m" value={k.breedte} onChange={(breedte) => zetKamer({ breedte })} /><NumberField label="Hoogte" unit="m" value={k.hoogte} onChange={(hoogte) => zetKamer({ hoogte })} /></div>
        <Plattegrond className="mx-auto w-full max-w-md" afmetingen={{ ...p.afmetingen, lengte: k.lengte, breedte: k.breedte, hoogte: k.hoogte, openingen: [] }} scope={{}} type="schilderwerk" schilderWanden={k.wanden} geselecteerdeWand={zijde} onWand={setZijde} />
        <div className="flex flex-wrap gap-2">{ZIJDEN.map((z) => <Button key={z} size="sm" variant={zijde === z ? 'primary' : 'secondary'} onClick={() => setZijde(z)}>{ZIJDE_NAAM[z]}</Button>)}</div>
        <ul className="space-y-1 text-sm">{k.wanden.map((w) => <li key={w.zijde}><span className="mr-2 inline-block h-3 w-3 rounded-sm ring-1 ring-sand-300" style={{ background: w.kleur.hex }} />{ZIJDE_NAAM[w.zijde]}: {w.schilderen ? `${kleurTekst(w.kleur)} · ${getal(schilderM2(k, w))} m²` : 'Niet schilderen'}</li>)}</ul>
        <div className="grid gap-4 rounded-xl bg-sand-50 p-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={w.schilderen} onChange={(e) => zetWand({ schilderen: e.target.checked })} />{ZIJDE_NAAM[zijde]} schilderen</label>
          <NumberField label="Aftrek ramen/deuren / niet schilderen" unit="m²" value={w.aftrek} onChange={(aftrek) => zetWand({ aftrek })} />
          <SelectField label="Kleurenwaaier" value={w.kleur.waaier} onChange={(waaier) => zetWand({ kleur: { waaier, code: '', naam: 'Nog te kiezen', hex: '#dedbd5' } })} options={WAAIERS.map((w) => ({ value: w.id, label: w.naam }))} />
          <SelectField label="Kleine voorbeeldselectie (geen volledige waaier)" value={KLEUR_SELECTIE.find((c) => c.waaier === w.kleur.waaier && c.code === w.kleur.code)?.code ?? ''} onChange={(code) => { const c = KLEUR_SELECTIE.find((c) => c.waaier === w.kleur.waaier && c.code === code); if (c) zetWand({ kleur: { ...c } }); else zetWand({ kleur: { ...w.kleur, code: '', naam: '' } }) }} options={[{ value: '', label: 'Eigen code/naam hieronder invullen' }, ...KLEUR_SELECTIE.filter((c) => c.waaier === w.kleur.waaier).map((c) => ({ value: c.code, label: `${c.code} · ${c.naam}` }))]} />
          <TextField label="Kleurcode (van fysieke waaier)" value={w.kleur.code} onChange={(code) => zetWand({ kleur: { ...w.kleur, code } })} />
          <TextField label="Kleurnaam / notitie" value={w.kleur.naam} onChange={(naam) => zetWand({ kleur: { ...w.kleur, naam } })} />
          <label className="space-y-1 text-sm">Eigen illustratieve schetskleur (niet gekalibreerd)<input type="color" className="block h-11 w-full rounded-lg" value={w.kleur.hex} onChange={(e) => zetWand({ kleur: { ...w.kleur, hex: e.target.value } })} /></label>
          <p className="text-sm text-ink-muted">Voorbeeldvlakken zijn eigen Maatklaar-illustraties, geen officiële digitale waaierwaarden of gegarandeerde kleurmatch. Voor NCS, Sikkens, Sigma en Flexa kun je elke eigen waaiercode noteren; deze wordt niet als bestaande kleur gevalideerd. Merknamen zijn alleen referenties.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">{WAAIERS.filter((f) => f.bron).map((f) => <a key={f.id} href={f.bron} target="_blank" rel="noreferrer" className="underline">Bron: {f.naam}</a>)}</div>
        <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => { if (window.confirm(`Alle schilderwanden van ${k.naam} uit de berekening verwijderen?`)) zetKamers(kamers.filter((x) => x.id !== k.id)) }}>Ruimte verwijderen</Button>
      </>}
      <Button variant="secondary" disabled={kamers.length >= 5} icon={<Plus className="h-4 w-4" />} onClick={voegToe}>{p.schilderPlan ? 'Ruimte toevoegen' : 'Schilderplattegrond maken'}</Button>
    </div>
  </Card>
}
