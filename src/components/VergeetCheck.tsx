import { Check, ListChecks, Plus, X } from 'lucide-react'
import { Button, Card } from './ui'
import { projectStore } from '../lib/store'
import { ruimte } from '../lib/ruimtes'
import { toast } from './Toast'
import type { Project, ProjectType, ScopeKey } from '../lib/types'

type Regel = { key: ScopeKey; label: string; waarom: string }

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
  badkamer: NAT,
  toilet: NAT,
  keuken: [
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
}

/** Alle check-regels voor dit project (alleen keys die bij de ruimte horen), met status. */
export function vergeetLijst(p: Project) {
  if (p.voorbeeld || !p.type || !VERGEET_REGELS[p.type]) return []
  const werk = ruimte(p.type).werk
  const weg = p.offerte?.vergeetNietNodig ?? []
  return VERGEET_REGELS[p.type]
    .filter((r) => werk.includes(r.key))
    .map((r) => ({ ...r, inScope: Boolean(p.scope?.[r.key]), weg: weg.includes(r.key) }))
    .filter((r) => r.inScope || !r.weg)
}

/** Openstaande vergeet-punten: niet in de scope en niet weggeklikt. */
export function vergeetPunten(p: Project) {
  return vergeetLijst(p).filter((r) => !r.inScope)
}

export function VergeetCheck({ p, bevestig, onToch, onAnnuleer }: { p: Project; bevestig?: boolean; onToch?: () => void; onAnnuleer?: () => void }) {
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
      <p className="mt-0.5 text-[0.82rem] leading-snug text-ink-muted">Even checken vóór je deelt. Posten die al op de offerte staan zie je afgevinkt.</p>
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
                <p className="text-[0.76rem] text-ink-muted">{r.waarom}</p>
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
      {bevestig && open.length > 0 && (
        <div className="mt-3 rounded-xl bg-gold-100 px-3 py-3 ring-1 ring-gold-200" role="alert" data-testid="vergeet-bevestig">
          <p className="text-sm font-medium">Er staan nog mogelijke posten open. Toch delen?</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={onToch} data-testid="vergeet-toch-delen">Toch delen</Button>
            <Button size="sm" variant="secondary" onClick={onAnnuleer} data-testid="vergeet-eerst-checken">Eerst checken</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
