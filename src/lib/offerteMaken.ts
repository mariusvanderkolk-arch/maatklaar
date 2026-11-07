import { KLEUR_DISCLAIMER } from './schilderplan'
import { afwerkingVan, afwerkRegelBtw, isAfwerking } from './afwerking'
import { margeRegels } from './marge'
/** Stelt de offertegegevens samen uit een project, de berekening en het bedrijfsprofiel. */
import { effectieveScope } from './calc'
import type { Bedrijf } from './bedrijf'
import { getal } from './format'
import type { OfferteData } from './offerte'
import { plusDagen, vandaag } from './planning'
import { ruimteLabel, scopeItems } from './ruimtes'
import type { berekenAlles } from './useCalc'
import type { Project } from './types'
import { compact, kamerVan, type Ontwerp } from './ontwerp/model'

type Berekening = ReturnType<typeof berekenAlles>

export const SANITAIR_KLANT_TEKST = 'Sanitair (toilet, wastafel, douche, bad en kranen) wordt door de klant geleverd en is niet in deze prijs inbegrepen; montage wel.'

/** Aannames voor op de offerte, met de regel over sanitair van de klant als die optie aan staat. */
export function aannamesVoor(p: Pick<Project, 'aannames' | 'sanitairDoorKlant'>): string {
  const eigen = p.aannames?.trim() ?? ''
  if (!p.sanitairDoorKlant) return eigen
  return eigen ? `${SANITAIR_KLANT_TEKST}\n${eigen}` : SANITAIR_KLANT_TEKST
}

const verpakkingKort = (v: string) => v.replace(/^(doos|zak|bus|emmer|rol|koker|lengte|plaat|pak) à /, '$1 ')

export function prijsTekstVoor(st: Berekening['inkoop']['prijsStatus'], datumTekst: (iso: string) => string): string {
  if (st.eigen === 0) return 'Materiaalprijzen zijn richtprijzen (voorbeeld), nog geen eigen inkoopprijzen.'
  if (st.voorbeeld === 0) return `Materiaalprijzen zijn eigen prijzen, bijgewerkt op ${st.laatstBijgewerkt ? datumTekst(st.laatstBijgewerkt) : '—'}.`
  return `Materiaalprijzen zijn deels eigen prijzen; bedragen met * zijn voorbeeldprijzen (${st.voorbeeld} van ${st.eigen + st.voorbeeld} prijzen).`
}

export function oppervlakRegels(p: Project, o: Berekening['oppervlakken']): [string, string][] {
  const sc = effectieveScope(p)
  if (isAfwerking(p)) return afwerkingVan(p).vlakken.map((v) => [v.naam, `${getal(v.m2)} m²`])
  const m2 = (n: number) => `${getal(n)} m²`
  const m = (n: number) => `${getal(n)} m`
  if (p.type === 'vloer') return [['Vloer', m2(o.vloer)], ['Plinten', m(sc.plinten ? o.plintLengte : 0)], ['Omtrek', m(o.omtrek)], ['Snijverlies', `${getal(p.snijverlies, 1)} %`]]
  if (p.type === 'keuken') return [['Spatwand', m2(o.spatwand)], ['Vloer', m2(o.vloer)], ['Werkblad', m(p.afmetingen.spatwand.lengte)], ['Snijverlies', `${getal(p.snijverlies, 1)} %`]]
  const r: [string, string][] = [['Wandtegels', m2(sc.wandtegels ? o.wandNetto : 0)], ['Vloer', m2(o.vloer)]]
  if (p.type === 'toilet') r.push(['Tegelhoogte', m(o.tegelhoogte)])
  if (sc.waterdicht) r.push(['Waterdicht', m2(o.waterdichtOppervlak)])
  if (sc.stucwerk) r.push(['Stucwerk', m2(o.plafond + o.wandBovenTegels)])
  if (r.length < 4) r.push(['Omtrek', m(o.omtrek)])
  return r.slice(0, 4)
}

export function maakOfferteData(p: Project, b: Berekening, bedrijf: Bedrijf, datumTekst: (iso: string) => string, ontwerp?: Ontwerp): OfferteData {
  const sc = effectieveScope(p)
  const metArbeid = p.offerte?.metArbeid ?? true
  const st = b.inkoop.prijsStatus
  const gemengd = st.eigen > 0 && st.voorbeeld > 0
  const datum = p.offerte?.datum ?? vandaag()
  const arbTotaal = metArbeid ? Math.round(b.arbeidKosten * 100) / 100 : 0
  const onvPct = Math.max(0, Math.min(50, p.onvoorzien ?? 0))
  const mr = margeRegels(p, b.inkoop.regels)
  const matTotaal = Math.round(mr.reduce((x, r) => x + r.verkoop, 0) * 100) / 100
  const onvBedrag = Math.round(((matTotaal + arbTotaal) * onvPct) / 100 * 100) / 100
  const matTarieven = b.inkoop.regels.map((r) => afwerkRegelBtw(p, r.sleutel ?? r.id))
  const arbTarieven = metArbeid ? b.arbeid.map((a) => afwerkRegelBtw(p, a.scope)) : []
  const grondslag9 = mr.reduce((s, r, i) => s + (matTarieven[i] === 9 ? r.verkoop : 0), 0) + (metArbeid ? b.arbeid.reduce((s, a, i) => s + (arbTarieven[i] === 9 ? a.uren * p.uurtarief : 0), 0) : 0)
  const onv9 = Math.min(onvBedrag, Math.round(grondslag9 * onvPct) / 100)
  const onvTarieven: [9 | 21, number][] = ([[9, onv9], [21, Math.round((onvBedrag - onv9) * 100) / 100]] as [9 | 21, number][]).filter((r) => r[1] > 0)
  return {
    v: 1,
    nr: p.offerte?.nummer ?? '—',
    datum,
    geldigTot: plusDagen(datum, Math.max(1, bedrijf.geldigheidDagen || 30)),
    bedrijf: Object.fromEntries(
      (['naam', 'contactpersoon', 'telefoon', 'email', 'adres', 'website', 'kvk', 'btw', 'iban'] as const).map((k) => [k, bedrijf[k].trim()]).filter(([, v]) => v),
    ),
    klant: p.klant,
    adres: p.adres,
    project: p.naam,
    ruimte: ruimteLabel(p.type),
    maten: p.schilderPlan ? 'Zie de afzonderlijke schildervlakken en netto oppervlakken' : `${getal(p.afmetingen.lengte)} × ${getal(p.afmetingen.breedte)}${p.type === 'vloer' ? '' : ` × ${getal(p.afmetingen.hoogte)}`} m`,
    ...(isAfwerking(p) ? { tarieven: { mat: matTarieven, arb: arbTarieven, ...(onvTarieven.length ? { onv: onvTarieven } : {}) } } : {}),
    werk: isAfwerking(p) ? afwerkingVan(p).vlakken.filter(() => p.type === 'stucwerk' ? p.scope.stucwerk : p.scope.sauswerk).map((v) => [v.naam, `${v.kleur ? v.kleur + ' · ' : ''}${getal(v.m2)} m² netto · ${afwerkingVan(p).locatie} · ${v.ondergrond} · ${v.afwerking}${v.voorbereiding ? ' · incl. voorbereiding' : ''}`]) : scopeItems(p.type).filter((i) => sc[i.key]).map((i) => [i.label, i.omschrijving]),
    opp: oppervlakRegels(p, b.oppervlakken),
    mat: b.inkoop.regels.map((r, i) => [
      `${r.naam}${r.spec ? ` · ${r.spec}` : ''}${isAfwerking(p) && !r.spec?.includes('% btw') ? ` · ${afwerkRegelBtw(p, r.sleutel ?? r.id)}% btw` : ''}`,
      `${r.koopAantal} × ${verpakkingKort(r.koopVerpakking)}`,
      mr[i].verkoop,
      gemengd && r.bron === 'voorbeeld' ? 1 : 0,
    ]),
    matTotaal,
    arb: metArbeid ? b.arbeid.map((a) => [a.omschrijving, a.uren]) : [],
    tarief: p.uurtarief,
    arbTotaal,
    ...(onvPct > 0 ? { onv: [onvPct, onvBedrag] as [number, number] } : {}),
    totaal: Math.round((matTotaal + arbTotaal + onvBedrag) * 100) / 100,
    notities: p.notities,
    ...(isAfwerking(p) ? { aannames: `${p.schilderPlan ? KLEUR_DISCLAIMER + '\n' : ''}Netto oppervlakken en verbruik zijn ramingen; controleer ondergrond en productblad. Alle bedragen en het uurtarief zijn inclusief het per regel gekozen btw-tarief. Onvoorzien volgt naar verhouding de btw-tarieven van de werkzaamheden. Apart meerwerk standaard 21%; controleer dit voor akkoord. Niet-kwalificerende werkzaamheden en losse extra artikelen zijn 21%.\n${aannamesVoor(p)}` } : aannamesVoor(p) ? { aannames: aannamesVoor(p) } : {}),
    betaaltermijn: bedrijf.betaaltermijn.trim(),
    prijsTekst: prijsTekstVoor(st, datumTekst),
    ...(ontwerp && ontwerp.inOfferte && ontwerp.items.length ? { ow: compact(ontwerp, kamerVan(p)) } : {}),
  }
}
