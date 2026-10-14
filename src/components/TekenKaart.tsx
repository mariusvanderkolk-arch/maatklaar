import { useEffect, useState } from 'react'
import { CircleCheck, Clock, MessageCircle, PenLine, ReceiptText, Share2 } from 'lucide-react'
import { Badge, Button, Card } from './ui'
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
      if (weg || !r.ok || !r.data.signed_at || !r.data.signature) return
      const naam = r.data.signer_name ?? ''
      zet({ getekend: { naam, op: r.data.signed_at, handtekening: r.data.signature } }, { akkoord: { naam, datum: r.data.signed_at.slice(0, 10) } })
      toast(`Offerte getekend door ${naam}`)
    }
    kijk()
    const id = setInterval(kijk, 20000)
    return () => {
      weg = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.token, t?.getekend])

  const facturen = useFacturen().filter((f) => f.projectId === p.id)
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
    zet({ token: r.data.token, hash: r.data.hash, nr: d.nr, code: codeerOfferte(d), gedeeldOp: Date.now(), getekend: undefined })
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
    const f = factuurVanOfferte(d, p.id)
    if (!f) return toast('Factuur opslaan mislukt: opslag vol.', 'fout')
    track('factuur_created', { detail: 'na_tekenen' })
    toast(`Factuur ${f.nummer} aangemaakt`)
    ga(`/factuur/${f.id}`)
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
        {t?.getekend ? (
          <Badge tone="sage">
            <CircleCheck className="h-3.5 w-3.5" /> Getekend
          </Badge>
        ) : t ? (
          <Badge>
            <Clock className="h-3.5 w-3.5" /> Wacht
          </Badge>
        ) : null}
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
          Tekenlink gedeeld op {tijd(new Date(t.gedeeldOp).toISOString())}. Nog niet getekend.
          {gewijzigd && <span className="mt-1 block font-medium text-rust">Je hebt de offerte daarna gewijzigd: deel een nieuwe tekenlink.</span>}
        </p>
      )}

      {t?.getekend && (
        <Button variant="gold" size="lg" className="mt-4 w-full whitespace-normal" icon={<ReceiptText className="h-4 w-4" />} onClick={facturen.length ? () => ga(`/factuur/${facturen[0].id}`) : maakFactuur} data-testid="maak-factuur">
          {facturen.length ? `Klant heeft getekend ✅ — Bekijk factuur ${facturen[0].nummer}` : 'Klant heeft getekend ✅ — Maak factuur'}
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
      <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-muted">
        De offerte wordt als vaste versie op de server bewaard onder een geheime link. Alleen wie de link heeft kan hem openen en één keer tekenen.
      </p>
    </Card>
  )
}
