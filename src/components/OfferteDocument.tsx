import { LogoMark } from './Logo'
import { euro, getal } from '../lib/format'
import { datumNl, type OfferteData } from '../lib/offerte'
import { OntwerpSectie } from './ontwerp/OntwerpSectie'

/** Professionele offerteweergave; gebruikt in de app én in de alleen-lezen klantweergave. */
export interface Ondertekening {
  naam: string
  /** ISO-tijdstip */
  op: string
  handtekening: string
  hash?: string
}

export function OfferteDocument({ d, logo, className = '', beeld3d, interactief3d, ondertekening }: { d: OfferteData; logo?: string; className?: string; beeld3d?: string | null; interactief3d?: boolean; ondertekening?: Ondertekening | null }) {
  const b = d.bedrijf
  const heeftBedrijf = Boolean(b.naam)
  const gemengd = d.mat.some((m) => m[3])
  const contact = [b.telefoon, b.email, b.website].filter(Boolean)
  const registratie = [b.kvk && `KvK ${b.kvk}`, b.btw && `btw ${b.btw}`, b.iban && `IBAN ${b.iban}`].filter(Boolean)
  return (
    <article className={`card print-plain @container overflow-hidden ${className}`}>
      <div className="px-6 pt-8 pb-6 sm:px-10 sm:pt-10">
        <header className="flex flex-col gap-6 @2xl:flex-row @2xl:items-start @2xl:justify-between print:flex-row print:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            {logo ? (
              <img src={logo} alt={b.naam ? `Logo ${b.naam}` : 'Logo'} className="h-14 w-auto max-w-[9rem] object-contain" />
            ) : (
              !heeftBedrijf && <LogoMark className="h-12 w-12" />
            )}
            <div className="min-w-0 leading-tight">
              {heeftBedrijf ? (
                <>
                  <p className="font-display text-[1.6rem] leading-none font-semibold">{b.naam}</p>
                  {b.adres && <p className="mt-1.5 text-[0.78rem] text-ink-muted">{b.adres}</p>}
                  {contact.length > 0 && <p className="text-[0.78rem] text-ink-muted">{contact.join(' · ')}</p>}
                </>
              ) : (
                <>
                  <p className="font-display text-[1.7rem] leading-none font-semibold">
                    Maat<span className="text-gold-600">klaar</span>
                  </p>
                  <p className="mt-1 text-[0.62rem] font-medium uppercase tracking-[0.22em] text-ink-muted">Opgemeten · ontworpen · offerte klaar</p>
                </>
              )}
            </div>
          </div>
          <div className="text-left @2xl:text-right print:text-right">
            <p className="font-display text-[2rem] leading-none font-semibold">Offerte</p>
            <p className="mt-1.5 text-xs text-ink-muted">indicatieve raming</p>
            <dl className="mt-3 grid grid-cols-[auto_auto] justify-start gap-x-4 gap-y-0.5 text-[0.8rem] @2xl:justify-end print:justify-end">
              <dt className="text-ink-muted">Nummer</dt>
              <dd className="tabnum font-medium">{d.nr}</dd>
              <dt className="text-ink-muted">Datum</dt>
              <dd className="font-medium">{datumNl(d.datum)}</dd>
              <dt className="text-ink-muted">Geldig tot</dt>
              <dd className="font-medium">{datumNl(d.geldigTot)}</dd>
            </dl>
          </div>
        </header>

        <div className="gold-rule my-7" />

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-700">Opdrachtgever</p>
            <p className="mt-1.5 font-semibold">{d.klant || '—'}</p>
            {d.adres && <p className="text-sm text-ink-soft">{d.adres}</p>}
          </div>
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-700">Project</p>
            <p className="mt-1.5 font-semibold">{d.project}</p>
            <p className="text-sm text-ink-soft">
              {d.ruimte} · {d.maten}
            </p>
          </div>
        </div>

        <section className="avoid-break mt-8">
          <h2 className="font-display text-[1.35rem] font-semibold">Werkzaamheden</h2>
          <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm text-ink-soft sm:grid-cols-2">
            {d.werk.map(([l, o]) => (
              <li key={l} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden />
                <span>
                  <span className="font-medium text-ink">{l}</span> — {o.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="avoid-break mt-8">
          <h2 className="font-display text-[1.35rem] font-semibold">Oppervlakken</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {d.opp.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-sand-50 px-3.5 py-3 ring-1 ring-sand-200">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-muted">{k}</p>
                <p className="tabnum mt-0.5 font-semibold">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {d.ow && <OntwerpSectie ow={d.ow} beeld3d={beeld3d} interactief3d={interactief3d} />}

        <section className="mt-8">
          <h2 className="font-display text-[1.35rem] font-semibold">Materialen</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-sand-300 text-left text-[0.68rem] font-semibold uppercase tracking-wider text-ink-muted">
                <th className="py-2 pr-3 font-semibold">Omschrijving</th>
                <th className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Aantal</th>
                <th className="py-2 text-right font-semibold">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {d.mat.map(([oms, aantal, bedrag, vb], i) => (
                <tr key={i} className="avoid-break border-b border-sand-200 align-top">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-ink">{oms.split(' · ')[0]}</span>
                    {oms.includes(' · ') && <span className="text-ink-muted"> · {oms.split(' · ').slice(1).join(' · ')}</span>}
                    <span className="block text-[0.78rem] text-ink-muted sm:hidden">{aantal}</span>
                  </td>
                  <td className="tabnum hidden py-2 pr-3 text-right whitespace-nowrap text-ink-soft sm:table-cell">{aantal}</td>
                  <td className="tabnum py-2 text-right whitespace-nowrap">
                    {euro(bedrag)}
                    {gemengd && vb ? <span className="text-gold-600">*</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-3 pr-3 text-right font-medium text-ink-soft sm:hidden">
                  Subtotaal materialen
                </th>
                <th scope="row" colSpan={2} className="hidden pt-3 pr-3 text-right font-medium text-ink-soft sm:table-cell">
                  Subtotaal materialen
                </th>
                <td className="tabnum pt-3 text-right font-semibold">{euro(d.matTotaal)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {d.arb.length > 0 && (
          <section className="avoid-break mt-8">
            <h2 className="font-display text-[1.35rem] font-semibold">Arbeid</h2>
            <table className="mt-2 w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Werkzaamheid</th>
                  <th>Uren</th>
                </tr>
              </thead>
              <tbody>
                {d.arb.map(([oms, uren]) => (
                  <tr key={oms} className="border-b border-sand-200">
                    <td className="py-2 pr-3 text-ink">{oms}</td>
                    <td className="tabnum py-2 text-right whitespace-nowrap text-ink-soft">{getal(uren, 1)} uur</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="pt-3 pr-3 text-right font-medium text-ink-soft">
                    {getal(
                      d.arb.reduce((s, a) => s + a[1], 0),
                      1,
                    )}{' '}
                    uur × {euro(d.tarief)}
                  </th>
                  <td className="tabnum pt-3 text-right font-semibold">{euro(d.arbTotaal)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {d.onv && d.onv[1] > 0 && (
          <div className="avoid-break mt-6 flex items-baseline justify-between border-t border-sand-200 pt-3 text-[0.9rem]">
            <span className="text-ink-soft">Onvoorzien ({getal(d.onv[0], 1)}% stelpost over materiaal{d.arb.length ? ' en arbeid' : ''})</span>
            <span className="tabnum font-semibold">{euro(d.onv[1])}</span>
          </div>
        )}

        <section className="avoid-break mt-8 rounded-2xl bg-ink px-6 py-5 text-sand-50">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-300">Totaal indicatief</p>
              <p className="mt-1 text-xs text-sand-300">Materialen{d.arb.length ? ' + arbeid' : ''}{d.onv?.[1] ? ' + onvoorzien' : ''} · incl. 21% btw</p>
            </div>
            <p className="tabnum font-display text-[2.3rem] leading-none font-semibold">{euro(d.totaal)}</p>
          </div>
        </section>

        <div className="avoid-break mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-sand-200 px-4 py-3 text-[0.8rem]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-700">Voorwaarden</p>
            <p className="mt-1 text-ink-soft">Deze offerte is geldig tot {datumNl(d.geldigTot)}.</p>
            {d.betaaltermijn && <p className="text-ink-soft">{d.betaaltermijn}</p>}
          </div>
          {d.notities && (
            <div className="rounded-xl border border-sand-200 px-4 py-3 text-[0.8rem]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-700">Notities</p>
              <p className="mt-1 whitespace-pre-line text-ink-soft">{d.notities}</p>
            </div>
          )}
          {d.aannames && (
            <div className="rounded-xl border border-sand-200 px-4 py-3 text-[0.8rem] sm:col-span-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-700">Aannames en niet inbegrepen</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-soft">
                {d.aannames.split('\n').map((r) => r.trim()).filter(Boolean).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>

        {ondertekening && (
          <div className="avoid-break mt-6 rounded-xl border border-sage/40 bg-[#f3f6f1] px-4 py-3 text-[0.8rem]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sage">Voor akkoord getekend</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">{ondertekening.naam}</p>
                <p className="text-ink-soft">
                  {new Date(ondertekening.op).toLocaleString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}
                </p>
                {ondertekening.hash && <p className="mt-1 font-mono text-[0.62rem] break-all text-ink-muted">Controlecode {ondertekening.hash.slice(0, 16)}</p>}
              </div>
              <img src={ondertekening.handtekening} alt={`Handtekening van ${ondertekening.naam}`} className="h-20 max-w-[260px] object-contain" />
            </div>
          </div>
        )}

        <p className="mt-5 text-[0.72rem] leading-relaxed text-ink-muted">
          Deze raming is indicatief en gebaseerd op opgegeven maten en vuistregels. {d.prijsTekst} Arbeidsuren zijn een schatting. Aan deze raming
          kunnen geen rechten worden ontleend; een definitieve offerte volgt na inspectie ter plaatse.
        </p>
        {registratie.length > 0 && (
          <p className="mt-4 border-t border-sand-200 pt-3 text-center text-[0.72rem] text-ink-muted">
            {[b.naam, ...registratie].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </article>
  )
}
