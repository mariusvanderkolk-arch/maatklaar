import { ListChecks, Plus, X } from 'lucide-react'
import { Button, Card } from './ui'
import { projectStore } from '../lib/store'
import { toast } from './Toast'
import type { Project, ScopeKey } from '../lib/types'

/** Regels die bij een badkamer/toilet vaak vergeten worden op de offerte. */
export const VERGEET_REGELS: { key: ScopeKey; label: string; waarom: string }[] = [
  { key: 'sloopwerk', label: 'Sloopwerk', waarom: 'oude tegels, sanitair en leidingen eruit' },
  { key: 'container', label: 'Afvoer van puin', waarom: 'container of puinzakken afvoeren' },
  { key: 'kitwerk', label: 'Kitwerk', waarom: 'afkitten van sanitair, hoeken en naden' },
]

/** Openstaande vergeet-regels: alleen bij badkamer/toilet, niet in de scope en niet weggeklikt. */
export function vergeetPunten(p: Project) {
  if (p.voorbeeld || (p.type !== 'badkamer' && p.type !== 'toilet')) return []
  const weg = p.offerte?.vergeetNietNodig ?? []
  return VERGEET_REGELS.filter((r) => !p.scope?.[r.key] && !weg.includes(r.key))
}

export function VergeetCheck({ p }: { p: Project }) {
  const punten = vergeetPunten(p)
  if (!punten.length) return null
  const voegToe = (key: ScopeKey, label: string) => {
    projectStore.werkBij(p.id, (x) => ({ ...x, scope: { ...x.scope, [key]: true } }))
    toast(`${label} toegevoegd aan de offerte`)
  }
  const nietNodig = (keys: ScopeKey[]) =>
    projectStore.werkBij(p.id, (x) => ({ ...x, offerte: { ...x.offerte, vergeetNietNodig: [...new Set([...(x.offerte?.vergeetNietNodig ?? []), ...keys])] } }))
  return (
    <Card className="p-5 ring-1 ring-gold-200" data-testid="vergeet-check">
      <p className="flex items-center gap-1.5 text-[0.98rem] font-semibold">
        <ListChecks className="h-4 w-4 text-gold-700" aria-hidden="true" /> Niets vergeten?
      </p>
      <p className="mt-0.5 text-[0.82rem] leading-snug text-ink-muted">Deze regels worden bij een {p.type === 'toilet' ? 'toilet' : 'badkamer'} vaak vergeten. Even checken voordat je de offerte deelt.</p>
      <ul className="mt-3 space-y-2">
        {punten.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-2 rounded-xl bg-sand-50 px-3 py-2 ring-1 ring-sand-200">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{r.label}</p>
              <p className="text-[0.76rem] text-ink-muted">{r.waarom}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => voegToe(r.key, r.label)} data-testid={`vergeet-toevoegen-${r.key}`}>
                Toevoegen
              </Button>
              <button type="button" aria-label={`${r.label} niet nodig`} title="Niet nodig" onClick={() => nietNodig([r.key])} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-sand-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => nietNodig(punten.map((r) => r.key))} className="mt-2 min-h-11 text-[0.82rem] font-medium text-ink-soft underline-offset-2 hover:underline" data-testid="vergeet-alles-weg">
        Niet nodig voor dit project
      </button>
    </Card>
  )
}
