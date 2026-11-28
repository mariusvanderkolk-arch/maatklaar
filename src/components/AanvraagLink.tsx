import { useMemo, useState } from 'react'
import { Copy, Download, ExternalLink, Inbox, MessageCircle } from 'lucide-react'
import { Button, Card, CardHeader, TextField } from './ui'
import { toast } from './Toast'
import { aanvraagLink, waNummer } from '../lib/aanvraag'
import { useBedrijf } from '../lib/bedrijf'
import { qrSvg } from '../lib/qr'
import { kopieer } from '../lib/share'
import { openWhatsapp, whatsappUrl } from '../lib/whatsapp'

/** Instellingen: eigen aanvraaglink + QR, voor op je website, bus of visitekaartje. */
export function AanvraagLinkSectie() {
  const b = useBedrijf()
  const [eigenNummer, setEigenNummer] = useState('')
  const nummer = waNummer(eigenNummer || b.telefoon)
  const link = nummer ? aanvraagLink({ n: b.naam.trim(), t: nummer }) : ''
  const qr = useMemo(() => (link ? qrSvg(link) : null), [link])
  const downloadQr = () => {
    if (!qr) return
    const url = URL.createObjectURL(new Blob([qr], { type: 'image/svg+xml' }))
    const el = document.createElement('a')
    el.href = url
    el.download = 'aanvraaglink-qr.svg'
    el.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  return (
    <section id="sectie-aanvraag" className="scroll-mt-36">
      <Card>
        <CardHeader
          icon={<Inbox className="h-5 w-5" />}
          title="Aanvraaglink"
          sub="Je eigen aanvraagformulier. De klant beantwoordt de vragen die bij zijn klus horen en stuurt het via WhatsApp naar jou, met een link waarmee je er direct een project van maakt."
        />
        <div className="space-y-4 p-5 sm:p-6">
          {!b.telefoon.trim() && (
            <TextField
              label="Je zakelijke WhatsApp-nummer"
              value={eigenNummer}
              onChange={setEigenNummer}
              type="tel"
              inputMode="tel"
              placeholder="06 12345678"
              hint="Of vul je telefoonnummer in bij Bedrijfsgegevens, dan staat het er vast in."
              fout={eigenNummer && !nummer ? 'Dit nummer klopt niet helemaal.' : null}
            />
          )}
          {link ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {qr && (
                  <div className="mx-auto w-40 shrink-0 rounded-xl bg-white p-2 ring-1 ring-sand-300 sm:mx-0" aria-label="QR-code van je aanvraaglink" role="img" dangerouslySetInnerHTML={{ __html: qr }} />
                )}
                <div className="min-w-0 flex-1 space-y-2.5">
                  <p className="rounded-xl bg-sand-50 px-3.5 py-2.5 font-mono text-[0.75rem] break-all text-ink-soft ring-1 ring-sand-200" data-testid="aanvraaglink">{link}</p>
                  <p className="text-[0.8rem] leading-snug text-ink-muted">
                    Zet de link op je website, onder je e-mail of in je WhatsApp-status. De QR-code past op je bus, visitekaartje of een flyer. Aanvragen komen binnen op {b.telefoon.trim() || eigenNummer}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon={<Copy className="h-4 w-4" />} onClick={async () => ((await kopieer(link)) === 'gekopieerd' ? toast('Aanvraaglink gekopieerd') : toast('Kopiëren mislukt', 'fout'))} data-testid="kopieer-aanvraaglink">
                  Link kopiëren
                </Button>
                <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => window.open(link, '_blank', 'noopener')}>
                  Bekijk als klant
                </Button>
                {qr && (
                  <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={downloadQr}>
                    QR-code
                  </Button>
                )}
                <Button
                  variant="secondary"
                  icon={<MessageCircle className="h-4 w-4" />}
                  onClick={() => openWhatsapp(whatsappUrl(`Wil je deze knop op mijn website zetten? Tekst: "Offerte aanvragen", link: ${link}`))}
                >
                  Naar je websitebouwer
                </Button>
              </div>
              {!b.naam.trim() && <p className="text-[0.78rem] text-ink-muted">Tip: vul je bedrijfsnaam in bij Bedrijfsgegevens, dan staat die bovenaan het formulier.</p>}
            </>
          ) : (
            <p className="text-[0.85rem] text-ink-muted">Vul een geldig telefoonnummer in om je link te maken.</p>
          )}
        </div>
      </Card>
    </section>
  )
}
