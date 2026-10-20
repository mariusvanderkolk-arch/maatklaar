/** Offerte-opvolging: status, herinneringen en meldingen. Pure functies (getest in opvolging.test.ts). */
import type { OfferteStatus, Project } from './types'

export type Opvolgstatus = 'concept' | 'verstuurd' | 'bekeken' | 'getekend' | 'verlopen'
type Teken = NonNullable<OfferteStatus['teken']>

export const OPVOLG_LABEL: Record<Opvolgstatus, string> = {
  concept: 'Concept',
  verstuurd: 'Verstuurd',
  bekeken: 'Bekeken',
  getekend: 'Getekend',
  verlopen: 'Verlopen',
}

/** Standaard aantal dagen zonder handtekening voordat de app een herinnering voorstelt. */
export const HERINNER_NA_DAGEN = 5
const DAG = 86_400_000

const isoDag = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Tot wanneer de gedeelde offerte geldig is: de vastgelegde datum, anders 30 dagen na delen. */
export function geldigTot(t: Teken): string {
  return t.geldigTot && /^\d{4}-\d{2}-\d{2}$/.test(t.geldigTot) ? t.geldigTot : isoDag(t.gedeeldOp + 30 * DAG)
}

export function opvolgstatus(p: Pick<Project, 'offerte'>, nu = Date.now()): Opvolgstatus {
  const t = p.offerte?.teken
  if (!t) return p.offerte?.akkoord ? 'getekend' : 'concept'
  if (t.getekend) return 'getekend'
  if (isoDag(nu) > geldigTot(t)) return 'verlopen'
  return t.bekekenOp ? 'bekeken' : 'verstuurd'
}

/** Moet de app een herinnering voorstellen? Alleen als gedeeld, niet getekend, niet verlopen en X dagen stil. */
export function herinneringNodig(t: Teken | undefined, nu = Date.now(), naDagen = HERINNER_NA_DAGEN): boolean {
  if (!t || t.getekend) return false
  if (isoDag(nu) > geldigTot(t)) return false
  const laatst = Math.max(t.gedeeldOp, t.herinnerdOp ?? 0)
  return nu - laatst >= naDagen * DAG
}

export const dagenSinds = (ms: number, nu = Date.now()) => Math.max(0, Math.floor((nu - ms) / DAG))

/** Vriendelijke herinneringstekst (de aannemer verstuurt hem zelf; de app verstuurt nooit automatisch). */
export function herinneringTekst(klant: string, project: string, link: string, bekeken: boolean): string {
  const aanhef = klant.trim() ? `Beste ${klant.trim()},` : 'Beste klant,'
  const kern = bekeken
    ? `Ik zag dat je de offerte voor ${project || 'het project'} hebt bekeken. Heb je nog vragen, of zal ik iets aanpassen?`
    : `Een paar dagen geleden stuurde ik je de offerte voor ${project || 'het project'}. Heb je hem al kunnen bekijken?`
  return `${aanhef}\n\n${kern} Akkoord? Dan kun je hem hier digitaal tekenen:\n${link}\n\nMet vriendelijke groet`
}

/** Projecten met een gedeelde, nog niet getekende en niet verlopen tekenlink: die vraagt de app op bij openen. */
export function teControleren(projecten: Project[], nu = Date.now()): Project[] {
  return projecten.filter((p) => {
    const t = p.offerte?.teken
    return !!t && !t.getekend && isoDag(nu) <= geldigTot(t)
  })
}

export const aantalNieuwGetekend = (projecten: Project[]) => projecten.filter((p) => p.offerte?.teken?.nieuwGetekend).length
