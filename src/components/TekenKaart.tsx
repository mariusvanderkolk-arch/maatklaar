import { useEffect, useState } from 'react'
import { Bell, BellRing, Eye, MessageCircle, PenLine, ReceiptText, Share2 } from 'lucide-react'
import { Button, Card } from './ui'
import { OpvolgBadge } from './OpvolgBadge'
import { dagenSinds, herinneringNodig, herinneringTekst, opvolgstatus } from '../lib/opvolging'
import { verwerkStatus, markeerGezien } from '../lib/opvolgingSync'
import { meldingStand, vraagMeldingen } from '../lib/meldingen'
import { geldigeTermijnen, TERMIJN_VOORSTELLEN } from '../lib/factuur'
import { toast } from './Toast'
import { codeerOfferte, type OfferteData } from '../lib/offerte'
import { deelVoorOndertekening, FOUT_TEKST, haalTekenStatus, tekenLink } from '../lib/ondertekenen'
import { kopieer } from '../lib/share'
import { projectStore } from '../lib/store'
import { track } from '../lib/analytics'
import { openWhatsapp, whatsappTekst, whatsappUrl } from '../lib/whatsapp'
import { factuurVanOfferte, useFacturen } from '../lib/factuurStore'
import { ga } from '../lib/router'
import type { OfferteStatus, Project } from '../lib/types'

type Teken = NonNullable<OfferteStatus['teken']>
const tijd = (iso: string) => new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })

/** Is de huidige offerte nog gelijk aan de getekende/gedeelde versie? */
export const zelfdeVersie = (t: Teken | undefined, d: OfferteData) => !!t && t.code === codeerOfferte(d)

async function deelLink(url: string, titel: string, tekst: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titel, text: tekst, url })
      return toast('Tekenlink gedeeld')
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return
    }
  }
  toast((await kopieer(url)) === 'gekopieerd' ? 'Tekenlink gekopieerd' : 'Kopiëren mislukt')
}

export function TekenKaart({ p, d }: { p: Project; d: OfferteData }) {
  const t = p.offerte?.teken
  const [bezig, setBezig] = useState(false)
  const gewijzigd = !!t && !zelfdeVersie(t, d)
  const zet = (patch: Partial<Teken> | undefined, extra: Partial<OfferteStatus> = {}) =>
    projectStore.werkBij(p.id, (x) => ({ ...x, offerte: { ...x.offerte, ...extra, teken: patch ? ({ ...x.offerte?.teken, ...patch } as Teken) : undefined } }))

  // status ophalen en (zolang niet getekend) elke 20 s opnieuw, alleen als het tabblad zichtbaar is
  useEffect(() => {
    if (!t || t.getekend) return
    let weg = false
    const kijk = async () => {
      if (document.hidden) return
      const r = await haalTekenStatus(t.token)
      if (weg || !r.ok) return
      const huidig = projectStore.alle().find((x) => x.id === p.id)
      if (!huidig) return
      const v = verwerkStatus(huidig, r.data, true)
      if (v.project !== huidig) projectStore.werkBij(p.id, () => v.project)
      if (v.nieuwGetekend) toast(`Offerte getekend door ${v.project.offerte?.teken?.getekend?.naam || 'de klant'}`)
    }
    kijk()
    const id = setInterval(kijk, 20000)
    return () => {
      weg = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.token, t?.getekend])

  // getekend gezien: badge "Nieuw" weg
  useEffect(() => {
    if (t?.nieuwGetekend) markeerGezien(p.id)
  }, [t?.nieuwGetekend, p.id])

  const facturen = useFacturen().filter((f) => f.projectId === p.id)
  const [termijnen, setTermijnen] = useState<number[]>([100])
  const [eigen, setEigen] = useState('')
  const [meldStand, setMeldStand] = useState(meldingStand)
  const herinner = herinneringNodig(t)
  const status = opvolgstatus(p)
  const bruikbaar = !!t && !t.getekend && !gewijzigd

  /** Maakt een nieuwe tekenlink; geeft de url terug (of null bij een fout). */
  const maakLink = async (): Promise<string | null> => {
    setBezig(true)
    const r = await deelVoorOndertekening(d)
    setBezig(false)
    if (!r.ok) {
      toast(r.fout === 'niet-beschikbaar' ? 'Digitaal tekenen is nog niet beschikbaar. Deel voorlopig de gewone offerte-link.' : FOUT_TEKST[r.fout], 'fout')
      return null
    }
    zet({ token: r.data.token, hash: r.data.hash, nr: d.nr, code: codeerOfferte(d), gedeeldOp: Date.now(), geldigTot: d.geldigTot, getekend: undefined, bekekenOp: undefined, herinnerdOp: undefined, nieuwGetekend: undefined })
    return tekenLink(r.data.token)
  }

  const viaWhatsapp = async () => {
    // venster meteen openen (binnen de tik), anders blokkeren browsers het na het wachten op de link
    const venster = bruikbaar ? null : window.open('', '_blank')
    const link = bruikbaar ? tekenLink(t!.token) : await maakLink()
    if (!link) return venster?.close()
    track('offerte_shared', { detail: 'whatsapp' })
    openWhatsapp(whatsappUrl(whatsappTekst(p.klant, p.naam, link)), venster)
  }

  const maakFactuur = () => {
    if (!geldigeTermijnen(termijnen)) return toast('De termijnen moeten samen 100% zijn.', 'fout')
    const f = factuurVanOfferte(d, p.id, termijnen)
    if (!f) return toast('Factuur opslaan mislukt: opslag vol.', 'fout')
    track('factuur_created', { detail: 'na_tekenen' })
    toast(termijnen.length > 1 ? `${termijnen.length} termijnfacturen aangemaakt (vanaf ${f.nummer})` : `Factuur ${f.nummer} aangemaakt`)
    ga(`/factuur/${f.id}`)
  }

  const stuurHerinnering = () => {
    if (!t) return
    zet({ herinnerdOp: Date.now() })
    track('offerte_shared', { detail: 'herinnering' })
    openWhatsapp(whatsappUrl(herinneringTekst(p.klant, p.naam, tekenLink(t.token), !!t.bekekenOp)))
  }

  const zetEigen = (v: string) => {
    setEigen(v)
    const pcts = v.split(/[\/\s,;+]+/).filter(Boolean).map((x) => Number(x.replace('%', '').replace(',', '.')))
    setTermijnen(pcts.length ? pcts : [100])
  }

  const nieuw = async () => {
    const link = await maakLink()
    if (!link) return
    track('offerte_shared')
    await deelLink(link, `Offerte ${d.nr}`, `Beste ${p.klant || 'klant'}, hierbij de offerte voor ${p.naam}. Je kunt hem bekijken en digitaal tekenen via deze link:`)
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.98rem] font-semibold">Digitaal laten tekenen</p>
          <p className="mt-0.5 text-[0.82rem] leading-snug text-ink-muted">De klant zet zijn naam en handtekening onder de offerte. Je ziet het hier meteen.</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1" data-testid="opvolgstatus">
          <OpvolgBadge p={p} />
        </div>
      </div>

      {t?.getekend && (
        <div className="mt-4 rounded-xl bg-[#f3f6f1] px-3.5 py-3 ring-1 ring-[#d3dfcd]" data-testid="getekend">
          <p className="text-sm font-semibold text-ink">Getekend op {tijd(t.getekend.op)}</p>
          <p className="text-[0.8rem] text-ink-soft">door {t.getekend.naam}</p>
          <img src={t.getekend.handtekening} alt={`Handtekening van ${t.getekend.naam}`} className="mt-2 h-16 max-w-full rounded bg-white object-contain ring-1 ring-sand-200" />
          {gewijzigd && <p className="mt-2 text-[0.76rem] font-medium text-rust">Let op: de offerte is na het tekenen gewijzigd. De handtekening hoort bij versie {t.nr} zoals toen gedeeld.</p>}
        </div>
      )}
      {t && !t.getekend && (
        <p className="mt-3 text-[0.8rem] text-ink-soft">
          Tekenlink gedeeld op {tijd(new Date(t.gedeeldOp).toISOString())}.{' '}
          {t.bekekenOp ? (
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Door de klant bekeken op {tijd(t.bekekenOp)}.
            </span>
          ) : status === 'verlopen' ? (
            <span className="font-medium text-rust">De offerte is verlopen; deel een nieuwe tekenlink als de klant nog wil tekenen.</span>
          ) : (
            'Nog niet geopend door de klant.'
          )}
          {gewijzigd && <span className="mt-1 block font-medium text-rust">Je hebt de offerte daarna gewijzigd: deel een nieuwe tekenlink.</span>}
        </p>
      )}

      {t && !t.getekend && herinner && !gewijzigd && (
        <div className="mt-4 rounded-xl bg-gold-100/60 px-3.5 py-3 ring-1 ring-gold-200" data-testid="herinnering">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <BellRing className="h-4 w-4 text-gold-700" aria-hidden="true" /> Al {dagenSinds(t.gedeeldOp)} dagen niet getekend
          </p>
          <p className="mt-0.5 text-[0.8rem] text-ink-soft">Stuur de klant een vriendelijke herinnering. Je ziet het bericht eerst in WhatsApp en verstuurt het zelf.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" icon={<MessageCircle className="h-4 w-4" />} onClick={stuurHerinnering} data-testid="stuur-herinnering">
              Stuur herinnering via WhatsApp
            </Button>
            <Button size="sm" variant="ghost" onClick={() => zet({ herinnerdOp: Date.now() })}>
              Later
            </Button>
          </div>
        </div>
      )}

      {t && !t.getekend && status !== 'verlopen' && (meldStand === 'uit' || meldStand === 'aan') && (
        <p className="mt-3 flex items-center gap-1.5 text-[0.8rem] text-ink-soft">
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          {meldStand === 'aan' ? (
            'Je krijgt een melding op dit apparaat als de klant tekent (bij het openen van de app).'
          ) : (
            <button type="button" className="inline-block py-2 font-medium text-gold-700 underline underline-offset-2" onClick={async () => setMeldStand(await vraagMeldingen())}>
              Meld mij op dit apparaat als de klant tekent
            </button>
          )}
        </p>
      )}

      {t?.getekend && !facturen.length && (
        <div className="mt-4" data-testid="termijnen">
          <p className="text-sm font-semibold text-ink">Factuur in één keer of in termijnen</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TERMIJN_VOORSTELLEN.map((v) => {
              const actief = !eigen && v.pcts.join('/') === termijnen.join('/')
              return (
                <button
                  key={v.label}
                  type="button"
                  aria-pressed={actief}
                  onClick={() => { setEigen(''); setTermijnen(v.pcts) }}
                  className={`h-11 rounded-full px-3.5 text-[0.85rem] font-medium ring-1 ring-inset transition sm:h-9 ${actief ? 'bg-ink text-sand-50 ring-ink' : 'bg-paper text-ink-soft ring-sand-300 hover:ring-gold-300'}`}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
          <label className="mt-2 block text-[0.8rem] text-ink-soft">
            Eigen verdeling (bijv. 25/25/50)
            <input
              value={eigen}
              onChange={(e) => zetEigen(e.target.value)}
              inputMode="decimal"
              placeholder="25/25/50"
              className="mt-1 block h-11 w-full rounded-xl bg-paper px-3 text-[0.95rem] text-ink ring-1 ring-sand-300 ring-inset focus:ring-2 focus:ring-gold-400 focus:outline-none"
              aria-invalid={!!eigen && !geldigeTermijnen(termijnen)}
            />
          </label>
          {eigen && !geldigeTermijnen(termijnen) && <p className="mt-1 text-[0.78rem] font-medium text-rust">Samen {Math.round(termijnen.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) * 100) / 100}% — dat moet 100% zijn (max. 6 termijnen).</p>}
        </div>
      )}

      {t?.getekend && (
        <Button variant="gold" size="lg" className="mt-4 w-full whitespace-normal" icon={<ReceiptText className="h-4 w-4" />} onClick={facturen.length ? () => ga(facturen.length > 1 ? '/facturen' : `/factuur/${facturen[0].id}`) : maakFactuur} data-testid="maak-factuur">
          {facturen.length ? `Klant heeft getekend ✅ — Bekijk factuur ${facturen[facturen.length - 1].nummer}${facturen.length > 1 ? ` (+${facturen.length - 1})` : ''}` : termijnen.length > 1 ? `Getekend ✅ — Maak ${termijnen.length} termijnfacturen` : 'Klant heeft getekend ✅ — Maak factuur'}
        </Button>
      )}

      <div className="mt-4 grid gap-2">
        {!t?.getekend && (
          <button
            type="button"
            onClick={viaWhatsapp}
            disabled={bezig}
            data-testid="deel-whatsapp"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#1ebe5a] active:scale-[.98] disabled:opacity-45"
          >
            <MessageCircle className="h-5 w-5" /> {bezig ? 'Link maken…' : 'Deel via WhatsApp'}
          </button>
        )}
        {t && !t.getekend && !gewijzigd ? (
          <Button variant="secondary" icon={<Share2 className="h-4 w-4" />} onClick={() => deelLink(tekenLink(t.token), `Offerte ${d.nr}`, `Beste ${p.klant || 'klant'}, hierbij de offerte voor ${p.naam}. Je kunt hem bekijken en digitaal tekenen via deze link:`)}>
            Tekenlink opnieuw delen
          </Button>
        ) : (
          <Button variant="secondary" icon={<PenLine className="h-4 w-4" />} disabled={bezig} onClick={nieuw}>
            {bezig ? 'Link maken…' : t ? 'Nieuwe tekenlink delen' : 'Tekenlink delen'}
          </Button>
        )}
      </div>
      <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-muted">
        De offerte wordt als vaste versie op de server bewaard onder een geheime link. Alleen wie de link heeft kan hem openen en één keer tekenen.
      </p>
    </Card>
  )
}
