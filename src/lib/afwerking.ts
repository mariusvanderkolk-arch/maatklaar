import { schilderKamers, schilderM2, schilderVlakId, kleurTekst, ZIJDE_NAAM } from './schilderplan'
/** Losse afbouwprojecten. Hoeveelheden/normen zijn bewerkbare ramingen, geen productadvies. */
import type { Project } from './types'
import type { ArbeidRegel, MateriaalRegel } from './calc'
export type AfwerkSoort = 'wand' | 'plafond' | 'hout' | 'overig'
export interface AfwerkVlak { id: string; soort: AfwerkSoort; naam: string; m2: number; ondergrond: string; voorbereiding: boolean; afwerking: string; lagen: number; dikte: number; verbruik: number; urenPerM2: number; btw: 'auto' | '21'; kleur?: string; verpakking?: number; eigenPrijs?: boolean; prijs?: number; product?: string }
export interface AfwerkSpec { woning: boolean; ouderDan2: boolean; locatie: 'binnen' | 'buiten'; vlakken: AfwerkVlak[] }
export const isAfwerking = (p: Pick<Project, 'type'>) => p.type === 'stucwerk' || p.type === 'schilderwerk'
export const BTW_BRON = 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/diensten_9_btw/werkzaamheden_aan_woningen/'
export const positief = (n: unknown, max = 100000) => typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0
export function nieuwVlak(stuc: boolean, soort: AfwerkSoort, id: string, m2 = 0): AfwerkVlak {
  return { id, soort, naam: soort === 'plafond' ? 'Plafond' : soort === 'hout' ? 'Houtwerk / kozijnen' : soort === 'overig' ? 'Overig werk (arbeid, 21%)' : 'Wanden', m2, ondergrond: 'Bestaande ondergrond — controle nodig', voorbereiding: true, afwerking: stuc ? 'Sausklaar' : 'Dekkend schilderwerk', lagen: 2, dikte: 2, verbruik: stuc ? 1.2 : 0.1, urenPerM2: stuc ? 0.6 : 0.3, btw: soort === 'overig' ? '21' : 'auto' }
}
export function afwerkingVan(p: Pick<Project, 'type' | 'afmetingen' | 'afwerking' | 'schilderPlan'>): AfwerkSpec {
  const a = p.afmetingen
  const standaard = { woning: false, ouderDan2: false, locatie: 'binnen' as const, vlakken: [nieuwVlak(p.type === 'stucwerk', 'wand', 'wand', Math.max(0, 2 * (a.lengte + a.breedte) * a.hoogte - a.openingen.reduce((s, o) => s + o.breedte * o.hoogte, 0))), nieuwVlak(p.type === 'stucwerk', 'plafond', 'plafond', a.lengte * a.breedte)] }
  const r = p.afwerking
  const basis = !r || typeof r !== 'object' ? standaard : r
  return { woning: basis.woning === true, ouderDan2: basis.ouderDan2 === true, locatie: basis.locatie === 'buiten' ? 'buiten' : 'binnen', vlakken: effectieveVlakken(p, Array.isArray(basis.vlakken) ? basis.vlakken : standaard.vlakken).slice(0, 30).map((v, i) => {
    const soort = (['wand', 'plafond', 'hout', 'overig'] as const).find((s) => s === v?.soort) ?? 'overig'
    const d = nieuwVlak(p.type === 'stucwerk', soort, `vlak-${i}`)
    return { ...d, id: String(v?.id ?? d.id).slice(0, 60), naam: String(v?.naam ?? d.naam).slice(0, 100), soort, m2: positief(v?.m2), ondergrond: String(v?.ondergrond ?? '').slice(0, 200), voorbereiding: v?.voorbereiding === true, afwerking: String(v?.afwerking ?? '').slice(0, 150), ...(v?.kleur ? { kleur: String(v.kleur).slice(0, 180) } : {}), verpakking: Math.max(.1, positief(v?.verpakking ?? (p.type === 'stucwerk' ? 20 : 2.5), 1000)), eigenPrijs: v?.eigenPrijs === true, prijs: positief(v?.prijs), product: String(v?.product ?? '').slice(0, 80), lagen: Math.max(1, Math.round(positief(v?.lagen, 10))), dikte: positief(v?.dikte, 100), verbruik: positief(v?.verbruik, 20), urenPerM2: positief(v?.urenPerM2, 100), btw: v?.btw === '21' || soort === 'overig' ? '21' : 'auto' }
  }) }
}
function effectieveVlakken(p: Pick<Project, 'type' | 'schilderPlan'>, vlakken: AfwerkVlak[]): AfwerkVlak[] {
  vlakken = vlakken.filter((v) => v && typeof v === 'object')
  if (p.type !== 'schilderwerk' || !p.schilderPlan) return vlakken
  return [...schilderKamers(p).flatMap((k) => k.wanden.filter((w) => w.schilderen).map((w) => {
    const id = schilderVlakId(k, w), oud = vlakken.find((v) => v.id === id)
    return { ...nieuwVlak(false, w.zijde === 'plafond' ? 'plafond' : 'wand', id), ...oud, id, naam: `${k.naam} · ${ZIJDE_NAAM[w.zijde]}`, m2: schilderM2(k, w), kleur: kleurTekst(w.kleur) }
  })), ...vlakken.filter((v) => !String(v.id ?? '').startsWith('plan-') && (v.soort === 'hout' || v.soort === 'overig'))]
}
export const vlakBtw = (s: AfwerkSpec, v: AfwerkVlak): 9 | 21 => s.woning && s.ouderDan2 && v.btw === 'auto' && v.soort !== 'overig' ? 9 : 21
export const afwerkId = (v: AfwerkVlak) => `afwerk-${v.id}`
export function afwerkMaterialen(p: Project): MateriaalRegel[] {
  if (!(p.type === 'stucwerk' ? p.scope.stucwerk : p.scope.sauswerk)) return []
  const s = afwerkingVan(p), stuc = p.type === 'stucwerk'
  return s.vlakken.flatMap((v) => {
    if (!v.m2 || v.soort === 'overig') return []
    const regel = (id: 'primer' | 'pleister' | 'verf', nodig: number, inhoud: number, naam: string): MateriaalRegel => ({ id, sleutel: `${afwerkId(v)}-${id}`, groep: 'afwerking', naam: `${v.naam}: ${naam}`, spec: `${v.afwerking}${v.kleur ? ' · ' + v.kleur : ''} · ${vlakBtw(s, v)}% btw`, nodig, nodigEenheid: id === 'pleister' ? 'kg' : 'L', aantal: Math.ceil(nodig / inhoud - 1e-9), verpakking: `${id === 'pleister' ? 'zak' : 'bus'} à ${inhoud} ${id === 'pleister' ? 'kg' : 'L'}`, inhoud, verpakkingSoort: id === 'pleister' ? 'zak' : 'bus', prijsAantal: Math.ceil(nodig / inhoud - 1e-9), ...(id !== 'primer' && v.eigenPrijs ? { projectPrijs: v.prijs ?? 0 } : {}), toelichting: `${v.m2} m² × ${id === 'primer' ? '0,15 L/m²' : v.verbruik + (stuc ? ' kg/m²/mm × ' + v.dikte + ' mm' : ' L/m²/laag × ' + v.lagen + ' lagen')}. Raming; controleer productblad en ondergrond.` })
    return [...(v.voorbereiding ? [regel('primer', v.m2 * 0.15, 5, 'Voorstrijk / grondlaag (raming)')] : []), regel(stuc ? 'pleister' : 'verf', v.m2 * v.verbruik * (stuc ? v.dikte : v.lagen), v.verpakking ?? (stuc ? 20 : 2.5), v.product || (stuc ? 'Pleister (product zelf kiezen)' : `Verf ${s.locatie} (product zelf kiezen)`))]
  }).filter((r) => r.aantal > 0)
}
export function afwerkArbeid(p: Project): ArbeidRegel[] {
  if (!(p.type === 'stucwerk' ? p.scope.stucwerk : p.scope.sauswerk)) return []
  const s = afwerkingVan(p)
  return s.vlakken.filter((v) => v.m2 > 0 && v.urenPerM2 > 0).map((v) => ({ scope: afwerkId(v), omschrijving: `${v.naam} · ${v.afwerking}${v.kleur ? ' · ' + v.kleur : ''}${v.voorbereiding ? ' incl. voorbereiding' : ''} · ${vlakBtw(s, v)}% btw`, uren: Math.round(v.m2 * v.urenPerM2 * 10) / 10 }))
}
/** Onbekende/handmatig toegevoegde artikelen blijven veilig op 21%. */
export function afwerkRegelBtw(p: Project, sleutel: string): 9 | 21 {
  const s = afwerkingVan(p), v = s.vlakken.find((v) => sleutel === afwerkId(v) || ['primer', 'pleister', 'verf'].some((id) => sleutel === afwerkId(v) + '-' + id))
  return v ? vlakBtw(s, v) : 21
}
