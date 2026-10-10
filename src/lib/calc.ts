/**
 * Rekenmodule van Maatklaar.
 *
 * Alle formules zijn bewust eenvoudige, gangbare vuistregels uit de praktijk
 * (verbruiksopgaven van fabrikanten van tegellijm, voegmiddel, kit en
 * egaliseermiddel). Ze zijn bedoeld voor een eerste, onderbouwde raming — niet
 * als vervanging van de technische fiche van het gekozen product.
 *
 * Alle functies zijn puur (geen side effects) zodat ze eenvoudig te testen zijn.
 *
 * Ruimtetypes:
 * - badkamer / toilet: wand = omtrek × tegelhoogte − openingen; vloer = L × B.
 * - keuken: de te betegelen wand is de spatwand achter het aanrecht (lengte × hoogte);
 *   kit langs het werkblad en de zijkanten, profiel op bovenrand en zijkanten.
 * - vloer/woonkamer: geen wandtegels; laminaat/PVC per pak incl. snijverlies, ondervloer
 *   met 5% overlap, plinten langs de omtrek minus deuren (+10% zaagverlies).
 */
import { ruimte } from './ruimtes'
import type { Afmetingen, Opening, Project, ProjectType, Scope, TileSpec } from './types'

/** Vuistregels en verpakkingsgroottes. Eén plek, zodat ze makkelijk bij te stellen zijn. */
export const REGELS = {
  /** Tegellijm in kg/m², afhankelijk van de langste tegelzijde (grotere tegel = grotere lijmkam). */
  lijmKgPerM2(langsteZijdeCm: number): number {
    if (langsteZijdeCm <= 30) return 3.5 // lijmkam 6–8 mm
    if (langsteZijdeCm <= 60) return 4.5 // lijmkam 10 mm
    return 5.5 // groot formaat: lijmkam 12 mm + buttering
  },
  lijmZakKg: 25,

  /** Voegmiddel: kg/m² = (A + B) / (A × B) × voegbreedte × tegeldikte × dichtheid (A, B in mm). */
  voegDichtheid: 1.6,
  voegReserve: 0.1,
  voegZakKg: 5,

  /** Voorstrijkmiddel (primer) in liter per m². */
  primerLPerM2: 0.15,
  primerBusL: 5,

  /** Vloeibare waterdichting, 2 lagen samen, in kg/m². */
  waterdichtKgPerM2: 1.4,
  waterdichtEmmerKg: 7,
  /** Tot welke hoogte de douchewanden waterdicht worden gemaakt (m). */
  waterdichtHoogte: 2.1,
  afdichtbandRolM: 10,
  afdichtbandOverlap: 0.1,

  /** Egaliseermiddel in kg per m² per mm laagdikte. */
  egaliseerKgPerM2PerMm: 1.6,
  egaliseerZakKg: 25,

  /** Sanitairkit: voeg ca. 6×6 mm ≈ 36 ml/m → een koker van 310 ml ≈ 8 m (met verlies). */
  kitMeterPerKoker: 8,
  kitKokerMl: 310,
  /** 310 ml / 8 m = 38,75 ml kit per strekkende meter (incl. verlies) */
  kitMlPerM: 310 / 8,
  kitToiletM: 1.2,
  kitWastafelM: 1.5,
  kitGlaswandM: 4.0,

  /** Tegelprofielen worden verkocht per 2,5 m. */
  profielLengteM: 2.5,

  /** Tegelkruisjes / levelclips: één zak per 15 m² tegelwerk. */
  kruisjesM2PerZak: 15,

  /** Elektrische vloerverwarming bedekt ca. 70% van de vloer (niet onder douche/toilet/meubel). */
  vloerverwarmingDekking: 0.7,
  isolatieplaatM2: 0.72,

  /** Vochtbestendige pleister: 1,2 kg/m² per mm, gemiddeld 2 mm. */
  pleisterKgPerM2: 2.4,
  pleisterZakKg: 20,
  /** Badkamerverf: 0,1 L/m² per laag, 2 lagen. */
  verfLPerM2: 0.2,
  verfBusL: 2.5,

  /** Sloopafval: ca. 2,5 cm wandtegel + lijm en 8 cm vloer/dekvloer, × 1,5 volume-toename. */
  sloopWandM: 0.025,
  sloopVloerM: 0.08,
  sloopOpbulk: 1.5,
  bigBagM3: 1,
  /** Keuken: oude tegels + lijm zonder dekvloer (m). */
  sloopVloerDunM: 0.03,
  /** Woonkamer: oude laminaat/vloerbedekking incl. ondervloer (m). */
  sloopLegvloerM: 0.015,

  /** Fonteintje: kitvoeg rond fontein (m). */
  kitFonteinM: 1.0,

  /** Ondervloer: m² vloer + 5% overlap, rol à 10 m². */
  ondervloerOverlap: 0.05,
  ondervloerRolM2: 10,
  /** Plinten: omtrek − deuren + 10% zaag-/verstekverlies, lengtes van 2,4 m. */
  plintVerlies: 0.1,
  plintLengteM: 2.4,
  /** Montagekit voor plinten: ca. 12 m plint per koker van 310 ml. */
  montagekitMPerKoker: 12,

  /** Big bags tot dit volume; daarboven een afvalcontainer (m³). */
  containerVanafM3: 3,
  containerM3: 6,
  /** Zand-cement dekvloer: ca. 20 kg mortel per m² per cm, standaard 5 cm dik, zak à 25 kg. */
  dekvloerKgPerM2PerCm: 20,
  dekvloerDikteCm: 5,
  dekvloerZakKg: 25,
  /** Leidingwerk: meters waterleiding (warm + koud) per tappunt, afvoer 40/50 mm per tappunt, buislengte 2 m. */
  waterleidingMPerTappunt: 6,
  afvoerMPerTappunt: 3,
  buisLengteM: 2,
  /** Elektra: één inbouwspot per ca. 1,2 m² (minimaal 3), 2 spatwaterdichte stopcontacten. */
  spotM2: 1.2,
  spotsMin: 3,
  stopcontacten: 2,
  /** PVC-plafond: m² + 10% zaagverlies. */
  plafondVerlies: 0.1,
} as const

/** Indicatieve arbeidsnormen (uren) voor de offerte-raming. */
export const ARBEID = {
  sloopwerkPerM2: 0.4,
  waterdichtPerM2: 0.3,
  egaliserenPerM2: 0.25,
  egaliserenVast: 1,
  vloerverwarmingPerM2: 0.5,
  vloerverwarmingVast: 2,
  wandtegelsPerM2: 1.1,
  vloertegelsPerM2: 1.0,
  inloopdouche: 6,
  toilet: 5,
  wastafelmeubel: 3,
  kitwerkPerM: 0.15,
  stucwerkPerM2: 0.6,
  /** keuken: spatwand (veel snijwerk rond stopcontacten) */
  spatwandPerM2: 1.4,
  spatwandVast: 1,
  fontein: 3,
  /** woonkamer: oude vloer verwijderen */
  sloopLegvloerPerM2: 0.15,
  laminaatPerM2: 0.3,
  pvcPerM2: 0.35,
  ondervloerPerM2: 0.05,
  plintenPerM: 0.2,
  dekvloerPerM2: 0.6,
  dekvloerVast: 1,
  leidingwerkPerTappunt: 1.5,
  elektraVast: 3,
  elektraPerSpot: 0.25,
  radiator: 3,
  ventilatie: 2.5,
  bad: 5,
  deur: 2.5,
  plafondPerM2: 0.6,
} as const

/** Scope zonder werkzaamheden die niet bij het ruimtetype horen (bijv. na wisselen van type). */
export function effectieveScope(p: Pick<Project, 'scope'> & { type?: ProjectType }): Scope {
  const toegestaan = new Set(ruimte(p.type).werk)
  return Object.fromEntries(Object.entries(p.scope).map(([k, v]) => [k, Boolean(v) && toegestaan.has(k as keyof Scope)])) as Scope
}

const EPS = 1e-9
/** Naar boven afronden, zonder dat 3,0000000001 als 4 telt. */
export const omhoog = (n: number) => (n <= EPS ? 0 : Math.ceil(n - EPS))
export const rond = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const som = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const klem = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Onder- en bovenkant van een opening, gemeten vanaf de vloer. */
function bereik(o: Opening): [number, number] {
  const onder = o.type === 'deur' ? 0 : Math.max(0, o.vanafVloer)
  return [onder, onder + Math.max(0, o.hoogte)]
}

/** Overlap van [a1, a2] met [b1, b2]. */
const overlap = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))

/** Deel van een opening (m²) dat binnen de betegelde zone (0 → tegelhoogte) valt. */
export function openingInTegelzone(o: Opening, tegelhoogte: number): number {
  const [onder, boven] = bereik(o)
  return Math.max(0, o.breedte) * overlap(onder, boven, 0, tegelhoogte)
}

export interface Oppervlakken {
  /** omtrek van de vloer (m) */
  omtrek: number
  /** wandoppervlak tot tegelhoogte, zonder aftrek (m²) */
  wandBruto: number
  /** af te trekken openingen binnen de tegelzone (m²) */
  openingenAftrek: number
  /** te betegelen wandoppervlak (m²) */
  wandNetto: number
  /** vloeroppervlak (m²) */
  vloer: number
  /** plafond (m²) */
  plafond: number
  /** wand boven de tegels, minus openingen (m²) */
  wandBovenTegels: number
  /** totale breedte van deuren (m) — daar komt geen plint/kit/profiel */
  deurBreedte: number
  /** waterdicht te maken wand in de douchezone (m²) */
  douchezoneWand: number
  /** waterdicht te maken oppervlak: hele vloer + douchewanden (m²) */
  waterdichtOppervlak: number
  /** tegelhoogte, begrensd op de ruimtehoogte (m) */
  tegelhoogte: number
  /** ruimtetype waarvoor gerekend is */
  type: ProjectType
  /** spatwand achter het aanrecht (keuken, m²) */
  spatwand: number
  /** omtrek minus deuren: lengte plinten / naad vloer-wand (m) */
  plintLengte: number
}

/**
 * Oppervlakken van de ruimte. Bij een keuken is `wandNetto` de spatwand; bij vloer/woonkamer
 * worden geen wanden betegeld (`wandNetto` = 0).
 */
export function berekenOppervlakken(a: Afmetingen, scope: Partial<Pick<Scope, 'inloopdouche' | 'spatwand'>>, type: ProjectType = 'badkamer'): Oppervlakken {
  const L = Math.max(0, a.lengte)
  const B = Math.max(0, a.breedte)
  const H = Math.max(0, a.hoogte)
  if (type === 'keuken' || type === 'vloer') {
    const omtrek = 2 * (L + B)
    const vloer = L * B
    const deurBreedte = som(a.openingen.filter((o) => o.type === 'deur').map((o) => Math.max(0, o.breedte)))
    const sw = a.spatwand ?? { lengte: 0, hoogte: 0 }
    const spatwand = type === 'keuken' && scope.spatwand ? Math.max(0, sw.lengte) * klem(sw.hoogte, 0, H || sw.hoogte) : 0
    return {
      omtrek,
      wandBruto: spatwand,
      openingenAftrek: 0,
      wandNetto: spatwand,
      vloer,
      plafond: vloer,
      wandBovenTegels: 0,
      deurBreedte,
      douchezoneWand: 0,
      waterdichtOppervlak: vloer,
      tegelhoogte: type === 'keuken' ? Math.max(0, sw.hoogte) : 0,
      type,
      spatwand,
      plintLengte: Math.max(0, omtrek - deurBreedte),
    }
  }
  const th = klem(a.tegelhoogte, 0, H)
  const omtrek = 2 * (L + B)
  const wandBruto = omtrek * th
  const openingenAftrek = som(a.openingen.map((o) => openingInTegelzone(o, th)))
  const wandNetto = Math.max(0, wandBruto - openingenAftrek)
  const vloer = L * B
  const deurBreedte = som(a.openingen.filter((o) => o.type === 'deur').map((o) => Math.max(0, o.breedte)))
  const bovenAftrek = som(
    a.openingen.map((o) => {
      const [onder, boven] = bereik(o)
      return Math.max(0, o.breedte) * overlap(onder, boven, th, H)
    }),
  )
  const wandBovenTegels = Math.max(0, omtrek * (H - th) - bovenAftrek)
  const wdHoogte = Math.min(REGELS.waterdichtHoogte, H)
  const douchezoneWand = type === 'badkamer' && scope.inloopdouche
    ? (Math.max(0, a.douche.breedte) + Math.max(0, a.douche.diepte)) * wdHoogte
    : 0
  return {
    omtrek,
    wandBruto,
    openingenAftrek,
    wandNetto,
    vloer,
    plafond: vloer,
    wandBovenTegels,
    deurBreedte,
    douchezoneWand,
    waterdichtOppervlak: vloer + douchezoneWand,
    tegelhoogte: th,
    type,
    spatwand: 0,
    plintLengte: Math.max(0, omtrek - deurBreedte),
  }
}

/** Oppervlakken voor een project (houdt rekening met ruimtetype en scope). */
export const oppervlakkenVan = (p: Pick<Project, 'afmetingen' | 'scope'> & { type?: ProjectType }) =>
  berekenOppervlakken(p.afmetingen, effectieveScope(p), p.type ?? 'badkamer')

/** Tegels inclusief snijverlies, afgerond op hele dozen. */
export function tegelBehoefte(m2: number, tegel: TileSpec, snijverliesPct: number) {
  const m2Incl = m2 * (1 + Math.max(0, snijverliesPct) / 100)
  const dozen = tegel.m2PerDoos > 0 ? omhoog(m2Incl / tegel.m2PerDoos) : 0
  const tegelM2 = (tegel.lengte / 100) * (tegel.breedte / 100)
  const stuks = tegelM2 > 0 ? omhoog(m2Incl / tegelM2) : 0
  return { m2Incl, dozen, stuks, m2Gekocht: dozen * tegel.m2PerDoos }
}

/** Voegmiddelverbruik in kg/m² volgens de gangbare fabrikantformule. */
export function voegKgPerM2(tegel: TileSpec): number {
  const A = tegel.lengte * 10 // cm → mm
  const B = tegel.breedte * 10
  if (A <= 0 || B <= 0) return 0
  return ((A + B) / (A * B)) * tegel.voeg * tegel.dikte * REGELS.voegDichtheid
}

export const langsteZijde = (t: TileSpec) => Math.max(t.lengte, t.breedte)

/** Strekkende meters kitvoeg. */
export function kitLengte(p: Pick<Project, 'scope' | 'afmetingen'> & { type?: ProjectType }, o: Oppervlakken): number {
  const s = effectieveScope(p)
  let m = 0
  if (o.type === 'keuken') {
    // naad werkblad–spatwand + beide zijkanten van de spatwand
    if (s.spatwand) m += Math.max(0, p.afmetingen.spatwand.lengte) + 2 * Math.max(0, p.afmetingen.spatwand.hoogte)
    return m
  }
  if (o.type === 'vloer') return 0
  if (s.wandtegels || s.vloertegels) m += Math.max(0, o.omtrek - o.deurBreedte) // naad vloer-wand
  if (s.wandtegels) m += 4 * o.tegelhoogte // verticale binnenhoeken
  if (s.inloopdouche) m += REGELS.kitGlaswandM + Math.max(0, p.afmetingen.douche.breedte)
  if (s.toilet) m += REGELS.kitToiletM
  if (s.wastafelmeubel) m += REGELS.kitWastafelM
  if (s.fontein) m += REGELS.kitFonteinM
  return m
}

/** Strekkende meters tegelprofiel (bovenrand tegelwerk + dagkanten van ramen in de tegelzone). */
export function profielLengte(p: Pick<Project, 'scope' | 'afmetingen'> & { type?: ProjectType }, o: Oppervlakken): number {
  const s = effectieveScope(p)
  if (o.type === 'keuken') return s.spatwand ? Math.max(0, p.afmetingen.spatwand.lengte) + 2 * Math.max(0, p.afmetingen.spatwand.hoogte) : 0
  if (!s.wandtegels || o.type === 'vloer') return 0
  let m = 0
  if (o.tegelhoogte < p.afmetingen.hoogte - 0.01) m += Math.max(0, o.omtrek - o.deurBreedte)
  for (const op of p.afmetingen.openingen) {
    if (op.type !== 'raam') continue
    const [onder, boven] = bereik(op)
    const h = overlap(onder, boven, 0, o.tegelhoogte)
    if (h <= 0) continue
    const onderIn = onder < o.tegelhoogte
    const bovenIn = boven <= o.tegelhoogte
    m += 2 * h + (onderIn ? op.breedte : 0) + (bovenIn ? op.breedte : 0)
  }
  return m
}

export type Groep =
  | 'sloop'
  | 'voorbereiding'
  | 'waterdicht'
  | 'vloerverwarming'
  | 'tegels'
  | 'vloer'
  | 'lijm-voeg'
  | 'afwerking'
  | 'sanitair'
  | 'leidingwerk'
  | 'elektra'
  | 'timmerwerk'

export const GROEPEN: { id: Groep; naam: string }[] = [
  { id: 'sloop', naam: 'Sloop & afvoer' },
  { id: 'voorbereiding', naam: 'Ondergrond & dekvloer' },
  { id: 'leidingwerk', naam: 'Leidingwerk water & afvoer' },
  { id: 'elektra', naam: 'Elektra, verlichting & ventilatie' },
  { id: 'waterdicht', naam: 'Waterdicht maken' },
  { id: 'vloerverwarming', naam: 'Verwarming' },
  { id: 'tegels', naam: 'Tegels' },
  { id: 'vloer', naam: 'Vloer & plinten' },
  { id: 'lijm-voeg', naam: 'Lijm, voeg & toebehoren' },
  { id: 'afwerking', naam: 'Kit, profielen & afwerking' },
  { id: 'sanitair', naam: 'Sanitair' },
  { id: 'timmerwerk', naam: 'Deur, dorpel & plafond' },
]

export type ProductId =
  | 'wandtegel'
  | 'vloertegel'
  | 'tegellijm'
  | 'voegmiddel'
  | 'tegelkruisjes'
  | 'primer'
  | 'egaliseer'
  | 'waterdicht'
  | 'afdichtband'
  | 'afdichtmanchet'
  | 'vv-mat'
  | 'vv-thermostaat'
  | 'isolatieplaat'
  | 'kit'
  | 'profiel'
  | 'pleister'
  | 'verf'
  | 'glaswand'
  | 'douchegoot'
  | 'regendouche'
  | 'inbouwreservoir'
  | 'hangtoilet'
  | 'bedieningsplaat'
  | 'wastafelmeubel'
  | 'wastafelkraan'
  | 'spiegel'
  | 'sifon'
  | 'bigbag'
  | 'afdekset'
  | 'fontein'
  | 'laminaat'
  | 'pvc'
  | 'ondervloer'
  | 'plint'
  | 'montagekit'
  | 'container'
  | 'afvalverwerking'
  | 'dekvloer'
  | 'waterleiding'
  | 'afvoerbuis'
  | 'afvoerbuis110'
  | 'koppelingen'
  | 'installatiemateriaal'
  | 'aardlekgroep'
  | 'inbouwspot'
  | 'stopcontact'
  | 'ventilator'
  | 'ventilatiekanaal'
  | 'designradiator'
  | 'radiatoraansluitset'
  | 'ligbad'
  | 'badkraan'
  | 'badafvoer'
  | 'binnendeur'
  | 'dorpel'
  | 'deurbeslag'
  | 'pvc-plafond'
  | 'plafondprofielen'

export interface MateriaalRegel {
  id: ProductId
  groep: Groep
  naam: string
  /** specificatie, bijv. "30 × 60 cm" */
  spec?: string
  /** berekende benodigde hoeveelheid (basiseenheid) */
  nodig: number
  nodigEenheid: string
  /** aantal te kopen verpakkingen/stuks */
  aantal: number
  /** omschrijving verpakking, bijv. "doos à 1,44 m²" */
  verpakking: string
  /**
   * Standaard inhoud van één verpakking in `nodigEenheid` (bijv. 25 bij een zak van 25 kg).
   * Alleen gezet bij artikelen waarvan een winkel een andere verpakkingsgrootte kan hebben.
   */
  inhoud?: number
  /** soort verpakking, bijv. "zak" — voor het label bij een afwijkende inhoud */
  verpakkingSoort?: string
  /** aantal prijseenheden (m² bij tegels, anders = aantal) */
  prijsAantal: number
  /** korte onderbouwing van de berekening */
  toelichting: string
}

const nl = (n: number, d = 2) =>
  new Intl.NumberFormat('nl-NL', { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(rond(n, d))
const fmtTegel = (t: TileSpec) => `${nl(t.lengte, 1)} × ${nl(t.breedte, 1)} cm`

/** Berekent alle materialen voor een project. */
export function berekenMaterialen(p: Project): MateriaalRegel[] {
  const s = effectieveScope(p)
  const type = p.type ?? 'badkamer'
  const o = berekenOppervlakken(p.afmetingen, s, type)
  const sv = p.snijverlies
  const regels: MateriaalRegel[] = []
  const add = (r: MateriaalRegel) => {
    if (r.aantal > 0) regels.push(r)
  }

  // — Sloop & afvoer
  if (s.container && !s.sloopwerk) {
    add({ id: 'container', groep: 'sloop', naam: 'Huur afvalcontainer (plaatsen, huurperiode, ophalen)', spec: `${REGELS.containerM3} m³`, nodig: 1, nodigEenheid: 'stuk', aantal: 1, verpakking: 'stuk', prijsAantal: 1, toelichting: 'Container zonder sloopwerk: 1 stuk' })
  }
  if (s.sloopwerk) {
    const vloerDikte = type === 'vloer' ? REGELS.sloopLegvloerM : type === 'keuken' ? REGELS.sloopVloerDunM : REGELS.sloopVloerM
    const m3 = (o.wandNetto * REGELS.sloopWandM + o.vloer * vloerDikte) * REGELS.sloopOpbulk
    const wandDeel = o.wandNetto > 0 ? `${nl(o.wandNetto)} m² ${type === 'keuken' ? 'spatwand' : 'wand'} × 2,5 cm + ` : ''
    const uitleg = `(${wandDeel}${nl(o.vloer)} m² vloer × ${nl(vloerDikte * 100, 1)} cm) × 1,5 opbulk ≈ ${nl(m3)} m³`
    // Container: zelf aan te zetten ('Huur container'); bij oude projecten zonder keuze automatisch boven 3 m³.
    const metContainer = p.scope.container ?? m3 > REGELS.containerVanafM3
    if (metContainer && ruimte(type).werk.includes('container')) {
      const n = Math.max(1, omhoog(m3 / REGELS.containerM3))
      add({
        id: 'container', groep: 'sloop', naam: 'Huur afvalcontainer (plaatsen, huurperiode, ophalen)', spec: `${REGELS.containerM3} m³`,
        nodig: m3, nodigEenheid: 'm³', aantal: n, verpakking: 'stuk', prijsAantal: n,
        toelichting: `${uitleg} → ${n} container${n === 1 ? '' : 's'} à ${REGELS.containerM3} m³`,
      })
      const st = Math.max(1, omhoog(m3))
      add({
        id: 'afvalverwerking', groep: 'sloop', naam: 'Afvalverwerking (stortkosten)', spec: 'per m³',
        nodig: m3, nodigEenheid: 'm³', aantal: st, verpakking: 'm³', prijsAantal: st,
        toelichting: `${nl(m3)} m³ bouw- en sloopafval storten`,
      })
    } else {
      const n = Math.max(1, omhoog(m3 / REGELS.bigBagM3))
      add({
        id: 'bigbag', groep: 'sloop', naam: 'Big bag voor puin', spec: 'inhoud 1 m³',
        nodig: m3, nodigEenheid: 'm³', aantal: n, verpakking: 'stuk', prijsAantal: n, toelichting: uitleg,
      })
      add({
        id: 'afvalverwerking', groep: 'sloop', naam: 'Afvalverwerking (ophalen en storten)', spec: 'per m³',
        nodig: n, nodigEenheid: 'm³', aantal: n, verpakking: 'm³', prijsAantal: n,
        toelichting: `${n} big bag${n === 1 ? '' : 's'} à 1 m³ laten ophalen en storten`,
      })
    }
    add({
      id: 'afdekset', groep: 'sloop', naam: 'Afdekfolie, stucloper & stofmaskers',
      nodig: 1, nodigEenheid: 'set', aantal: 1, verpakking: 'set', prijsAantal: 1,
      toelichting: 'Vaste post per project',
    })
  }

  // — Voorbereiding
  const tegelVloer = s.vloertegels || s.egaliseren
  const tegelWand = type === 'keuken' ? s.spatwand : s.wandtegels
  const primerM2 = (tegelWand ? o.wandNetto : 0) + (tegelVloer ? o.vloer : 0) + (s.stucwerk ? o.plafond + o.wandBovenTegels : 0)
  if (primerM2 > 0) {
    const liter = primerM2 * REGELS.primerLPerM2
    const bussen = omhoog(liter / REGELS.primerBusL)
    add({
      id: 'primer', groep: 'voorbereiding', naam: 'Voorstrijkmiddel (primer)',
      nodig: liter, nodigEenheid: 'L', aantal: bussen, verpakking: `bus à ${REGELS.primerBusL} L`, prijsAantal: bussen, inhoud: REGELS.primerBusL, verpakkingSoort: 'bus',
      toelichting: `${nl(primerM2)} m² × ${nl(REGELS.primerLPerM2)} L/m² = ${nl(liter)} L`,
    })
  }
  if (s.egaliseren) {
    const kg = o.vloer * p.afmetingen.egaliseerDikte * REGELS.egaliseerKgPerM2PerMm
    const zakken = omhoog(kg / REGELS.egaliseerZakKg)
    add({
      id: 'egaliseer', groep: 'voorbereiding', naam: 'Egaliseermiddel',
      nodig: kg, nodigEenheid: 'kg', aantal: zakken, verpakking: `zak à ${REGELS.egaliseerZakKg} kg`, prijsAantal: zakken, inhoud: REGELS.egaliseerZakKg, verpakkingSoort: 'zak',
      toelichting: `${nl(o.vloer)} m² × ${nl(p.afmetingen.egaliseerDikte, 1)} mm × ${nl(REGELS.egaliseerKgPerM2PerMm)} kg/m²/mm = ${nl(kg, 1)} kg`,
    })
  }

  if (s.dekvloer && o.vloer > 0) {
    const kg = o.vloer * REGELS.dekvloerDikteCm * REGELS.dekvloerKgPerM2PerCm
    const zakken = omhoog(kg / REGELS.dekvloerZakKg)
    add({
      id: 'dekvloer', groep: 'voorbereiding', naam: 'Zand-cementmortel (dekvloer)', spec: `${REGELS.dekvloerDikteCm} cm dik`,
      nodig: kg, nodigEenheid: 'kg', aantal: zakken, verpakking: `zak à ${REGELS.dekvloerZakKg} kg`, prijsAantal: zakken, inhoud: REGELS.dekvloerZakKg, verpakkingSoort: 'zak',
      toelichting: `${nl(o.vloer)} m² × ${REGELS.dekvloerDikteCm} cm × ${REGELS.dekvloerKgPerM2PerCm} kg/m²/cm = ${nl(kg, 0)} kg`,
    })
  }

  // — Leidingwerk
  const tp = tappunten(s, type)
  if (s.leidingwerk && tp.totaal > 0) {
    const water = tp.totaal * REGELS.waterleidingMPerTappunt
    add({
      id: 'waterleiding', groep: 'leidingwerk', naam: 'Waterleiding meerlagenbuis', spec: '16 mm, warm en koud',
      nodig: water, nodigEenheid: 'm', aantal: water, verpakking: 'm', prijsAantal: water,
      toelichting: `${tp.totaal} tappunt${tp.totaal === 1 ? '' : 'en'} × ${REGELS.waterleidingMPerTappunt} m`,
    })
    const klein = tp.totaal - tp.toilet
    if (klein > 0) {
      const m = klein * REGELS.afvoerMPerTappunt
      const n = omhoog(m / REGELS.buisLengteM)
      add({
        id: 'afvoerbuis', groep: 'leidingwerk', naam: 'Afvoerbuis PVC 40/50 mm', spec: `lengte ${REGELS.buisLengteM} m`,
        nodig: m, nodigEenheid: 'm', aantal: n, verpakking: `lengte à ${REGELS.buisLengteM} m`, prijsAantal: n, inhoud: REGELS.buisLengteM, verpakkingSoort: 'lengte',
        toelichting: `${klein} afvoerpunt${klein === 1 ? '' : 'en'} × ${REGELS.afvoerMPerTappunt} m`,
      })
    }
    if (tp.toilet) add({ id: 'afvoerbuis110', groep: 'leidingwerk', naam: 'Afvoerbuis PVC 110 mm (toilet)', spec: `lengte ${REGELS.buisLengteM} m`, nodig: 1, nodigEenheid: 'stuk', aantal: 1, verpakking: 'stuk', prijsAantal: 1, toelichting: 'Eén lengte voor de toiletafvoer' })
    add({ id: 'koppelingen', groep: 'leidingwerk', naam: 'Fittingen, koppelingen & stopkranen', nodig: 1, nodigEenheid: 'set', aantal: 1, verpakking: 'set', prijsAantal: 1, toelichting: 'Eén set per ruimte' })
  }

  // — Elektra, verlichting & ventilatie
  if (s.elektra) {
    const spots = Math.max(REGELS.spotsMin, omhoog(o.vloer / REGELS.spotM2))
    add({ id: 'aardlekgroep', groep: 'elektra', naam: 'Aardlekautomaat (extra groep)', nodig: 1, nodigEenheid: 'stuk', aantal: 1, verpakking: 'stuk', prijsAantal: 1, toelichting: 'Badkamer op een eigen groep met aardlekbeveiliging' })
    add({ id: 'inbouwspot', groep: 'elektra', naam: 'LED-inbouwspot IP44', spec: 'dimbaar', nodig: spots, nodigEenheid: 'stuk', aantal: spots, verpakking: 'stuk', prijsAantal: spots, toelichting: `${nl(o.vloer)} m² ÷ ${nl(REGELS.spotM2, 1)} m² per spot (min. ${REGELS.spotsMin})` })
    add({ id: 'stopcontact', groep: 'elektra', naam: 'Stopcontact spatwaterdicht', nodig: REGELS.stopcontacten, nodigEenheid: 'stuk', aantal: REGELS.stopcontacten, verpakking: 'stuk', prijsAantal: REGELS.stopcontacten, toelichting: 'Bij wastafel/spiegel en voor de föhn' })
    add({ id: 'installatiemateriaal', groep: 'elektra', naam: 'Installatiemateriaal (draad, buis, dozen, schakelaar)', nodig: 1, nodigEenheid: 'set', aantal: 1, verpakking: 'set', prijsAantal: 1, toelichting: 'Vaste post per ruimte' })
  }
  if (s.ventilatie) {
    add({ id: 'ventilator', groep: 'elektra', naam: 'Badkamerventilator met vochtsensor', spec: 'Ø 100 mm', nodig: 1, nodigEenheid: 'stuk', aantal: 1, verpakking: 'stuk', prijsAantal: 1, toelichting: 'Eén per ruimte' })
    add({ id: 'ventilatiekanaal', groep: 'elektra', naam: 'Ventilatieslang & doorvoer', nodig: 1, nodigEenheid: 'set', aantal: 1, verpakking: 'set', prijsAantal: 1, toelichting: 'Aansluiting op kanaal of gevel' })
  }

  // — Waterdicht
  if (s.waterdicht) {
    const kg = o.waterdichtOppervlak * REGELS.waterdichtKgPerM2
    const emmers = omhoog(kg / REGELS.waterdichtEmmerKg)
    add({
      id: 'waterdicht', groep: 'waterdicht', naam: 'Vloeibare waterdichting (2 lagen)',
      nodig: kg, nodigEenheid: 'kg', aantal: emmers, verpakking: `emmer à ${REGELS.waterdichtEmmerKg} kg`, prijsAantal: emmers, inhoud: REGELS.waterdichtEmmerKg, verpakkingSoort: 'emmer',
      toelichting: `(${nl(o.vloer)} m² vloer + ${nl(o.douchezoneWand)} m² douchewand) × ${nl(REGELS.waterdichtKgPerM2)} kg/m² = ${nl(kg, 1)} kg`,
    })
    const hoek = s.inloopdouche ? Math.min(REGELS.waterdichtHoogte, p.afmetingen.hoogte) * 2 : 0
    const band = (Math.max(0, o.omtrek - o.deurBreedte) + hoek) * (1 + REGELS.afdichtbandOverlap)
    const rollen = omhoog(band / REGELS.afdichtbandRolM)
    add({
      id: 'afdichtband', groep: 'waterdicht', naam: 'Afdichtband',
      nodig: band, nodigEenheid: 'm', aantal: rollen, verpakking: `rol à ${REGELS.afdichtbandRolM} m`, prijsAantal: rollen, inhoud: REGELS.afdichtbandRolM, verpakkingSoort: 'rol',
      toelichting: `Naad vloer-wand${s.inloopdouche ? ' + 2 hoeknaden douche' : ''} + 10% overlap = ${nl(band, 1)} m`,
    })
    add({
      id: 'afdichtmanchet', groep: 'waterdicht', naam: 'Afdichtmanchetten (afvoer & leidingen)',
      nodig: 1, nodigEenheid: 'set', aantal: 1, verpakking: 'set', prijsAantal: 1,
      toelichting: 'Eén set voor afvoer en leidingdoorvoeren',
    })
  }

  // — Vloerverwarming
  if (s.vloerverwarming) {
    const mat = Math.max(1, Math.floor(o.vloer * REGELS.vloerverwarmingDekking * 2) / 2)
    add({
      id: 'vv-mat', groep: 'vloerverwarming', naam: 'Elektrische vloerverwarmingsmat', spec: '150 W/m²',
      nodig: mat, nodigEenheid: 'm²', aantal: mat, verpakking: 'm²', prijsAantal: mat,
      toelichting: `${nl(o.vloer)} m² × 70% vrije vloer, afgerond op 0,5 m² = ${nl(mat, 1)} m²`,
    })
    add({
      id: 'vv-thermostaat', groep: 'vloerverwarming', naam: 'Klokthermostaat met vloersensor', spec: 'inbouw',
      nodig: 1, nodigEenheid: 'stuk', aantal: 1, verpakking: 'stuk', prijsAantal: 1,
      toelichting: 'Eén thermostaat per ruimte',
    })
    const platen = omhoog(o.vloer / REGELS.isolatieplaatM2)
    add({
      id: 'isolatieplaat', groep: 'vloerverwarming', naam: 'Isolatieplaat XPS', spec: '6 mm · 120 × 60 cm',
      nodig: o.vloer, nodigEenheid: 'm²', aantal: platen, verpakking: `plaat à ${nl(REGELS.isolatieplaatM2)} m²`, prijsAantal: platen, inhoud: REGELS.isolatieplaatM2, verpakkingSoort: 'plaat',
      toelichting: `${nl(o.vloer)} m² ÷ ${nl(REGELS.isolatieplaatM2)} m² per plaat`,
    })
  }

  if (s.radiator) {
    add({ id: 'designradiator', groep: 'vloerverwarming', naam: 'Designradiator', spec: 'ca. 180 × 60 cm', nodig: 1, nodigEenheid: 'stuk', aantal: 1, verpakking: 'stuk', prijsAantal: 1, toelichting: 'Eén per ruimte' })
    add({ id: 'radiatoraansluitset', groep: 'vloerverwarming', naam: 'Radiatoraansluitset (kranen & koppelingen)', nodig: 1, nodigEenheid: 'set', aantal: 1, verpakking: 'set', prijsAantal: 1, toelichting: 'Eén per radiator' })
  }

  // — Tegels, lijm en voeg
  let tegelM2Totaal = 0
  let lijmKg = 0
  let voegKg = 0
  const lijmUitleg: string[] = []
  const voegUitleg: string[] = []
  const tegelTypes: [ProductId, string, number, TileSpec, boolean][] = [
    ['wandtegel', type === 'keuken' ? 'Wandtegels spatwand' : 'Wandtegels', o.wandNetto, p.wandtegel, tegelWand],
    ['vloertegel', 'Vloertegels', o.vloer, p.vloertegel, s.vloertegels],
  ]
  for (const [id, naam, m2, tegel, actief] of tegelTypes) {
    if (!actief || m2 <= 0) continue
    const t = tegelBehoefte(m2, tegel, sv)
    tegelM2Totaal += m2
    add({
      id, groep: 'tegels', naam, spec: fmtTegel(tegel),
      nodig: t.m2Incl, nodigEenheid: 'm²', aantal: t.dozen, verpakking: `doos à ${nl(tegel.m2PerDoos)} m²`,
      prijsAantal: t.m2Gekocht,
      toelichting: `${nl(m2)} m² + ${nl(sv, 1)}% snijverlies = ${nl(t.m2Incl)} m² (≈ ${t.stuks} tegels)`,
    })
    const kgm2 = REGELS.lijmKgPerM2(langsteZijde(tegel))
    lijmKg += m2 * kgm2
    lijmUitleg.push(`${nl(m2)} m² × ${nl(kgm2, 1)} kg/m²`)
    const v = voegKgPerM2(tegel)
    voegKg += m2 * v
    voegUitleg.push(`${nl(m2)} m² × ${nl(v)} kg/m²`)
  }
  // — Laminaat / PVC, ondervloer en plinten (vloer & woonkamer)
  if (s.legvloer && o.vloer > 0) {
    const lv = p.legvloer
    const pak = lv.m2PerPak > 0 ? lv.m2PerPak : 2
    const m2Incl = o.vloer * (1 + Math.max(0, sv) / 100)
    const pakken = omhoog(m2Incl / pak)
    const pvc = lv.soort === 'pvc'
    add({
      id: pvc ? 'pvc' : 'laminaat', groep: 'vloer', naam: pvc ? 'PVC-klikvloer' : 'Laminaat', spec: pvc ? 'klik, incl. toplaag 0,55 mm' : 'klik, AC4',
      nodig: m2Incl, nodigEenheid: 'm²', aantal: pakken, verpakking: `pak à ${nl(pak)} m²`, prijsAantal: pakken * pak,
      toelichting: `${nl(o.vloer)} m² + ${nl(sv, 1)}% snijverlies = ${nl(m2Incl)} m² ÷ ${nl(pak)} m² per pak`,
    })
  }
  if (s.ondervloer && o.vloer > 0) {
    const m2 = o.vloer * (1 + REGELS.ondervloerOverlap)
    const rollen = omhoog(m2 / REGELS.ondervloerRolM2)
    add({
      id: 'ondervloer', groep: 'vloer', naam: 'Ondervloer', spec: s.legvloer && p.legvloer.soort === 'pvc' ? 'voor PVC, 1,5 mm' : 'voor laminaat, 3 mm',
      nodig: m2, nodigEenheid: 'm²', aantal: rollen, verpakking: `rol à ${REGELS.ondervloerRolM2} m²`, prijsAantal: rollen, inhoud: REGELS.ondervloerRolM2, verpakkingSoort: 'rol',
      toelichting: `${nl(o.vloer)} m² + 5% overlap = ${nl(m2)} m². Op een stenen vloer: kies een ondervloer met dampremmende laag.`,
    })
  }
  if (s.plinten && o.plintLengte > 0) {
    const m = o.plintLengte * (1 + REGELS.plintVerlies)
    const stuks = omhoog(m / REGELS.plintLengteM)
    add({
      id: 'plint', groep: 'vloer', naam: 'Plinten MDF wit', spec: '7 cm hoog',
      nodig: m, nodigEenheid: 'm', aantal: stuks, verpakking: `lengte à ${nl(REGELS.plintLengteM, 1)} m`, prijsAantal: stuks, inhoud: REGELS.plintLengteM, verpakkingSoort: 'lengte',
      toelichting: `(${nl(o.omtrek)} m omtrek − ${nl(o.deurBreedte)} m deuren) + 10% zaagverlies = ${nl(m, 1)} m`,
    })
    const kokers = omhoog(o.plintLengte / REGELS.montagekitMPerKoker)
    add({
      id: 'montagekit', groep: 'vloer', naam: 'Montagekit voor plinten',
      nodig: kokers * REGELS.kitKokerMl, nodigEenheid: 'ml', aantal: kokers, verpakking: `koker à ${REGELS.kitKokerMl} ml`, prijsAantal: kokers, inhoud: REGELS.kitKokerMl, verpakkingSoort: 'koker',
      toelichting: `${nl(o.plintLengte, 1)} m plint ÷ ${REGELS.montagekitMPerKoker} m per koker`,
    })
  }

  if (lijmKg > 0) {
    const zakken = omhoog(lijmKg / REGELS.lijmZakKg)
    add({
      id: 'tegellijm', groep: 'lijm-voeg', naam: 'Flexibele tegellijm (C2TE S1)',
      nodig: lijmKg, nodigEenheid: 'kg', aantal: zakken, verpakking: `zak à ${REGELS.lijmZakKg} kg`, prijsAantal: zakken, inhoud: REGELS.lijmZakKg, verpakkingSoort: 'zak',
      toelichting: `${lijmUitleg.join(' + ')} = ${nl(lijmKg, 1)} kg`,
    })
  }
  if (voegKg > 0) {
    const kg = voegKg * (1 + REGELS.voegReserve)
    const zakken = omhoog(kg / REGELS.voegZakKg)
    add({
      id: 'voegmiddel', groep: 'lijm-voeg', naam: 'Flexibel voegmiddel',
      nodig: kg, nodigEenheid: 'kg', aantal: zakken, verpakking: `zak à ${REGELS.voegZakKg} kg`, prijsAantal: zakken, inhoud: REGELS.voegZakKg, verpakkingSoort: 'zak',
      toelichting: `${voegUitleg.join(' + ')} + 10% reserve = ${nl(kg, 1)} kg`,
    })
  }
  if (tegelM2Totaal > 0) {
    const zakken = omhoog(tegelM2Totaal / REGELS.kruisjesM2PerZak)
    add({
      id: 'tegelkruisjes', groep: 'lijm-voeg', naam: 'Tegelkruisjes / levelclips',
      nodig: tegelM2Totaal, nodigEenheid: 'm²', aantal: zakken, verpakking: 'zak', prijsAantal: zakken,
      toelichting: `1 zak per ${REGELS.kruisjesM2PerZak} m² tegelwerk`,
    })
  }

  // — Afwerking
  if (s.kitwerk) {
    const m = kitLengte(p, o)
    const kokers = omhoog(m / REGELS.kitMeterPerKoker)
    add({
      id: 'kit', groep: 'afwerking', naam: type === 'keuken' ? 'Sanitairkit (keuken, schimmelwerend)' : 'Sanitairkit (schimmelwerend)',
      nodig: m * REGELS.kitMlPerM, nodigEenheid: 'ml', aantal: kokers, verpakking: `koker à ${REGELS.kitKokerMl} ml`, prijsAantal: kokers, inhoud: REGELS.kitKokerMl, verpakkingSoort: 'koker',
      toelichting: type === 'keuken'
        ? `Werkblad ${nl(p.afmetingen.spatwand.lengte)} m + 2 zijkanten = ${nl(m, 1)} m kitvoeg ÷ ${REGELS.kitMeterPerKoker} m per koker`
        : `${nl(m, 1)} m kitvoeg ÷ ${REGELS.kitMeterPerKoker} m per koker`,
    })
  }
  const prof = profielLengte(p, o)
  if (prof > 0) {
    const stuks = omhoog(prof / REGELS.profielLengteM)
    add({
      id: 'profiel', groep: 'afwerking', naam: 'Tegelprofiel / hoekstrip aluminium', spec: `voor ${nl(p.wandtegel.dikte, 1)} mm tegel`,
      nodig: prof, nodigEenheid: 'm', aantal: stuks, verpakking: `lengte à ${nl(REGELS.profielLengteM, 1)} m`, prijsAantal: stuks, inhoud: REGELS.profielLengteM, verpakkingSoort: 'lengte',
      toelichting: type === 'keuken' ? `Bovenrand en zijkanten spatwand = ${nl(prof, 1)} m` : `Bovenrand tegelwerk en dagkanten ramen = ${nl(prof, 1)} m`,
    })
  }
  if (s.stucwerk) {
    const m2 = o.plafond + o.wandBovenTegels
    const kg = m2 * REGELS.pleisterKgPerM2
    const zakken = omhoog(kg / REGELS.pleisterZakKg)
    add({
      id: 'pleister', groep: 'afwerking', naam: 'Vochtbestendige pleister',
      nodig: kg, nodigEenheid: 'kg', aantal: zakken, verpakking: `zak à ${REGELS.pleisterZakKg} kg`, prijsAantal: zakken, inhoud: REGELS.pleisterZakKg, verpakkingSoort: 'zak',
      toelichting: `(${nl(o.plafond)} m² plafond + ${nl(o.wandBovenTegels)} m² wand) × ${nl(REGELS.pleisterKgPerM2, 1)} kg/m² = ${nl(kg, 1)} kg`,
    })
    const liter = m2 * REGELS.verfLPerM2
    const bussen = omhoog(liter / REGELS.verfBusL)
    add({
      id: 'verf', groep: 'afwerking', naam: 'Badkamerverf (anti-schimmel)',
      nodig: liter, nodigEenheid: 'L', aantal: bussen, verpakking: `bus à ${nl(REGELS.verfBusL, 1)} L`, prijsAantal: bussen, inhoud: REGELS.verfBusL, verpakkingSoort: 'bus',
      toelichting: `${nl(m2)} m² × 2 lagen × 0,1 L/m² = ${nl(liter, 1)} L`,
    })
  }

  // — Sanitair (vaste aantallen)
  const stuk = (id: ProductId, naam: string, spec: string, toelichting: string) =>
    add({ id, groep: 'sanitair', naam, spec, nodig: 1, nodigEenheid: 'stuk', aantal: 1, verpakking: 'stuk', prijsAantal: 1, toelichting })
  if (s.inloopdouche) {
    const goot = Math.max(0.3, Math.round((p.afmetingen.douche.breedte - 0.1) * 10) / 10)
    stuk('glaswand', 'Inloopdouche glaswand', '8 mm helder glas · 200 cm hoog', 'Eén wand voor de douchezone')
    stuk('douchegoot', 'Douchegoot RVS', `${nl(goot * 100, 0)} cm`, `Doucheruimte ${nl(p.afmetingen.douche.breedte * 100, 0)} cm − 10 cm`)
    stuk('regendouche', 'Thermostatische regendoucheset (incl. kraan)', 'opbouw', 'Eén set per douche')
  }
  if (s.toilet) {
    stuk('inbouwreservoir', 'Inbouwreservoir', 'voor hangtoilet', 'Vast per toilet')
    stuk('hangtoilet', 'Hangtoilet randloos', 'incl. softclose zitting', 'Vast per toilet')
    stuk('bedieningsplaat', 'Bedieningsplaat', 'dual flush', 'Vast per toilet')
  }
  if (s.wastafelmeubel) {
    stuk('wastafelmeubel', 'Wastafelmeubel met wastafel', '80 cm', 'Vast per badkamer')
    stuk('wastafelkraan', 'Wastafelkraan', 'eengreeps', 'Vast per wastafel')
    stuk('spiegel', 'Spiegel met verlichting', '80 cm', 'Vast per wastafel')
    stuk('sifon', 'Sifon & afvoerset', 'design', 'Vast per wastafel')
  }
  if (s.fontein) {
    stuk('fontein', 'Fonteinset compleet', 'fontein, kraan, sifon en stopkraan', 'Vast per toilet')
  }
  if (s.bad) {
    stuk('ligbad', 'Ligbad acryl', '170 × 75 cm, incl. poten', 'Vast per bad')
    stuk('badkraan', 'Thermostatische badkraan', 'met handdouche', 'Vast per bad')
    stuk('badafvoer', 'Badafvoer met overloop', 'waste', 'Vast per bad')
  }

  // — Deur, dorpel & plafond
  const tim = (id: ProductId, naam: string, spec: string, toelichting: string) =>
    add({ id, groep: 'timmerwerk', naam, spec, nodig: 1, nodigEenheid: 'stuk', aantal: 1, verpakking: 'stuk', prijsAantal: 1, toelichting })
  if (s.deur) {
    tim('binnendeur', 'Binnendeur', 'opdek, wit gegrond', 'Eén deur')
    tim('dorpel', 'Dorpel kunststeen', '93 cm', 'Onder de deur, waterkerend')
    tim('deurbeslag', 'Deurbeslag met wc-/badkamersluiting', 'RVS', 'Eén set')
  }
  if (s.plafond && o.plafond > 0) {
    const m2 = rond(o.plafond * (1 + REGELS.plafondVerlies), 1)
    add({ id: 'pvc-plafond', groep: 'timmerwerk', naam: 'PVC-plafondpanelen', spec: 'vochtbestendig', nodig: m2, nodigEenheid: 'm²', aantal: m2, verpakking: 'm²', prijsAantal: m2, toelichting: `${nl(o.plafond)} m² + 10% zaagverlies` })
    tim('plafondprofielen', 'Regelwerk & afwerkprofielen plafond', 'set', 'Vaste post per plafond')
  }

  return regels
}

export interface ArbeidRegel {
  scope: keyof typeof ARBEID | string
  omschrijving: string
  uren: number
}

/** Tappunten voor het leidingwerk (douche, bad, wastafel, toilet, fontein). */
export function tappunten(s: Scope, type: ProjectType) {
  const toilet = s.toilet ? 1 : 0
  const totaal = (s.inloopdouche ? 1 : 0) + (s.bad ? 1 : 0) + (s.wastafelmeubel ? 1 : 0) + toilet + (s.fontein ? 1 : 0) + (type === 'keuken' ? 1 : 0)
  return { totaal, toilet }
}

/** Indicatieve arbeidsuren per onderdeel. */
export function berekenArbeid(p: Project): ArbeidRegel[] {
  const s = effectieveScope(p)
  const type = p.type ?? 'badkamer'
  const o = berekenOppervlakken(p.afmetingen, s, type)
  const r: ArbeidRegel[] = []
  const add = (scope: string, omschrijving: string, uren: number) => {
    if (uren > 0) r.push({ scope, omschrijving, uren: rond(uren, 1) })
  }
  if (s.sloopwerk)
    add('sloopwerk', type === 'vloer' ? 'Oude vloer verwijderen' : 'Sloopwerk en afvoer', type === 'vloer' ? o.vloer * ARBEID.sloopLegvloerPerM2 : (o.wandNetto + o.vloer) * ARBEID.sloopwerkPerM2)
  if (s.egaliseren) add('egaliseren', 'Vloer egaliseren', o.vloer * ARBEID.egaliserenPerM2 + ARBEID.egaliserenVast)
  if (s.waterdicht) add('waterdicht', 'Waterdicht maken', o.waterdichtOppervlak * ARBEID.waterdichtPerM2)
  if (s.vloerverwarming) add('vloerverwarming', 'Vloerverwarming leggen', o.vloer * ARBEID.vloerverwarmingPerM2 + ARBEID.vloerverwarmingVast)
  if (s.wandtegels && type !== 'keuken') add('wandtegels', 'Wandtegels zetten', o.wandNetto * ARBEID.wandtegelsPerM2)
  if (s.spatwand && type === 'keuken') add('spatwand', 'Spatwand tegelen', o.wandNetto * ARBEID.spatwandPerM2 + ARBEID.spatwandVast)
  if (s.legvloer) add('legvloer', p.legvloer.soort === 'pvc' ? 'PVC-vloer leggen' : 'Laminaat leggen', o.vloer * (p.legvloer.soort === 'pvc' ? ARBEID.pvcPerM2 : ARBEID.laminaatPerM2))
  if (s.ondervloer) add('ondervloer', 'Ondervloer leggen', o.vloer * ARBEID.ondervloerPerM2)
  if (s.plinten) add('plinten', 'Plinten plaatsen', o.plintLengte * ARBEID.plintenPerM)
  if (s.vloertegels) add('vloertegels', 'Vloertegels leggen', o.vloer * ARBEID.vloertegelsPerM2)
  if (s.inloopdouche) add('inloopdouche', 'Inloopdouche plaatsen', ARBEID.inloopdouche)
  if (s.toilet) add('toilet', 'Hangtoilet plaatsen', ARBEID.toilet)
  if (s.wastafelmeubel) add('wastafelmeubel', 'Wastafelmeubel plaatsen', ARBEID.wastafelmeubel)
  if (s.fontein) add('fontein', 'Fonteintje plaatsen', ARBEID.fontein)
  if (s.kitwerk) add('kitwerk', 'Kitwerk', kitLengte(p, o) * ARBEID.kitwerkPerM)
  if (s.stucwerk) add('stucwerk', 'Stucwerk en schilderen', (o.plafond + o.wandBovenTegels) * ARBEID.stucwerkPerM2)
  if (s.dekvloer) add('dekvloer', 'Dekvloer storten', o.vloer * ARBEID.dekvloerPerM2 + ARBEID.dekvloerVast)
  const tp = tappunten(s, type)
  if (s.leidingwerk) add('leidingwerk', 'Leidingwerk water en afvoer', tp.totaal * ARBEID.leidingwerkPerTappunt)
  if (s.elektra) add('elektra', 'Elektra en verlichting', ARBEID.elektraVast + Math.max(REGELS.spotsMin, omhoog(o.vloer / REGELS.spotM2)) * ARBEID.elektraPerSpot)
  if (s.radiator) add('radiator', 'Radiator plaatsen en aansluiten', ARBEID.radiator)
  if (s.ventilatie) add('ventilatie', 'Ventilatie aanleggen', ARBEID.ventilatie)
  if (s.bad) add('bad', 'Ligbad plaatsen', ARBEID.bad)
  if (s.deur) add('deur', 'Deur en dorpel plaatsen', ARBEID.deur)
  if (s.plafond) add('plafond', 'PVC-plafond monteren', o.plafond * ARBEID.plafondPerM2)
  return r
}
