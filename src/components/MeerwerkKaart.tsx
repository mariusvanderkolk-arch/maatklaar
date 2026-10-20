import { useEffect, useState } from 'react'
import { AlertTriangle, Camera, Eye, FilePlus2, Link2Off, MessageCircle, Pencil, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Dialog, NumberField, SelectField, TextField } from './ui'
import { toast } from './Toast'
import { euro } from '../lib/format'
import { useBedrijf, verkleinLogo } from '../lib/bedrijf'
import { offerteLink, type OfferteData } from '../lib/offerte'
import { deelVoorOndertekening, FOUT_TEKST, haalTekenStatus, tekenLink, trekLinkIn } from '../lib/ondertekenen'
import { toegangsToken } from '../lib/cloud/sync'
import { openWhatsapp, whatsappUrl } from '../lib/whatsapp'
import { projectStore } from '../lib/store'
import { uid } from '../lib/defaults'
import { vandaag } from '../lib/planning'
import { projectMarge } from '../lib/marge'
import {
  bedragVan, bonNummer, maakMeerwerkData, meerwerkStatus, meerwerkTotaal, metTeken, STATUS_TEKST, volgendNr, waarschuwing,
  type MeerwerkItem, type MeerwerkSoort,
} from '../lib/meerwerk'
import type { Project } from '../lib/types'

const leeg = (p: Project): MeerwerkItem => ({ id: uid(), nr: volgendNr(p), datum: vandaag(), soort: 'meer', omschrijving: '', reden: '', modus: 'bedrag', bedrag: 0, materiaal: 0, uren: 0 })
export const meerwerkWhatsapp = (klant: string, project: string, bon: string, link: string) =>
  `Hoi${klant.trim() ? ` ${klant.trim()}` : ''}, hierbij meerwerkbon ${bon} voor ${project.trim() || 'je project'}. Bekijk hem hier en geef akkoord met je handtekening: ${link}`

/** Meer- en minderwerk per project: bonnen maken, laten tekenen via WhatsApp en goedgekeurd verrekenen. */
export function MeerwerkKaart({ p, d }: { p: Project; d: OfferteData }) {
  const bedrijf = useBedrijf()
  const lijst = p.meerwerk ?? []
  const [bewerk, setBewerk] = useState<MeerwerkItem | null>(null)
  const [bezig, setBezig] = useState<string | null>(null)
  const extra = meerwerkTotaal(p)
  const zetItem = (m: MeerwerkItem) => projectStore.werkBij(p.id, (x) => ({ ...x, meerwerk: [...(x.meerwerk ?? []).filter((y) => y.id !== m.id), m].sort((a, b) => a.nr - b.nr) }))
  const data = (m: MeerwerkItem) => maakMeerwerkData(p, m, bedrijf, d.nr)

  // status van verstuurde bonnen ophalen (bij openen en elke 30 s zolang zichtbaar)
  const open = lijst.filter((m) => meerwerkStatus(m) === 'verstuurd').map((m) => m.teken!.token).join(',')
  useEffect(() => {
    if (!open) return
    let weg = false
    const kijk = async () => {
      if (document.hidden) return
      for (const m of (projectStore.alle().find((x) => x.id === p.id)?.meerwerk ?? []).filter((y) => meerwerkStatus(y) === 'verstuurd')) {
        const r = await haalTekenStatus(m.teken!.token)
        if (weg) return
        if (!r.ok && r.fout === 'ingetrokken') zetItem({ ...m, teken: { ...m.teken!, ingetrokkenOp: new Date().toISOString() } })
        if (r.ok && r.data.signed_at && r.data.signer_name && r.data.signature) {
          zetItem({ ...m, teken: { ...m.teken!, getekend: { naam: r.data.signer_name, op: r.data.signed_at, handtekening: r.data.signature } } })
          toast(`Bon ${bonNummer(d.nr, m.nr)} getekend door ${r.data.signer_name}`)
        } else if (r.ok && r.data.viewed_at && !m.teken!.bekekenOp) zetItem({ ...m, teken: { ...m.teken!, bekekenOp: r.data.viewed_at } })
      }
    }
    kijk()
    const t = setInterval(kijk, 30000)
    return () => {
      weg = true
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const deel = async (m: MeerwerkItem) => {
    const venster = window.open('', '_blank')
    let token = meerwerkStatus(m) === 'verstuurd' ? m.teken!.token : null
    if (!token) {
      setBezig(m.id)
      const dd = data(m)
      const r = await deelVoorOndertekening(dd, fetch, await toegangsToken())
      setBezig(null)
      if (!r.ok) {
        venster?.close()
        return toast(r.fout === 'niet-beschikbaar' ? 'Digitaal tekenen is nog niet beschikbaar. Stuur de bon voorlopig als PDF.' : FOUT_TEKST[r.fout], 'fout')
      }
      token = r.data.token
      zetItem({ ...m, teken: { token, hash: r.data.hash, nr: dd.nr, code: '', gedeeldOp: Date.now(), geldigTot: dd.geldigTot, eigenaarGeheim: r.data.owner_secret } })
    }
    openWhatsapp(whatsappUrl(meerwerkWhatsapp(p.klant, p.naam, bonNummer(d.nr, m.nr), tekenLink(token))), venster)
  }

  const intrekken = async (m: MeerwerkItem) => {
    if (!m.teken || m.teken.getekend) return
    if (!window.confirm('Link intrekken? De klant kan deze bon dan niet meer tekenen. Daarna kun je hem aanpassen.')) return
    setBezig(m.id)
    const r = await trekLinkIn(m.teken.token, m.teken.eigenaarGeheim, fetch, await toegangsToken())
    setBezig(null)
    if (!r.ok) return toast(FOUT_TEKST[r.fout], 'fout')
    zetItem({ ...m, teken: undefined })
    toast('Link ingetrokken. Je kunt de bon nu aanpassen en opnieuw versturen.')
  }

  return (
    <Card className="no-print">
      <CardHeader icon={<FilePlus2 className="h-5 w-5" />} title="Meer- en minderwerk" sub="Laat elke wijziging vooraf tekenen via WhatsApp" />
      <div className="space-y-3 px-5 pb-5 sm:px-6" data-testid="meerwerk-kaart">
        {lijst.length === 0 && <p className="text-[0.88rem] text-ink-muted">Nog geen meer- of minderwerk. Komt er iets bij of vervalt er iets? Maak een bon en laat de klant vooraf tekenen.</p>}
        {lijst.map((m) => {
          const st = meerwerkStatus(m)
          const b = metTeken(m, p)
          return (
            <div key={m.id} className="rounded-2xl p-3.5 ring-1 ring-sand-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="tabnum text-[0.72rem] font-semibold tracking-[0.12em] text-gold-700 uppercase">
                    {m.soort === 'meer' ? 'Meerwerk' : 'Minderwerk'} · {bonNummer(d.nr, m.nr)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[0.92rem] font-medium text-ink">{m.omschrijving || '(geen omschrijving)'}</p>
                </div>
                <p className={`tabnum shrink-0 text-[1rem] font-semibold ${b < 0 ? 'text-sage' : 'text-ink'}`}>
                  {b < 0 ? '− ' : '+ '}
                  {euro(Math.abs(b))}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={st === 'getekend' ? 'sage' : st === 'verstuurd' ? 'gold' : 'sand'}>{STATUS_TEKST[st]}</Badge>
                {st === 'getekend' && <span className="text-[0.76rem] text-ink-muted">door {m.teken!.getekend!.naam}</span>}
                {st === 'verstuurd' && m.teken?.bekekenOp && <span className="text-[0.76rem] text-ink-muted">bekeken</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {st !== 'getekend' && (
                  <Button size="sm" icon={<MessageCircle className="h-4 w-4" />} disabled={bezig === m.id || !m.omschrijving.trim() || bedragVan(m, p) <= 0} onClick={() => deel(m)}>
                    {st === 'verstuurd' ? 'Opnieuw sturen' : 'Laten tekenen'}
                  </Button>
                )}
                <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => window.open(st === 'verstuurd' || st === 'getekend' ? tekenLink(m.teken!.token) : offerteLink(data(m)), '_blank', 'noopener')}>
                  Bon / PDF
                </Button>
                {(st === 'concept' || st === 'ingetrokken') && (
                  <>
                    <Button size="sm" variant="ghost" aria-label="Bewerken" icon={<Pencil className="h-4 w-4" />} onClick={() => setBewerk({ ...m, teken: undefined })} />
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Verwijderen"
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => window.confirm('Deze bon verwijderen?') && projectStore.werkBij(p.id, (x) => ({ ...x, meerwerk: (x.meerwerk ?? []).filter((y) => y.id !== m.id) }))}
                    />
                  </>
                )}
                {st === 'verstuurd' && <Button size="sm" variant="ghost" icon={<Link2Off className="h-4 w-4" />} disabled={bezig === m.id} onClick={() => intrekken(m)}>Intrekken</Button>}
              </div>
            </div>
          )
        })}
        {lijst.some((m) => meerwerkStatus(m) === 'getekend') && (
          <dl className="rounded-2xl bg-sand-50 px-4 py-3 text-[0.88rem] ring-1 ring-sand-200" data-testid="meerwerk-totaal">
            <div className="flex justify-between gap-3 py-1 text-ink-soft"><dt>Offerte</dt><dd className="tabnum">{euro(d.totaal)}</dd></div>
            <div className="flex justify-between gap-3 py-1 text-ink-soft"><dt>Goedgekeurd meer-/minderwerk</dt><dd className="tabnum">{extra < 0 ? '− ' : '+ '}{euro(Math.abs(extra))}</dd></div>
            <div className="flex justify-between gap-3 border-t border-sand-200 pt-2 font-semibold text-ink"><dt>Nieuw totaal</dt><dd className="tabnum">{euro(d.totaal + extra)}</dd></div>
            <p className="mt-1 text-[0.74rem] text-ink-muted">Komt op de (eind)factuur.</p>
          </dl>
        )}
        <Button variant="secondary" className="w-full" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setBewerk(leeg(p))}>
          Meer- of minderwerk toevoegen
        </Button>
      </div>
      {bewerk && <BonFormulier p={p} m={bewerk} onClose={() => setBewerk(null)} onSave={(m) => { zetItem(m); setBewerk(null) }} />}
    </Card>
  )
}

function BonFormulier({ p, m: start, onClose, onSave }: { p: Project; m: MeerwerkItem; onClose: () => void; onSave: (m: MeerwerkItem) => void }) {
  const [m, setM] = useState(start)
  const zet = (x: Partial<MeerwerkItem>) => setM((o) => ({ ...o, ...x }))
  const bedrag = bedragVan(m, p)
  const kan = m.omschrijving.trim().length >= 3 && bedrag > 0
  const kiesFoto = async (f: File | undefined) => {
    if (!f) return
    try {
      zet({ foto: await verkleinLogo(f, 640) })
    } catch {
      toast('Foto kon niet worden gelezen.', 'fout')
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={m.soort === 'meer' ? 'Meerwerk' : 'Minderwerk'}
      sub="De klant tekent deze bon vóórdat je het werk uitvoert."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuleren</Button>
          <Button disabled={!kan} onClick={() => onSave({ ...m, omschrijving: m.omschrijving.trim(), reden: m.reden.trim() })}>Opslaan</Button>
        </>
      }
    >
      <div className="space-y-3.5" data-testid="meerwerk-formulier">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Soort">
          {(['meer', 'minder'] as MeerwerkSoort[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={m.soort === s} onClick={() => zet({ soort: s })} className={`rounded-xl py-2.5 text-[0.9rem] font-semibold ring-1 ${m.soort === s ? 'bg-ink text-paper ring-ink' : 'bg-paper text-ink-soft ring-sand-300'}`}>
              {s === 'meer' ? 'Meerwerk (+)' : 'Minderwerk (−)'}
            </button>
          ))}
        </div>
        <TextField label="Omschrijving" value={m.omschrijving} onChange={(v) => zet({ omschrijving: v.slice(0, 400) })} placeholder="Bijv. extra stopcontact naast de spiegel" />
        <TextField label="Reden" value={m.reden} onChange={(v) => zet({ reden: v.slice(0, 600) })} placeholder="Bijv. op verzoek van de klant / rot hout aangetroffen" />
        <SelectField label="Prijs" value={m.modus} onChange={(v) => zet({ modus: v })} options={[{ value: 'bedrag', label: 'Vast bedrag' }, { value: 'berekend', label: 'Materiaal + uren' }]} />
        {m.modus === 'bedrag' ? (
          <NumberField label="Bedrag (incl. btw)" unit="€" value={m.bedrag} onChange={(v) => zet({ bedrag: v })} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Materiaal (inkoop)" unit="€" value={m.materiaal} onChange={(v) => zet({ materiaal: v })} hint={projectMarge(p) ? `+ ${projectMarge(p)}% marge` : undefined} />
            <NumberField label="Uren" unit="uur" value={m.uren} onChange={(v) => zet({ uren: v })} hint={`× ${euro(p.uurtarief)}`} />
          </div>
        )}
        <div>
          {m.foto ? (
            <div className="relative">
              <img src={m.foto} alt="Foto bij deze bon" className="max-h-48 w-full rounded-xl object-cover ring-1 ring-sand-200" />
              <button type="button" aria-label="Foto verwijderen" onClick={() => zet({ foto: undefined })} className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-ink/80 text-paper"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-sand-400 py-3 text-[0.88rem] font-medium text-ink-soft hover:bg-sand-50">
              <Camera className="h-4.5 w-4.5" /> Foto toevoegen (optioneel)
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => kiesFoto(e.target.files?.[0])} />
            </label>
          )}
        </div>
        <p className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[0.85rem] leading-relaxed ring-1 ${m.soort === 'meer' ? 'bg-rust/5 ring-rust/25' : 'bg-sage/10 ring-sage/30'}`}>
          <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${m.soort === 'meer' ? 'text-rust' : 'text-sage'}`} />
          <span>
            {bedrag > 0 ? waarschuwing(m.soort, m.soort === 'meer' ? bedrag : -bedrag, euro) : 'Vul een bedrag in.'}{' '}
            {m.soort === 'meer' && <span className="text-ink-muted">Zo voldoe je aan je waarschuwingsplicht: de klant weet vooraf dat de prijs stijgt.</span>}
          </span>
        </p>
      </div>
    </Dialog>
  )
}
