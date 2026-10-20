import { CircleCheck, Clock, Eye, FileText, Send } from 'lucide-react'
import { Badge } from './ui'
import { OPVOLG_LABEL, opvolgstatus } from '../lib/opvolging'
import type { Project } from '../lib/types'

const TOON = { concept: 'sand', verstuurd: 'gold', bekeken: 'gold', getekend: 'sage', verlopen: 'sand' } as const
const ICOON = { concept: FileText, verstuurd: Send, bekeken: Eye, getekend: CircleCheck, verlopen: Clock }

/** Status van de offerte (Concept/Verstuurd/Bekeken/Getekend/Verlopen), met "Nieuw" als de klant net tekende. */
export function OpvolgBadge({ p, nu }: { p: Pick<Project, 'offerte'>; nu?: number }) {
  const s = opvolgstatus(p, nu)
  const I = ICOON[s]
  return (
    <>
      <Badge tone={TOON[s]} className={s === 'verlopen' ? 'text-rust' : ''}>
        <I className="h-3.5 w-3.5" aria-hidden="true" /> <span data-opvolgstatus={s}>Offerte {OPVOLG_LABEL[s].toLowerCase()}</span>
      </Badge>
      {p.offerte?.teken?.nieuwGetekend && (
        <Badge tone="ink" className="animate-pulse">
          Nieuw
        </Badge>
      )}
    </>
  )
}
