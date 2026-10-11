/** Kern-datatypes van Maatklaar. Alle maten in meters, tenzij anders vermeld. */

export type ScopeKey =
  | 'sloopwerk'
  | 'container'
  | 'waterdicht'
  | 'egaliseren'
  | 'vloerverwarming'
  | 'wandtegels'
  | 'vloertegels'
  | 'inloopdouche'
  | 'toilet'
  | 'wastafelmeubel'
  | 'kitwerk'
  | 'stucwerk'
  | 'fontein'
  | 'spatwand'
  | 'legvloer'
  | 'ondervloer'
  | 'plinten'
  | 'dekvloer'
  | 'leidingwerk'
  | 'elektra'
  | 'radiator'
  | 'ventilatie'
  | 'bad'
  | 'deur'
  | 'plafond'

export type Scope = Record<ScopeKey, boolean>

export type ProjectType = 'badkamer' | 'toilet' | 'keuken' | 'vloer'

/** Soort klikvloer (laminaat of PVC). Een tegelvloer loopt via de werkzaamheid 'vloertegels'. */
export type VloerSoort = 'laminaat' | 'pvc'

export interface LegvloerSpec {
  soort: VloerSoort
  /** m² per pak */
  m2PerPak: number
}

export interface Opening {
  id: string
  type: 'deur' | 'raam'
  /** breedte in m */
  breedte: number
  /** hoogte in m */
  hoogte: number
  /** onderkant opening boven de vloer in m (deur = 0) */
  vanafVloer: number
}

export interface TileSpec {
  /** lengte tegel in cm */
  lengte: number
  /** breedte tegel in cm */
  breedte: number
  /** m² per doos */
  m2PerDoos: number
  /** tegeldikte in mm */
  dikte: number
  /** voegbreedte in mm */
  voeg: number
}

export interface Afmetingen {
  lengte: number
  breedte: number
  hoogte: number
  /** tot welke hoogte de wanden betegeld worden (m) */
  tegelhoogte: number
  openingen: Opening[]
  /** douchezone (inloopdouche) in m */
  douche: { breedte: number; diepte: number }
  /** laagdikte egaliseren in mm */
  egaliseerDikte: number
  /** tegelwand achter het aanrecht (keuken): lengte en hoogte in m */
  spatwand: { lengte: number; hoogte: number }
}

export interface PhotoRef {
  id: string
  naam: string
  createdAt: number
}

/** Geregistreerde uren op een dag. */
export interface UrenLog {
  id: string
  /** YYYY-MM-DD */
  datum: string
  /** werkzaamheid (scope-sleutel) of leeg voor algemeen */
  taak?: string
  uren: number
  omschrijving: string
}

export type KostSoort = 'materiaal' | 'meerwerk' | 'overig'

/** Werkelijke uitgave: bonnetje materiaal, meerwerk of overige kosten (incl. btw). */
export interface ExtraKost {
  id: string
  datum: string
  omschrijving: string
  soort: KostSoort
  bedrag: number
}

export interface Planning {
  /** startdatum YYYY-MM-DD */
  start?: string
  /** werkuren per dag */
  dagUren: number
  /** ook op zaterdag en zondag werken */
  weekend: boolean
  /** aangepaste werkdagen per taak (scope-sleutel) */
  dagen: Record<string, number>
  /** aangepaste droog-/wachttijd in dagen per taak */
  droogdagen: Record<string, number>
  logs: UrenLog[]
  kosten: ExtraKost[]
}

/** Offertegegevens die bij het project bewaard blijven. */
export interface OfferteStatus {
  nummer?: string
  /** offertedatum YYYY-MM-DD */
  datum?: string
  metArbeid?: boolean
  /** laatst gedeeld (ms) */
  gedeeldOp?: number
  /** handmatig vastgelegd akkoord van de klant */
  akkoord?: { naam: string; datum: string }
  /** digitale ondertekening: deellink-token en (na tekenen) de handtekening */
  teken?: { token: string; hash: string; nr: string; code: string; gedeeldOp: number; getekend?: { naam: string; op: string; handtekening: string } }
}

export interface Project {
  id: string
  naam: string
  klant: string
  adres: string
  type: ProjectType
  createdAt: number
  updatedAt: number
  scope: Scope
  afmetingen: Afmetingen
  wandtegel: TileSpec
  vloertegel: TileSpec
  /** laminaat/PVC (ruimte 'vloer') */
  legvloer: LegvloerSpec
  /** snijverlies in procenten */
  snijverlies: number
  /** uurtarief in euro incl. btw, voor de indicatieve arbeidsraming */
  uurtarief: number
  /** opslag voor onvoorziene kosten in procenten (over materiaal + arbeid); ontbreekt = 0 */
  onvoorzien?: number
  /** keuze bij 'Huur container': maat (m³, of auto) en afvalsoort */
  container?: ContainerKeuze
  fotos: PhotoRef[]
  /** handmatig toegevoegde artikelen (catalogus of eigen artikel) met eigen aantal */
  extraArtikelen?: ExtraArtikel[]
  /** afgevinkte regels op de inkooplijst */
  afgevinkt: Record<string, boolean>
  notities: string
  voorbeeld?: boolean
  /** vaste sleutel van een voorbeeldproject (om nieuwe voorbeelden één keer toe te voegen) */
  voorbeeldId?: string
  planning?: Planning
  offerte?: OfferteStatus
  /** laatste AI-fotoanalyse (suggesties) */
  aiAnalyse?: AiResultaat
}

/** Opgeslagen AI-analyse bij een project. */
export interface AiResultaat {
  datum: number
  provider: string
  model: string
  fotoIds: string[]
  analyse: import('./ai').AiAnalyse
  /** welke suggesties al zijn overgenomen (bijv. 'werk:wandtegels', 'maat:lengte') */
  overgenomen: string[]
}

export type ContainerMaat = 3 | 6 | 10 | 15
export type AfvalSoort = 'gemengd' | 'puin' | 'hout' | 'grond'
export interface ContainerKeuze {
  /** ontbreekt = automatisch op basis van het afvalvolume */
  maat?: ContainerMaat
  /** ontbreekt = gemengd bouw- en sloopafval */
  soort?: AfvalSoort
}

export interface ExtraArtikel {
  /** unieke sleutel van de regel */
  sleutel: string
  /** ProductId uit de catalogus of 'eigen-…' */
  id: string
  aantal: number
}
