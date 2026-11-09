import { ListChecks, Ruler } from 'lucide-react'
import { ga } from '../lib/router'
import { Button, Card } from './ui'
import type { offerteControle } from '../lib/offerteControle'
import type { useOffertePoort } from '../lib/useOffertePoort'

type Controle = ReturnType<typeof offerteControle>
export function OfferteControle({ controle, poort, projectId }: { controle: Controle; poort: ReturnType<typeof useOffertePoort>; projectId?: string }) {
  if (!controle.heeftPunten) return null
  return <Card className="p-5 ring-1 ring-gold-200">
    <div id="offerte-controle" tabIndex={-1} className="rounded-lg focus-visible:outline-2 focus-visible:outline-gold-500" data-testid="offerte-controle">
      <h2 className="flex items-center gap-2 font-sans text-[0.98rem] font-semibold"><ListChecks className="h-4 w-4 text-gold-700" aria-hidden="true" /> Offertecheck</h2>
      <p className="mt-1 text-[0.82rem] text-ink-muted">Er wordt niets aangepast of toegevoegd. Controleer de aandachtspunten vóór delen, PDF of een tekenlink.</p>
      {(['waarde', 'prijs'] as const).map((soort) => {
        const punten = controle.punten.filter((r) => r.soort === soort)
        return punten.length > 0 && <div key={soort} className="mt-3">
          <h3 className={`text-sm font-semibold ${soort === 'waarde' ? 'text-rust' : 'text-ink'}`}>{soort === 'waarde' ? 'Ongeldige invoer — herstellen' : 'Bedragen — controleren'}</h3>
          <ul className="mt-1 list-disc space-y-2 pl-4 text-[0.82rem] text-ink-soft">{punten.map((r) => <li key={r.id}>{r.tekst}</li>)}</ul>
        </div>
      })}
      {controle.punten.some((r) => r.soort === 'maten') && <div className="mt-3 rounded-xl bg-gold-100/60 p-3 ring-1 ring-gold-300" data-testid="offerte-controle-maten">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Ruler className="h-4 w-4 text-gold-700" aria-hidden="true" /> Maten — controleren</h3>
        <ul className="mt-1 list-disc space-y-2 pl-4 text-[0.82rem] text-ink-soft">{controle.punten.filter((r) => r.soort === 'maten').map((r) => <li key={r.id}>{r.tekst}</li>)}</ul>
        {projectId && <Button size="sm" variant="secondary" className="mt-2" icon={<Ruler className="h-4 w-4" />} onClick={() => ga(`/project/${projectId}/opmeten`)}>Naar Opmeten</Button>}
      </div>}
      {controle.herinneringen.length > 0 && <p className="mt-3 text-[0.82rem] text-ink-soft">Optioneel: bekijk de mogelijke posten bij ‘Niets vergeten?’ ({controle.herinneringen.map((r) => r.label).join(', ')}). Die zijn niet automatisch nodig.</p>}
      {poort.wachtend && <div role="status" aria-live="polite" className="mt-4 rounded-xl bg-gold-100 p-3" data-testid="offerte-controle-bevestig">
        <p className="text-sm font-medium">Eerst controleren, of bewust doorgaan met deze offerte?</p>
        <p className="mt-1 text-[0.78rem] font-medium">Gekozen actie: {poort.label}</p>
        <p className="mt-1 text-[0.78rem] text-ink-muted">Dit voert alleen je zojuist gekozen actie uit. WhatsApp en het deelvenster versturen niets automatisch.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={poort.bevestig} data-testid="offerte-controle-doorgaan">Bewust doorgaan</Button>
          <Button size="sm" variant="secondary" onClick={poort.annuleer}>Eerst controleren</Button>
        </div>
      </div>}
      {poort.bevestigd && <p className="mt-3 text-[0.78rem] text-ink-muted">Bewust bevestigd voor deze versie. Bij inhoudelijke wijzigingen controleer je opnieuw.</p>}
    </div>
  </Card>
}
