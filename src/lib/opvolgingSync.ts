/**
 * Bij openen van de app: tekenstatus van gedeelde offertes ophalen (bekeken / getekend).
 * Zonder internet of zonder server-SQL gebeurt er niets; de app blijft gewoon werken.
 */
import { haalTekenStatus, type TekenStatus } from './ondertekenen'
import { projectStore } from './store'
import { teControleren } from './opvolging'
import { toonMelding } from './meldingen'
import type { Project } from './types'

type Ophaler = (token: string) => Promise<{ ok: true; data: TekenStatus } | { ok: false }>

/** Past de serverstatus toe op een project. Geeft terug of de offerte zojuist getekend is. */
export function verwerkStatus(p: Project, s: TekenStatus, gezien: boolean): { project: Project; nieuwGetekend: boolean } {
  const t = p.offerte?.teken
  if (!t) return { project: p, nieuwGetekend: false }
  const bekekenOp = t.bekekenOp ?? s.viewed_at ?? undefined
  const getekend = !t.getekend && s.signed_at && s.signature ? { naam: s.signer_name ?? '', op: s.signed_at, handtekening: s.signature } : undefined
  if (!getekend && bekekenOp === t.bekekenOp) return { project: p, nieuwGetekend: false }
  const teken = { ...t, bekekenOp, ...(getekend ? { getekend, nieuwGetekend: !gezien } : {}) }
  const offerte = { ...p.offerte, teken, ...(getekend ? { akkoord: { naam: getekend.naam, datum: getekend.op.slice(0, 10) } } : {}) }
  return { project: { ...p, offerte }, nieuwGetekend: !!getekend }
}

/**
 * Controleert alle openstaande tekenlinks. `gezienId`: project dat de aannemer nu open heeft (dan geen badge).
 * Geeft de projecten terug die zojuist getekend zijn.
 */
export async function controleerOffertes(o: { gezienId?: string; ophalen?: Ophaler; melden?: boolean } = {}): Promise<Project[]> {
  const ophalen = o.ophalen ?? haalTekenStatus
  const nieuw: Project[] = []
  for (const p of teControleren(projectStore.alle())) {
    const r = await ophalen(p.offerte!.teken!.token)
    if (!r.ok) continue
    const huidig = projectStore.alle().find((x) => x.id === p.id)
    if (!huidig) continue
    const v = verwerkStatus(huidig, r.data, huidig.id === o.gezienId)
    if (v.project !== huidig) projectStore.werkBij(p.id, () => v.project)
    if (v.nieuwGetekend) nieuw.push(v.project)
  }
  if (o.melden !== false)
    for (const p of nieuw) {
      const naam = p.offerte?.teken?.getekend?.naam || p.klant || 'De klant'
      void toonMelding('Offerte getekend', `${naam} heeft de offerte voor ${p.naam || 'je project'} getekend.`, `#/project/${p.id}/offerte`)
    }
  return nieuw
}

/** Markeert een getekende offerte als gezien (badge weg). */
export function markeerGezien(id: string) {
  const p = projectStore.alle().find((x) => x.id === id)
  if (!p?.offerte?.teken?.nieuwGetekend) return
  projectStore.werkBij(id, (x) => ({ ...x, offerte: { ...x.offerte, teken: { ...x.offerte!.teken!, nieuwGetekend: false } } }))
}
