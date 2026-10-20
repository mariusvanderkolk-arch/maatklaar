import { AlertTriangle } from 'lucide-react'
import { euro } from '../lib/format'
import { datumNl, type OfferteData } from '../lib/offerte'
import { waarschuwing } from '../lib/meerwerk'

/** De meerwerkbon zoals de klant hem ziet (scherm en print). */
export function MeerwerkDocument({ d, ondertekening }: { d: OfferteData; ondertekening?: { naam: string; op: string; handtekening: string } | null }) {
  const mw = d.mw!
  const b = d.bedrijf
  const meer = mw.soort === 'meer'
  return (
    <article className="card overflow-hidden bg-paper print:shadow-none print:ring-0" data-testid="meerwerkbon">
      <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {b.naam && <p className="font-display text-[1.4rem] font-semibold text-ink">{b.naam}</p>}
            <p className="text-[0.8rem] leading-relaxed text-ink-muted">{[b.adres, b.telefoon, b.email].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-[1.6rem] leading-none font-semibold text-ink">{meer ? 'Meerwerkbon' : 'Minderwerkbon'}</p>
            <p className="tabnum mt-1 text-[0.8rem] text-ink-muted">
              {d.nr} · {datumNl(d.datum)}
            </p>
          </div>
        </header>
        <dl className="grid gap-3 rounded-2xl bg-sand-50 p-4 text-[0.88rem] ring-1 ring-sand-200 sm:grid-cols-2">
          <div>
            <dt className="text-[0.72rem] font-semibold tracking-[0.14em] text-gold-700 uppercase">Opdrachtgever</dt>
            <dd className="mt-0.5 text-ink">{d.klant || '—'}</dd>
            {d.adres && <dd className="text-ink-muted">{d.adres}</dd>}
          </div>
          <div>
            <dt className="text-[0.72rem] font-semibold tracking-[0.14em] text-gold-700 uppercase">Project</dt>
            <dd className="mt-0.5 text-ink">{d.project || '—'}</dd>
            {mw.offerteNr && mw.offerteNr !== '—' && <dd className="text-ink-muted">Bij offerte {mw.offerteNr}</dd>}
          </div>
        </dl>
        <section>
          <h2 className="text-[0.72rem] font-semibold tracking-[0.14em] text-gold-700 uppercase">{meer ? 'Extra werk' : 'Vervallen werk'}</h2>
          <p className="mt-1 text-[1.02rem] leading-relaxed text-ink">{mw.omschrijving}</p>
          {mw.reden && (
            <>
              <h2 className="mt-4 text-[0.72rem] font-semibold tracking-[0.14em] text-gold-700 uppercase">Reden</h2>
              <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-soft">{mw.reden}</p>
            </>
          )}
          {mw.foto && <img src={mw.foto} alt="Foto bij dit meer-/minderwerk" className="mt-4 max-h-72 w-full rounded-2xl object-cover ring-1 ring-sand-200" />}
        </section>
        <section className="rounded-2xl ring-1 ring-sand-200">
          {mw.materiaal != null && (
            <div className="flex justify-between gap-4 border-b border-sand-200 px-4 py-2.5 text-[0.88rem] text-ink-soft">
              <span>Materiaal</span>
              <span className="tabnum">{euro(mw.materiaal)}</span>
            </div>
          )}
          {mw.uren != null && mw.uren > 0 && (
            <div className="flex justify-between gap-4 border-b border-sand-200 px-4 py-2.5 text-[0.88rem] text-ink-soft">
              <span>Arbeid ({String(mw.uren).replace('.', ',')} uur)</span>
              <span className="tabnum">{euro(Math.abs(mw.bedrag) - (mw.materiaal ?? 0))}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4 bg-ink px-4 py-3.5 text-paper">
            <span className="font-semibold">{meer ? 'Prijsverhoging' : 'Prijsverlaging'}</span>
            <span className="tabnum font-display text-[1.5rem] font-semibold">
              {meer ? '+ ' : '− '}
              {euro(Math.abs(mw.bedrag))}
            </span>
          </div>
          <p className="px-4 py-2 text-[0.74rem] text-ink-muted">Bedrag incl. 21% btw. Wordt verrekend met de eindfactuur.</p>
        </section>
        <p className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[0.88rem] leading-relaxed ring-1 ${meer ? 'bg-rust/5 text-ink ring-rust/25' : 'bg-sage/10 text-ink ring-sage/30'}`} data-testid="meerwerk-waarschuwing">
          <AlertTriangle className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${meer ? 'text-rust' : 'text-sage'}`} />
          {waarschuwing(mw.soort, mw.bedrag, euro)}
        </p>
        {ondertekening && (
          <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
            <p className="text-[0.82rem] text-ink-soft">
              Akkoord gegeven door <strong className="text-ink">{ondertekening.naam}</strong> op{' '}
              {new Date(ondertekening.op).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Amsterdam' })}
            </p>
            <img src={ondertekening.handtekening} alt="Handtekening" className="mt-2 h-20 object-contain" />
          </div>
        )}
      </div>
    </article>
  )
}
