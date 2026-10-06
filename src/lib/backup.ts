/**
 * Volledige back-up: alle projecten, foto's (als data-URL), eigen prijzen, bedrijfsprofiel en
 * AI-voorkeuren. API-sleutels gaan er bewust NIET in.
 */
import { normaliseerProject } from './defaults'
import { standaardBedrijf, type Bedrijf } from './bedrijf'
import type { EigenPrijzen } from './eigenPrijzen'
import type { AiInstellingen } from './ai'
import type { Project } from './types'
import { normaliseerFactuur, type Factuur } from './factuur'

export const BACKUP_VERSIE = 2

export interface BackupFoto {
  id: string
  dataUrl: string
}

export interface Backup {
  app: 'slimmer-wonen'
  type: 'backup'
  versie: number
  gemaakt: string
  projecten: Project[]
  fotos: BackupFoto[]
  prijzen: EigenPrijzen
  bedrijf?: Bedrijf
  facturen: Factuur[]
  /** AI-voorkeuren zonder sleutels */
  ai?: Omit<AiInstellingen, 'sleutels'>
  /** ruimte-ontwerpen per project-id (sinds 1.1) */
  ontwerpen?: Record<string, unknown>
}

export function maakBackup(
  d: { projecten: Project[]; fotos: BackupFoto[]; prijzen: EigenPrijzen; bedrijf?: Bedrijf; ai?: AiInstellingen; facturen?: Factuur[]; ontwerpen?: Record<string, unknown> },
  nu = new Date(),
): Backup {
  const ai = d.ai ? { provider: d.ai.provider, modellen: d.ai.modellen, baseUrl: d.ai.baseUrl } : undefined
  return { app: 'slimmer-wonen', type: 'backup', versie: BACKUP_VERSIE, gemaakt: nu.toISOString(), projecten: d.projecten, fotos: d.fotos, prijzen: d.prijzen, bedrijf: d.bedrijf, facturen: d.facturen ?? [], ai, ...(d.ontwerpen && Object.keys(d.ontwerpen).length ? { ontwerpen: d.ontwerpen } : {}) }
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)

/** Leest en controleert een back-upbestand. Gooit een Nederlandse fout bij problemen. */
export function leesBackup(tekst: string): Backup {
  let j: unknown
  try {
    j = JSON.parse(tekst)
  } catch {
    throw new Error('Dit bestand is geen geldige back-up (geen JSON).')
  }
  if (!isObj(j) || j.app !== 'slimmer-wonen') throw new Error('Dit is geen back-up van Slimmer Wonen.')
  if (j.type === 'prijzen') throw new Error('Dit is een prijzenbestand. Importeer het via Prijzen beheren.')
  if (j.type !== 'backup' || !Array.isArray(j.projecten)) throw new Error('Dit bestand bevat geen projecten.')
  if (typeof j.versie !== 'number' || j.versie > BACKUP_VERSIE) throw new Error('Deze back-up is gemaakt met een nieuwere versie van de app. Ververs de pagina en probeer opnieuw.')

  const projecten: Project[] = []
  for (const p of j.projecten) {
    if (!isObj(p) || typeof p.id !== 'string' || !p.id) continue
    try {
      projecten.push(normaliseerProject(p as Partial<Project> & { id: string }))
    } catch {
      /* onleesbaar project overslaan */
    }
  }
  const fotos: BackupFoto[] = (Array.isArray(j.fotos) ? j.fotos : []).filter(
    (f): f is BackupFoto => isObj(f) && typeof f.id === 'string' && typeof f.dataUrl === 'string' && /^data:image\/[a-z+.-]+;base64,/i.test(f.dataUrl),
  )
  const bedrijf = isObj(j.bedrijf) ? { ...standaardBedrijf(), ...(j.bedrijf as Partial<Bedrijf>) } : undefined
  const ai = isObj(j.ai) ? (j.ai as Backup['ai']) : undefined
  return {
    app: 'slimmer-wonen',
    type: 'backup',
    versie: j.versie,
    gemaakt: typeof j.gemaakt === 'string' ? j.gemaakt : '',
    projecten,
    fotos,
    prijzen: isObj(j.prijzen) ? (j.prijzen as EigenPrijzen) : {},
    bedrijf,
    facturen: (Array.isArray(j.facturen) ? j.facturen : []).map(normaliseerFactuur).filter((f): f is Factuur => f != null),
    ai,
    ...(isObj(j.ontwerpen) ? { ontwerpen: j.ontwerpen as Record<string, unknown> } : {}),
  }
}

/** Facturen samenvoegen (op id, bestand wint) of vervangen. */
export function combineerFacturen(huidig: Factuur[], uitBestand: Factuur[], modus: ImportModus): Factuur[] {
  if (modus === 'vervangen') return uitBestand
  const ids = new Set(uitBestand.map((f) => f.id))
  return [...uitBestand, ...huidig.filter((f) => !ids.has(f.id))]
}

export type ImportModus = 'samenvoegen' | 'vervangen'

/** Samenvoegen: op id, het bestand wint bij dubbele projecten. Vervangen: alleen wat in het bestand staat. */
export function combineerProjecten(huidig: Project[], uitBestand: Project[], modus: ImportModus): Project[] {
  if (modus === 'vervangen') return uitBestand
  const ids = new Set(uitBestand.map((p) => p.id))
  return [...uitBestand, ...huidig.filter((p) => !ids.has(p.id))]
}

/** Bedrijfsprofiel na import; het volgnummer gaat nooit omlaag (geen dubbele offertenummers). */
export function combineerBedrijf(huidig: Bedrijf, uitBestand: Bedrijf | undefined): Bedrijf {
  if (!uitBestand) return huidig
  return {
    ...uitBestand,
    volgnummer: Math.max(huidig.volgnummer, uitBestand.volgnummer),
    factuurVolgnummer: Math.max(huidig.factuurVolgnummer || 1, uitBestand.factuurVolgnummer || 1),
  }
}

export function samenvatting(b: Backup) {
  const eigen = b.projecten.filter((p) => !p.voorbeeld).length
  const prijzen = Object.values(b.prijzen).reduce((n, r) => n + Object.keys(r ?? {}).length, 0)
  return { projecten: b.projecten.length, eigen, fotos: b.fotos.length, prijzen, bedrijf: !!b.bedrijf?.naam, facturen: b.facturen.length }
}

export const backupBestandsnaam = (nu = new Date()) => `slimmer-wonen-backup-${nu.toISOString().slice(0, 10)}.json`

/** Moet de gebruiker herinnerd worden aan een back-up? */
export function backupHerinnering(
  d: { projecten: Project[]; laatsteBackup: number | null; gesnoozed: number | null },
  nu = Date.now(),
  dagen = 14,
): boolean {
  const eigen = d.projecten.filter((p) => !p.voorbeeld)
  if (eigen.length === 0) return false
  if (d.gesnoozed && nu < d.gesnoozed) return false
  const laatsteWijziging = Math.max(...eigen.map((p) => p.updatedAt || 0))
  if (d.laatsteBackup == null) return nu - Math.min(...eigen.map((p) => p.createdAt || nu)) > 24 * 3600e3
  return laatsteWijziging > d.laatsteBackup && nu - d.laatsteBackup > dagen * 24 * 3600e3
}
