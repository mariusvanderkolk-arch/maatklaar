import { Check, ListChecks, Plus, X } from 'lucide-react'
import { Button, Card } from './ui'
import { projectStore } from '../lib/store'
import { vergeetLijst } from '../lib/vergeetCheck'
import { toast } from './Toast'
import type { Project, ScopeKey } from '../lib/types'

export function VergeetCheck({ p }: { p: Project }) {
  const lijst = vergeetLijst(p)
  if (!lijst.length) return null
  const open = lijst.filter((r) => !r.inScope)
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
      <p className="mt-0.5 text-[0.82rem] leading-snug text-ink-muted">Mogelijke aandachtspunten bij je gekozen werk, geen verplichte extra posten. Staat het elders of doet de klant het zelf? Kies Niet nodig.</p>
      <ul className="mt-3 space-y-2">
        {lijst.map((r) =>
          r.inScope ? (
            <li key={r.key} className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-ink-muted" data-testid={`vergeet-ok-${r.key}`}>
              <Check className="h-4 w-4 shrink-0 text-sage-700" aria-hidden="true" />
              <p className="text-sm">{r.label} <span className="text-[0.76rem]">· staat op de offerte</span></p>
            </li>
          ) : (
            <li key={r.key} className="flex items-center justify-between gap-2 rounded-xl bg-sand-50 px-3 py-2 ring-1 ring-sand-200" data-testid={`vergeet-open-${r.key}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{r.label}</p>
                <p className="text-[0.76rem] text-ink-muted">Controleer of dit nodig is: {r.waarom}.</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => voegToe(r.key, r.label)} data-testid={`vergeet-toevoegen-${r.key}`}>
                  Toevoegen
                </Button>
                <button type="button" aria-label={`${r.label} niet nodig`} title="Niet nodig" onClick={() => nietNodig([r.key])} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-sand-100" data-testid={`vergeet-weg-${r.key}`}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
      {open.length > 0 ? (
        <button type="button" onClick={() => nietNodig(open.map((r) => r.key))} className="mt-2 min-h-11 text-[0.82rem] font-medium text-ink-soft underline-offset-2 hover:underline" data-testid="vergeet-alles-weg">
          Niet nodig voor dit project
        </button>
      ) : (
        <p className="mt-2 text-[0.82rem] font-medium text-sage-700" data-testid="vergeet-compleet">Alles gecheckt.</p>
      )}

    </Card>
  )
}
