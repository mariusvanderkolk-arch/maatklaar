import { track } from '../lib/analytics'
import { useState } from 'react'
import { Copy, FlaskConical, Mail, MessageCircle, MessageSquareHeart } from 'lucide-react'
import { Button, Dialog } from './ui'
import { toast } from './Toast'
import { kopieer } from '../lib/share'
import { GEBRUIKEN_LABEL, feedbackIngevuld, feedbackTekst, legeFeedback, mailtoLink, whatsappLink, type Feedback, type Gebruiken } from '../lib/feedback'

const veld =
  'w-full rounded-xl border border-sand-300 bg-paper px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:border-gold-400 focus:ring-4 focus:ring-gold-300/25 focus:outline-none'

/** Banner bovenaan de testversie, met de knop om feedback te geven. */
export function TestBanner() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="no-print border-b border-gold-300/50 bg-gradient-to-r from-gold-100/80 via-sand-100 to-gold-100/80">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-6">
          <FlaskConical aria-hidden className="h-4 w-4 shrink-0 text-gold-600" />
          <p className="min-w-0 flex-1 text-[0.8rem] leading-snug text-ink-soft sm:text-[0.85rem]">
            <strong className="font-semibold text-ink">Testversie</strong> – probeer gerust alles uit. Gegevens blijven alleen op dit apparaat.
          </p>
          <button
            type="button"
            onClick={() => { track('feedback_opened'); setOpen(true) }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-paper/90 px-2.5 py-1.5 text-[0.8rem] font-medium text-ink ring-1 ring-gold-400/50 transition hover:bg-paper hover:ring-gold-500"
          >
            <MessageSquareHeart aria-hidden className="h-4 w-4 text-gold-600" />
            <span>
              Feedback<span className="hidden sm:inline"> geven</span>
            </span>
          </button>
        </div>
      </div>
      <FeedbackDialoog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function FeedbackDialoog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState<Feedback>(legeFeedback)
  const zet = <K extends keyof Feedback>(k: K, v: Feedback[K]) => setF((o) => ({ ...o, [k]: v }))
  const klaar = feedbackIngevuld(f)
  const tekst = feedbackTekst(f)
  const verzonden = () => {
    toast('Bedankt voor je feedback!')
    setF(legeFeedback())
    onClose()
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Feedback geven"
      sub="Vijf korte vragen. Je stuurt het zelf naar Marius via WhatsApp of e-mail."
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            icon={<Copy className="h-4 w-4" />}
            disabled={!klaar}
            onClick={async () => {
              const ok = (await kopieer(tekst)) === 'gekopieerd'
              toast(ok ? 'Feedback gekopieerd – plak het in een bericht aan Marius' : 'Kopiëren lukte niet', ok ? 'ok' : 'fout')
            }}
          >
            Kopiëren
          </Button>
          <a
            href={klaar ? mailtoLink(tekst) : undefined}
            aria-disabled={!klaar}
            onClick={(e) => (klaar ? verzonden() : e.preventDefault())}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium text-ink ring-1 ring-inset ring-sand-400/80 transition hover:ring-gold-400 ${klaar ? 'bg-paper' : 'pointer-events-none opacity-45'}`}
          >
            <Mail className="h-4 w-4" /> Via e-mail
          </a>
          <a
            href={klaar ? whatsappLink(tekst) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!klaar}
            onClick={(e) => (klaar ? verzonden() : e.preventDefault())}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-sand-50 transition hover:bg-[#3a332b] ${klaar ? '' : 'pointer-events-none opacity-45'}`}
          >
            <MessageCircle className="h-4 w-4" /> Versturen via WhatsApp
          </a>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p id="fb-cijfer" className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">
            Welk cijfer geef je de app? (1–10)
          </p>
          <div role="radiogroup" aria-labelledby="fb-cijfer" className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={f.cijfer === n}
                onClick={() => zet('cijfer', f.cijfer === n ? null : n)}
                className={`h-10 rounded-lg text-sm font-semibold tabular-nums transition ${f.cijfer === n ? 'bg-gold-400 text-ink ring-1 ring-gold-500' : 'bg-sand-100 text-ink-soft hover:bg-sand-200'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Wat vind je ervan?</span>
          <textarea rows={3} className={veld} value={f.indruk} placeholder="Wat werkt goed, wat is onhandig?" onChange={(e) => zet('indruk', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Wat mis je nog?</span>
          <textarea rows={2} className={veld} value={f.mist} placeholder="Bijv. een functie of materiaal dat je nodig hebt" onChange={(e) => zet('mist', e.target.value)} />
        </label>
        <div>
          <p id="fb-gebruiken" className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">
            Zou je het gebruiken in je werk?
          </p>
          <div role="radiogroup" aria-labelledby="fb-gebruiken" className="flex gap-2">
            {(Object.keys(GEBRUIKEN_LABEL) as Exclude<Gebruiken, ''>[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={f.gebruiken === k}
                onClick={() => zet('gebruiken', f.gebruiken === k ? '' : k)}
                className={`h-10 flex-1 rounded-lg text-sm font-medium transition ${f.gebruiken === k ? 'bg-ink text-sand-50' : 'bg-sand-100 text-ink-soft hover:bg-sand-200'}`}
              >
                {GEBRUIKEN_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[0.8rem] font-medium text-ink-soft">Je naam (optioneel)</span>
          <input className={`${veld} h-12`} value={f.naam} autoComplete="name" placeholder="Bijv. Piet – Bouwbedrijf De Vries" onChange={(e) => zet('naam', e.target.value)} />
        </label>
        {!klaar && <p className="text-xs text-ink-muted">Vul minstens één vraag in om te versturen.</p>}
      </div>
    </Dialog>
  )
}
