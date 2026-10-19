/** Vriendelijke melding als de gratis limiet is bereikt. Bestaande projecten blijven altijd bruikbaar. */
import { ArrowLeft, Download, FolderOpen, Sparkles } from 'lucide-react'
import { Button } from './ui'
import { ga } from '../lib/router'
import { GRATIS_MAX_PROJECTEN, PROEF_DAGEN } from '../lib/billing/config'

export function Betaalmuur({ aantal, proefMogelijk = true }: { aantal: number; proefMogelijk?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-32 sm:px-6 sm:pt-14">
      <div className="card overflow-hidden">
        <div className="relative bg-gradient-to-br from-gold-100/70 via-sand-50 to-paper px-6 pt-8 pb-7 sm:px-9">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-200/80 text-gold-700 ring-1 ring-gold-300">
            <Sparkles className="h-5.5 w-5.5" />
          </span>
          <p className="mt-5 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-gold-700">Gratis limiet bereikt</p>
          <h1 className="mt-1.5 text-[2rem] leading-[1.05] font-semibold sm:text-[2.4rem]">Klaar voor meer klussen?</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            Je hebt {aantal} van de {GRATIS_MAX_PROJECTEN} gratis projecten in gebruik. Met <strong className="font-semibold text-ink">Maatklaar Pro</strong> maak je
            onbeperkt projecten, offertes en facturen{proefMogelijk ? `. Probeer het ${PROEF_DAGEN} dagen gratis, zonder betaalgegevens.` : '.'}
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button size="lg" icon={<Sparkles className="h-4.5 w-4.5" />} onClick={() => ga('/abonnement')}>
              {proefMogelijk ? `${PROEF_DAGEN} dagen gratis proberen` : 'Bekijk Maatklaar Pro'}
            </Button>
            <Button size="lg" variant="secondary" icon={<ArrowLeft className="h-4.5 w-4.5" />} onClick={() => ga('/')}>
              Terug naar projecten
            </Button>
          </div>
        </div>
        <ul className="divide-y divide-sand-200 border-t border-sand-200 text-[0.88rem] text-ink-soft">
          <li className="flex gap-3 px-6 py-4 sm:px-9">
            <FolderOpen className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold-600" />
            <span>
              <strong className="font-semibold text-ink">Je bestaande projecten blijven gewoon werken.</strong> Openen, aanpassen, offerte delen en printen kan altijd.
            </span>
          </li>
          <li className="flex gap-3 px-6 py-4 sm:px-9">
            <Download className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold-600" />
            <span>
              Niets wordt verwijderd of op slot gezet. Een volledige back-up maken kan altijd via{' '}
              <button type="button" className="font-medium text-ink underline underline-offset-2" onClick={() => ga('/instellingen/backup')}>
                Instellingen
              </button>
              . Een project afronden en verwijderen maakt ook weer ruimte.
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
