import { SchilderPlan } from './SchilderPlan'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardHeader, NumberField, SelectField, TextField } from './ui'
import { afwerkingVan, nieuwVlak, vlakBtw, BTW_BRON, type AfwerkSpec, type AfwerkVlak, type AfwerkSoort } from '../lib/afwerking'
import { uid } from '../lib/defaults'
import { projectStore } from '../lib/store'
import type { Project } from '../lib/types'

export function AfwerkingForm({ p }: { p: Project }) {
  const s = afwerkingVan(p), stuc = p.type === 'stucwerk'
  const zet = (patch: Partial<AfwerkSpec>) => projectStore.werkBij(p.id, (x) => ({ ...x, afwerking: { ...afwerkingVan(x), ...patch } }))
  const vlak = (id: string, patch: Partial<AfwerkVlak>) => zet({ vlakken: s.vlakken.map((v) => v.id === id ? { ...v, ...patch } : v) })
  return <div className="space-y-5">
    {!stuc && <SchilderPlan p={p} />}
    <Card><CardHeader title={`${stuc ? 'Stucwerk' : 'Schilderwerk'} · btw-keuze`} sub="Standaard 21%. Bevestig beide voorwaarden voor 9% op kwalificerend werk." />
      <div className="space-y-4 p-5 sm:p-6">
        <label className="flex items-start gap-3"><input type="checkbox" checked={s.woning} onChange={(e) => zet({ woning: e.target.checked })} className="mt-1 h-5 w-5" /><span>Dit werk betreft een woning bestemd voor permanente bewoning door particulieren (bij gemengd gebruik: alleen het woongedeelte).</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" checked={s.ouderDan2} onChange={(e) => zet({ ouderDan2: e.target.checked })} className="mt-1 h-5 w-5" /><span>De woning is bij uitvoering ouder dan 2 jaar, gerekend vanaf het eerste gebruik als woning. Controleer dit bijvoorbeeld via BAG of een schriftelijke verklaring.</span></label>
        <p className="text-sm text-ink-muted">9% geldt bij deze voorwaarden voor {stuc ? 'stukadoren' : 'schilderen'}, bijbehorende voorbereiding én gebruikte materialen. Nieuwbouw, bedrijfsruimte en onbekende status: 21%. Niet-kwalificerend werk apart op 21% zetten. {stuc ? 'Gipswanden plaatsen, tegelwerk en vloeren vallen hier niet onder.' : 'Bijvoorbeeld kozijnen vervangen, houten inzetstukken, constructief kitwerk, glas plaatsen en wrapfolie vallen hier niet onder.'}</p>
        <p className="text-sm text-ink-muted">Bij verschillende bouwstadia moet de woning voor minimaal 50% uit delen ouder dan 2 jaar bestaan. Losse bedrijfsruimtes, hotels en niet-permanent bewoonbare vakantiewoningen kwalificeren niet. Controleer bijzondere situaties bij de bron.</p>
        <a className="text-sm underline" href={BTW_BRON + (stuc ? 'stukadoren' : 'schilderen')} target="_blank" rel="noreferrer">Belastingdienst: {stuc ? 'stukadoren' : 'schilderen'}</a>{' · '}<a className="text-sm underline" href={BTW_BRON + 'woningen_ouder_dan_2_jaar'} target="_blank" rel="noreferrer">Woning en ouderdom</a>
        {!stuc && <SelectField label="Locatie schilderwerk" value={s.locatie} onChange={(locatie) => zet({ locatie })} options={[{ value: 'binnen', label: 'Binnen' }, { value: 'buiten', label: 'Buiten' }]} />}
      </div>
    </Card>
    <p className="text-sm text-ink-muted">{p.schilderPlan ? 'Wand- en plafondvlakken volgen de schilderplattegrond hierboven. Wijzig maten en kleuren daar; hieronder pas je verbruik, afwerking en uren aan.' : 'Vlakken staan los van de ruimteplattegrond.'} Vul netto m² in na aftrek van ramen/deuren; bij houtwerk de werkelijk te schilderen oppervlakte. Startwaarden en verbruik zijn bewerkbare ramingen. Kies het juiste product in Prijzen beheren; controleer productblad, ondergrond en verpakking. Uurnorm is inclusief eventuele voorbereiding. Bedragen en uurtarief blijven inclusief het gekozen btw-tarief; btw wijzigen verandert de afgesproken brutoprijs niet.</p>
    {s.vlakken.map((v) => <Card key={v.id}><CardHeader title={v.naam || 'Oppervlak'} sub={`${vlakBtw(s, v)}% btw · arbeid en bijbehorend materiaal`} action={v.id.startsWith('plan-') ? undefined : <Button variant="ghost" size="sm" aria-label={`Verwijder ${v.naam}`} icon={<Trash2 className="h-4 w-4" />} onClick={() => zet({ vlakken: s.vlakken.filter((x) => x.id !== v.id) })} />} />
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {v.id.startsWith('plan-') ? <p className="text-sm"><strong>{v.naam}</strong><br />Naam en wandindeling volgen de schilderplattegrond.</p> : <TextField label="Omschrijving oppervlak" value={v.naam} onChange={(naam) => vlak(v.id, { naam })} />}
        {v.id.startsWith('plan-') ? <p className="text-sm">Netto oppervlak uit plattegrond: <strong>{v.m2.toFixed(2)} m²</strong><br />{v.kleur}</p> : <NumberField label="Netto oppervlak" unit="m²" value={v.m2} onChange={(m2) => vlak(v.id, { m2 })} />}
        {!v.id.startsWith('plan-') && <SelectField label="Soort werk" value={v.soort} onChange={(soort) => vlak(v.id, { soort, ...(soort === 'overig' ? { btw: '21' as const } : {}) })} options={[{ value: 'wand', label: 'Wanden' }, { value: 'plafond', label: 'Plafond' }, ...(!stuc ? [{ value: 'hout' as const, label: 'Houtwerk / kozijnen schilderen' }] : []), { value: 'overig', label: 'Ander werk: arbeid 21%, materiaal zelf toevoegen' }]} />}
        <TextField label="Ondergrond / staat" value={v.ondergrond} onChange={(ondergrond) => vlak(v.id, { ondergrond })} />
        <TextField label={stuc ? 'Afwerking (bijv. saus- of behangklaar)' : 'Verfsysteem (bijv. muurverf, lak of beits)'} value={v.afwerking} onChange={(afwerking) => vlak(v.id, { afwerking })} />
        <SelectField label="Btw voor deze regel" value={v.btw} onChange={(btw) => vlak(v.id, { btw })} options={[{ value: 'auto', label: s.woning && s.ouderDan2 && v.soort !== 'overig' ? '9% — kwalificerend werk, inclusief materiaal' : '21% — voorwaarden niet bevestigd / ander werk' }, { value: '21', label: '21% — uitgesloten werk of handmatige correctie' }]} />
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={v.voorbereiding} onChange={(e) => vlak(v.id, { voorbereiding: e.target.checked })} />{stuc ? 'Voorbehandelen / voorstrijk' : 'Voorbereiden, schuren / grondlaag'}</label>
        <NumberField label="Arbeidsnorm (incl. voorbereiding)" unit="uur/m²" value={v.urenPerM2} onChange={(urenPerM2) => vlak(v.id, { urenPerM2 })} />
        {v.soort !== 'overig' && <>
          <TextField label="Gekozen product (optioneel)" value={v.product ?? ''} onChange={(product) => vlak(v.id, { product })} />
          <NumberField label="Verpakkingsinhoud afwerkproduct" unit={stuc ? 'kg' : 'L'} value={v.verpakking ?? (stuc ? 20 : 2.5)} onChange={(verpakking) => vlak(v.id, { verpakking })} />
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={v.eigenPrijs === true} onChange={(e) => vlak(v.id, { eigenPrijs: e.target.checked })} />Eigen materiaalprijs voor dit vlak (anders prijslijst / voorbeeldprijs)</label>
          {v.eigenPrijs && <NumberField label="Eigen prijs per verpakking (incl. gekozen btw)" unit="€" value={v.prijs ?? 0} onChange={(prijs) => vlak(v.id, { prijs })} />}
        </>}
        {v.soort !== 'overig' && <><NumberField label={stuc ? 'Laagdikte' : 'Aantal verflagen'} unit={stuc ? 'mm' : 'lagen'} value={stuc ? v.dikte : v.lagen} onChange={(n) => vlak(v.id, stuc ? { dikte: n } : { lagen: n })} /><NumberField label="Productverbruik (controleer productblad)" unit={stuc ? 'kg/m²/mm' : 'L/m²/laag'} value={v.verbruik} onChange={(verbruik) => vlak(v.id, { verbruik })} /></>}
      </div></Card>)}
    <Button variant="secondary" disabled={s.vlakken.length >= 30} icon={<Plus className="h-4 w-4" />} onClick={() => zet({ vlakken: [...s.vlakken, nieuwVlak(stuc, p.schilderPlan ? 'hout' : 'wand' as AfwerkSoort, uid())] })}>Oppervlak toevoegen</Button>
  </div>
}
