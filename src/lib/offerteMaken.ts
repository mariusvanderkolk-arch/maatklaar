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

const verpakkingKort = (v: string) => v.replace(/^(doos|zak|bus|emmer|rol|koker|lengte|plaat|pak) à /, '$1 ')

export function prijsTekstVoor(st: Berekening['inkoop']['prijsStatus'], datumTekst: (iso: string) => string): string {
  if (st.eigen === 0) return 'Materiaalprijzen zijn richtprijzen (voorbeeld), nog geen eigen inkoopprijzen.'
  if (st.voorbeeld === 0) return `Materiaalprijzen zijn eigen prijzen, bijgewerkt op ${st.laatstBijgewerkt ? datumTekst(st.laatstBijgewerkt) : '—'}.`
  return `Materiaalprijzen zijn deels eigen prijzen; bedragen met * zijn voorbeeldprijzen (${st.voorbeeld} van ${st.eigen + st.voorbeeld} prijzen).`
}

export function oppervlakRegels(p: Project, o: Berekening['oppervlakken']): [string, string][] {
  const sc = effectieveScope(p)
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
    maten: `${getal(p.afmetingen.lengte)} × ${getal(p.afmetingen.breedte)}${p.type === 'vloer' ? '' : ` × ${getal(p.afmetingen.hoogte)}`} m`,
    werk: scopeItems(p.type).filter((i) => sc[i.key]).map((i) => [i.label, i.omschrijving]),
    opp: oppervlakRegels(p, b.oppervlakken),
    mat: b.inkoop.regels.map((r, i) => [
      `${r.naam}${r.spec ? ` · ${r.spec}` : ''}`,
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
    betaaltermijn: bedrijf.betaaltermijn.trim(),
    prijsTekst: prijsTekstVoor(st, datumTekst),
    ...(ontwerp && ontwerp.inOfferte && ontwerp.items.length ? { ow: compact(ontwerp, kamerVan(p)) } : {}),
  }
}
