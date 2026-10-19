import { AftelKlok, useAftelling } from '../components/Aftelling'
import { Button, Card, PageTitle } from '../components/ui'
import { ga } from '../lib/router'

const VRAGEN: { v: string; a: string }[] = [
  {
    v: 'Wat gebeurt er na 1 januari 2027?',
    a: 'Daarna kost Maatklaar €20 per maand (excl. btw). Aannemers die zich vóór 1 januari 2027 aanmelden, krijgen daarna nog een half jaar gratis, tot 1 juli 2027.',
  },
  {
    v: 'Word ik automatisch afgeschreven?',
    a: 'Nee. Er wordt nooit automatisch iets in rekening gebracht. Je krijgt eerst bericht voordat je ergens voor betaalt, en je kiest zelf of je doorgaat.',
  },
  {
    v: 'Hoe meld ik me aan voor het extra halfjaar gratis?',
    a: 'Maak vóór 1 januari 2027 een gratis account aan via Inloggen (onderaan de pagina). Dan weten we dat je er vroeg bij was.',
  },
  {
    v: 'Wat gebeurt er met mijn gegevens als ik niet ga betalen?',
    a: 'Je gegevens blijven van jou. Je projecten staan op je eigen apparaat en je kunt altijd een back-up downloaden en meenemen.',
  },
  {
    v: 'Moet ik nu al betaalgegevens invullen?',
    a: 'Nee. Je hoeft nergens een bankrekening of creditcard op te geven.',
  },
]

export default function Tarieven() {
  const a = useAftelling()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageTitle eyebrow="Tarieven" title={a.klaar ? 'Maatklaar: €20 per maand' : 'Nu gratis tijdens de lancering'} sub="Eén abonnement, alles erin: opmeten, berekening, offertes met je eigen logo, laten tekenen en facturen." />
      <Card className="mt-6 overflow-hidden">
        <div className="bg-gradient-to-br from-gold-100/60 via-sand-50 to-paper px-5 py-6 sm:px-8">
          {!a.klaar && <p className="mb-3 text-sm font-semibold text-ink">Gratis tot 1 januari 2027, nog:</p>}
          <AftelKlok />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-sand-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Tot 1 januari 2027</p>
              <p className="mt-1 text-2xl font-semibold text-ink">Gratis</p>
              <p className="mt-1 text-sm text-ink-soft">Alle functies, zonder betaalgegevens.</p>
            </div>
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-sand-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">Vanaf 1 januari 2027</p>
              <p className="mt-1 text-2xl font-semibold text-ink">€20 <span className="text-base font-normal text-ink-soft">per maand, excl. btw</span></p>
              <p className="mt-1 text-sm text-ink-soft">Maandelijks opzegbaar.</p>
            </div>
          </div>
          <p className="mt-5 rounded-xl bg-gold-100/70 px-4 py-3 text-sm font-medium text-ink ring-1 ring-gold-200">
            🎁 Aannemers die zich vóór 1 januari 2027 aanmelden, krijgen daarna nog een half jaar gratis (tot 1 juli 2027).
          </p>
          <div className="mt-5">
            <Button onClick={() => ga('/nieuw')}>Begin gratis</Button>
          </div>
        </div>
      </Card>
      <h2 className="mt-10 text-xl font-semibold text-ink">Veelgestelde vragen</h2>
      <div className="mt-3 space-y-2">
        {VRAGEN.map((q) => (
          <details key={q.v} className="rounded-xl border border-sand-200 bg-paper px-4 py-3">
            <summary className="cursor-pointer font-medium text-ink">{q.v}</summary>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{q.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
