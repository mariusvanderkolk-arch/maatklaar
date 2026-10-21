/** Ruimtetypes: welke werkzaamheden er bij horen, standaardkeuzes en standaardmaten. */
import type { Afmetingen, ProjectType, Scope, ScopeKey } from './types'

/** Fase/facet waaronder een werkzaamheid in de checklist staat. */
export type Fase = 'sloop' | 'ondergrond' | 'installaties' | 'keuken' | 'tegelwerk' | 'sanitair' | 'afwerking'
export const FASES: { id: Fase; naam: string }[] = [
  { id: 'sloop', naam: 'Sloop & afvoer' },
  { id: 'ondergrond', naam: 'Ondergrond' },
  { id: 'installaties', naam: 'Leidingwerk, elektra & klimaat' },
  { id: 'keuken', naam: 'Keukenmontage & apparatuur' },
  { id: 'tegelwerk', naam: 'Tegelwerk & vloer' },
  { id: 'sanitair', naam: 'Sanitair' },
  { id: 'afwerking', naam: 'Afwerking' },
]
export const FASE_VAN: Record<ScopeKey, Fase> = {
  sloopwerk: 'sloop', container: 'sloop', dekvloer: 'ondergrond', egaliseren: 'ondergrond', waterdicht: 'ondergrond',
  leidingwerk: 'installaties', elektra: 'installaties', ventilatie: 'installaties', vloerverwarming: 'installaties', radiator: 'installaties',
  wandtegels: 'tegelwerk', vloertegels: 'tegelwerk', spatwand: 'tegelwerk', legvloer: 'tegelwerk', ondervloer: 'tegelwerk', plinten: 'tegelwerk',
  inloopdouche: 'sanitair', bad: 'sanitair', toilet: 'sanitair', wastafelmeubel: 'sanitair', fontein: 'sanitair',
  keukenDemontage: 'sloop', perilex: 'installaties', keukenMontage: 'keuken', werkblad: 'keuken', uitsparingen: 'keuken', apparatuur: 'keuken',
  kitwerk: 'afwerking', stucwerk: 'afwerking', plafond: 'afwerking', deur: 'afwerking',
}
/** Checklist gegroepeerd per fase (lege fases weggelaten). */
export function scopePerFase(type: ProjectType | undefined): { fase: Fase; naam: string; items: ScopeItem[] }[] {
  const items = scopeItems(type)
  return FASES.map((f) => ({ fase: f.id, naam: f.naam, items: items.filter((i) => FASE_VAN[i.key] === f.id) })).filter((g) => g.items.length)
}

export interface ScopeItem {
  key: ScopeKey
  label: string
  omschrijving: string
  optioneel?: boolean
}

/** Alle werkzaamheden met hun standaardomschrijving. */
export const SCOPE_BASIS: Record<ScopeKey, ScopeItem> = {
  sloopwerk: { key: 'sloopwerk', label: 'Sloopwerk & afvoer', omschrijving: 'Oude tegels en sanitair verwijderen' },
  container: { key: 'container', label: 'Huur container', omschrijving: 'Afvalcontainer i.p.v. big bags (huur apart van stortkosten)', optioneel: true },
  egaliseren: { key: 'egaliseren', label: 'Vloer egaliseren', omschrijving: 'Vlakke ondergrond voor de vloertegels' },
  waterdicht: { key: 'waterdicht', label: 'Waterdicht maken', omschrijving: 'Vloer en douchewanden afdichten' },
  vloerverwarming: { key: 'vloerverwarming', label: 'Vloerverwarming', omschrijving: 'Elektrische mat met thermostaat', optioneel: true },
  wandtegels: { key: 'wandtegels', label: 'Wandtegels', omschrijving: 'Inclusief lijm, voeg en profielen' },
  vloertegels: { key: 'vloertegels', label: 'Vloertegels', omschrijving: 'Inclusief lijm en voeg' },
  inloopdouche: { key: 'inloopdouche', label: 'Inloopdouche', omschrijving: 'Glaswand, douchegoot en regendouche' },
  toilet: { key: 'toilet', label: 'Hangtoilet', omschrijving: 'Inbouwreservoir en bedieningsplaat' },
  wastafelmeubel: { key: 'wastafelmeubel', label: 'Wastafelmeubel', omschrijving: 'Meubel, kraan, spiegel en sifon' },
  kitwerk: { key: 'kitwerk', label: 'Kitten & afwerken', omschrijving: 'Sanitairkit langs naden en hoeken' },
  stucwerk: { key: 'stucwerk', label: 'Stucwerk & schilderen', omschrijving: 'Plafond en wand boven de tegels' },
  fontein: { key: 'fontein', label: 'Fonteintje', omschrijving: 'Fontein met kraan, sifon en afvoer' },
  spatwand: { key: 'spatwand', label: 'Tegelwand achter aanrecht', omschrijving: 'Spatwand incl. lijm, voeg en profielen' },
  legvloer: { key: 'legvloer', label: 'Laminaat of PVC', omschrijving: 'Klikvloer inclusief snijverlies' },
  ondervloer: { key: 'ondervloer', label: 'Ondervloer', omschrijving: 'Geluid- en vochtwerend, onder de klikvloer' },
  plinten: { key: 'plinten', label: 'Plinten', omschrijving: 'Langs alle wanden, minus deuren' },
  dekvloer: { key: 'dekvloer', label: 'Nieuwe dekvloer', omschrijving: 'Zand-cement dekvloer (ca. 5 cm)', optioneel: true },
  leidingwerk: { key: 'leidingwerk', label: 'Leidingwerk', omschrijving: 'Water- en afvoerleidingen verleggen/vernieuwen' },
  elektra: { key: 'elektra', label: 'Elektra & verlichting', omschrijving: 'Extra groep, inbouwspots en stopcontacten' },
  radiator: { key: 'radiator', label: 'Radiator', omschrijving: 'Designradiator met aansluitset', optioneel: true },
  ventilatie: { key: 'ventilatie', label: 'Ventilatie', omschrijving: 'Ventilator met vochtsensor en afvoer' },
  bad: { key: 'bad', label: 'Ligbad', omschrijving: 'Bad met kraan en afvoer', optioneel: true },
  deur: { key: 'deur', label: 'Deur & dorpel', omschrijving: 'Nieuwe binnendeur, dorpel en beslag', optioneel: true },
  keukenDemontage: { key: 'keukenDemontage', label: 'Oude keuken demonteren', omschrijving: 'Kasten, werkblad en apparatuur eruit en afvoeren' },
  keukenMontage: { key: 'keukenMontage', label: 'Keukenkasten monteren', omschrijving: 'Onder- en bovenkasten per strekkende meter, incl. plinten' },
  werkblad: { key: 'werkblad', label: 'Werkblad plaatsen', omschrijving: 'Laminaat zagen op maat, of composiet/graniet plaatsen' },
  uitsparingen: { key: 'uitsparingen', label: 'Uitsparingen werkblad', omschrijving: 'Spoelbak en kookplaat' },
  apparatuur: { key: 'apparatuur', label: 'Inbouwapparatuur aansluiten', omschrijving: 'Kookplaat, oven, vaatwasser, koelkast en afzuigkap' },
  perilex: { key: 'perilex', label: 'Perilex & extra groepen', omschrijving: 'Kookgroep (2-fase) en groepen door de elektricien', optioneel: true },
  plafond: { key: 'plafond', label: 'PVC-plafond', omschrijving: 'Vochtbestendige plafondpanelen (i.p.v. stucwerk)', optioneel: true },
}

export interface RuimteType {
  id: ProjectType
  label: string
  /** korte toelichting bij de keuze */
  omschrijving: string
  /** werkzaamheden in de checklist, in deze volgorde */
  werk: ScopeKey[]
  /** standaard aangevinkt bij een nieuw project */
  standaard: ScopeKey[]
  /** afwijkende teksten per werkzaamheid voor dit ruimtetype */
  teksten?: Partial<Record<ScopeKey, Partial<Pick<ScopeItem, 'label' | 'omschrijving' | 'optioneel'>>>>
  afmetingen: Partial<Afmetingen>
  snijverlies: number
}

export const RUIMTES: RuimteType[] = [
  {
    id: 'badkamer',
    label: 'Badkamer',
    omschrijving: 'Tegels, waterdicht, douche en sanitair',
    werk: ['sloopwerk', 'container', 'dekvloer', 'egaliseren', 'leidingwerk', 'elektra', 'waterdicht', 'vloerverwarming', 'radiator', 'wandtegels', 'vloertegels', 'inloopdouche', 'bad', 'toilet', 'wastafelmeubel', 'ventilatie', 'kitwerk', 'stucwerk', 'plafond', 'deur'],
    standaard: ['sloopwerk', 'egaliseren', 'leidingwerk', 'elektra', 'waterdicht', 'wandtegels', 'vloertegels', 'inloopdouche', 'toilet', 'wastafelmeubel', 'ventilatie', 'kitwerk'],
    afmetingen: { lengte: 2.5, breedte: 2.0, hoogte: 2.6, tegelhoogte: 2.6 },
    snijverlies: 10,
  },
  {
    id: 'toilet',
    label: 'Toilet',
    omschrijving: 'Wand- en vloertegels, toilet en fonteintje',
    werk: ['sloopwerk', 'container', 'egaliseren', 'leidingwerk', 'elektra', 'wandtegels', 'vloertegels', 'toilet', 'fontein', 'ventilatie', 'kitwerk', 'stucwerk', 'plafond', 'deur'],
    standaard: ['sloopwerk', 'wandtegels', 'vloertegels', 'toilet', 'fontein', 'kitwerk', 'stucwerk'],
    teksten: {
      sloopwerk: { omschrijving: 'Oude tegels, toilet en fontein verwijderen' },
      wandtegels: { omschrijving: 'Halfhoog of tot plafond, incl. lijm en voeg' },
    },
    afmetingen: { lengte: 1.3, breedte: 0.9, hoogte: 2.5, tegelhoogte: 1.2 },
    snijverlies: 12,
  },
  {
    id: 'keuken',
    label: 'Keuken',
    omschrijving: 'Spatwand achter het aanrecht, vloer en kit',
    werk: ['keukenDemontage', 'sloopwerk', 'container', 'dekvloer', 'egaliseren', 'leidingwerk', 'elektra', 'perilex', 'ventilatie', 'keukenMontage', 'werkblad', 'uitsparingen', 'apparatuur', 'spatwand', 'vloertegels', 'plinten', 'kitwerk', 'stucwerk', 'plafond', 'deur'],
    standaard: ['keukenDemontage', 'sloopwerk', 'keukenMontage', 'werkblad', 'uitsparingen', 'apparatuur', 'spatwand', 'egaliseren', 'vloertegels', 'kitwerk'],
    teksten: {
      leidingwerk: { label: 'Water & afvoer verleggen', omschrijving: 'Aansluiting spoelbak/vaatwasser verleggen' },
      spatwand: { label: 'Wandtegels achterwand' },
      plinten: { omschrijving: 'Langs de wanden buiten de keuken' },
      elektra: { omschrijving: 'Extra groep (kookplaat/oven), spots en stopcontacten' },
      ventilatie: { label: 'Extra ventilator', omschrijving: 'Mechanische ventilator (afzuigkap valt onder apparatuur)' },
      stucwerk: { omschrijving: 'Plafond stucen en schilderen' },
      sloopwerk: { omschrijving: 'Oude spatwand en vloertegels verwijderen' },
      vloertegels: { label: 'Tegelvloer', omschrijving: 'Keukenvloer incl. lijm en voeg' },
      kitwerk: { omschrijving: 'Naad werkblad en zijkanten spatwand' },
    },
    afmetingen: { lengte: 4.0, breedte: 3.0, hoogte: 2.6, tegelhoogte: 0.6, spatwand: { lengte: 3.0, hoogte: 0.6 } },
    snijverlies: 10,
  },
  {
    id: 'vloer',
    label: 'Vloer & woonkamer',
    omschrijving: 'Laminaat, PVC of tegelvloer met plinten',
    werk: ['sloopwerk', 'container', 'dekvloer', 'egaliseren', 'vloerverwarming', 'legvloer', 'vloertegels', 'ondervloer', 'plinten', 'deur'],
    standaard: ['sloopwerk', 'legvloer', 'ondervloer', 'plinten'],
    teksten: {
      sloopwerk: { label: 'Oude vloer verwijderen', omschrijving: 'Vloerbedekking of laminaat eruit en afvoeren' },
      egaliseren: { omschrijving: 'Vlakke ondergrond voor de nieuwe vloer' },
      vloertegels: { label: 'Tegelvloer', omschrijving: 'In plaats van laminaat/PVC, incl. lijm en voeg' },
      vloerverwarming: { omschrijving: 'Elektrische mat onder tegelvloer, met thermostaat' },
      deur: { label: 'Dorpel & deur', omschrijving: 'Nieuwe dorpel en deur passend maken/vervangen' },
    },
    afmetingen: { lengte: 6.0, breedte: 4.5, hoogte: 2.6, tegelhoogte: 0 },
    snijverlies: 7,
  },
]

export const ruimte = (id: ProjectType | undefined): RuimteType => RUIMTES.find((r) => r.id === id) ?? RUIMTES[0]
export const ruimteLabel = (id: ProjectType | undefined) => ruimte(id).label

/** Checklist voor een ruimtetype, met de teksten voor dat type. */
export function scopeItems(type: ProjectType | undefined): ScopeItem[] {
  const r = ruimte(type)
  return r.werk.map((k) => ({ ...SCOPE_BASIS[k], ...r.teksten?.[k] }))
}

export const ALLE_SCOPE_KEYS = Object.keys(SCOPE_BASIS) as ScopeKey[]

/** Lege scope (alles uit). */
export const legeScope = (): Scope => Object.fromEntries(ALLE_SCOPE_KEYS.map((k) => [k, false])) as Scope

/** Standaardscope voor een ruimtetype. */
export function scopeVoor(type: ProjectType): Scope {
  const s = legeScope()
  for (const k of ruimte(type).standaard) s[k] = true
  return s
}

/** Alleen de werkzaamheden die bij het ruimtetype horen (andere tellen niet mee). */
export function actieveScope(type: ProjectType | undefined, scope: Scope): ScopeKey[] {
  return ruimte(type).werk.filter((k) => scope[k])
}
