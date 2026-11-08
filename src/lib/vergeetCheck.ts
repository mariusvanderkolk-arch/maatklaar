import { berekenMaterialen } from './calc'
import { ruimte } from './ruimtes'
import type { Project, ProjectType, ScopeKey } from './types'

export type Regel = { key: ScopeKey; label: string; waarom: string }

const NAT: Regel[] = [
  { key: 'sloopwerk', label: 'Sloopwerk', waarom: 'oude tegels, sanitair en leidingen eruit' },
  { key: 'container', label: 'Afvoer van puin', waarom: 'container of puinzakken afvoeren' },
  { key: 'kitwerk', label: 'Kitwerk', waarom: 'afkitten van sanitair, hoeken en naden' },
  { key: 'waterdicht', label: 'Waterdichting', waarom: 'vloer en douchewand waterdicht maken' },
  { key: 'leidingwerk', label: 'Leidingwerk', waarom: 'aan- en afvoer verleggen of vernieuwen' },
  { key: 'elektra', label: 'Elektra', waarom: 'verlichting, stopcontacten, aarding' },
  { key: 'ventilatie', label: 'Ventilatie', waarom: 'afzuiging tegen vocht en schimmel' },
]

/** Regels die per projecttype vaak vergeten worden op de offerte. */
export const VERGEET_REGELS: Record<ProjectType, Regel[]> = {
  stucwerk: [],
  schilderwerk: [],
  badkamer: NAT,
  toilet: NAT,
  keuken: [
    { key: 'container', label: 'Afvoer bij demontage', waarom: 'Controleer bij keukendemontage wie het oude materiaal afvoert; mogelijk is geen container nodig.' },
    { key: 'keukenDemontage', label: 'Demontage oude keuken', waarom: 'oude keuken eruit en afvoeren' },
    { key: 'keukenMontage', label: 'Keukenmontage', waarom: 'kasten, fronten en apparatuur plaatsen' },
    { key: 'werkblad', label: 'Werkblad', waarom: 'werkblad op maat en plaatsen' },
    { key: 'leidingwerk', label: 'Leidingwerk', waarom: 'water en afvoer naar de nieuwe plek' },
    { key: 'perilex', label: 'Perilex-aansluiting', waarom: 'krachtstroom voor de kookplaat' },
    { key: 'elektra', label: 'Elektra', waarom: 'extra groepen en stopcontacten' },
  ],
  vloer: [
    { key: 'ondervloer', label: 'Ondervloer', waarom: 'geluid- en vochtwerend onder de vloer' },
    { key: 'plinten', label: 'Plinten', waarom: 'afwerking langs de wanden' },
    { key: 'deurenInkorten', label: 'Deuren inkorten', waarom: 'deuren passend maken op de nieuwe vloer' },
  ],
  aanbouw: [
    { key: 'grondwerk', label: 'Grondwerk', waarom: 'ontgraven en grond afvoeren of aanvullen' },
    { key: 'hwa', label: 'Hemelwaterafvoer', waarom: 'regenwater van het nieuwe dak afvoeren' },
    { key: 'gevelDoorbraak', label: 'Doorbraak bestaande gevel', waarom: 'opening naar het huis, met ligger volgens constructeur' },
    { key: 'isolatie', label: 'Isolatie', waarom: 'spouw en dak (Rc-eisen Bbl); vloer zit in de systeemvloer' },
    { key: 'elektra', label: 'Elektra', waarom: 'groepen, verlichting en stopcontacten in de aanbouw' },
  ],
}

/** Alle check-regels voor dit project (alleen keys die bij de ruimte horen), met status. */
export function vergeetLijst(p: Project) {
  if (p.voorbeeld || !p.type || !VERGEET_REGELS[p.type]) return []
  const werk = ruimte(p.type).werk
  const weg = p.offerte?.vergeetNietNodig ?? []
  return VERGEET_REGELS[p.type]
    .filter((r) => werk.includes(r.key) && (p.scope?.[r.key] || relevant(p, r.key)))
    .map((r) => ({ ...r, inScope: Boolean(p.scope?.[r.key]), weg: weg.includes(r.key) }))
    .filter((r) => r.inScope || !r.weg)
}

/** Openstaande vergeet-punten: niet in de scope en niet weggeklikt. */
export function vergeetPunten(p: Project) {
  return vergeetLijst(p).filter((r) => !r.inScope)
}

/** Alleen aanknopingspunten uit de gekozen scope; geen algemene boodschappenlijst. */
function relevant(p: Project, key: ScopeKey): boolean {
  const s = p.scope ?? {}
  const nat = p.type === 'badkamer' || p.type === 'toilet'
  const sanitair = !!(s.inloopdouche || s.bad || s.toilet || s.wastafelmeubel || s.fontein)
  switch (key) {
    case 'kitwerk': return (nat && (sanitair || !!s.wandtegels || !!s.vloertegels)) || (p.type === 'keuken' && !!(s.werkblad || s.spatwand))
    case 'container':
      // Big bags + stortkosten staan bij sloop al automatisch in de berekening.
      return !!(s.sloopwerk || s.keukenDemontage) && !berekenMaterialen(p).some((r) => (r.id === 'bigbag' || r.id.startsWith('stort-') || r.id.startsWith('container')) && r.aantal > 0)
    case 'waterdicht': return nat && !!(s.inloopdouche || s.bad)
    case 'leidingwerk': return sanitair || (p.type === 'keuken' && !!s.keukenMontage)
    case 'ventilatie': return nat && !!(s.inloopdouche || s.bad)
    case 'ondervloer': return !!s.legvloer
    case 'plinten': return !!(s.legvloer || s.vloertegels)
    case 'keukenMontage': return !!(s.werkblad || s.apparatuur)
    case 'werkblad': return !!s.keukenMontage
    case 'grondwerk': return p.type === 'aanbouw' && !!s.fundering
    case 'hwa': return p.type === 'aanbouw' && !!s.dak
    case 'isolatie': return p.type === 'aanbouw' && !!(s.dak || s.buitenmuur)
    default: return false // bv. Perilex, doorbraak of sloop is zonder verdere invoer niet af te leiden.
  }
}
