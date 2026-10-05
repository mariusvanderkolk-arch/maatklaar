import { CloudUpload } from 'lucide-react'
import { Button, Dialog } from './ui'
import { geefToestemming, lokaleSamenvatting, useCloud } from '../lib/cloud/sync'

/** Na de eerste keer inloggen op dit apparaat: vragen of de lokale gegevens mee mogen naar het account. */
export function CloudToestemming() {
  const c = useCloud()
  if (!c.gebruiker || !c.toestemmingNodig) return null
  const s = lokaleSamenvatting()
  const delen = [
    s.projecten && `${s.projecten} ${s.projecten === 1 ? 'project' : 'projecten'}`,
    s.facturen && `${s.facturen} ${s.facturen === 1 ? 'factuur' : 'facturen'}`,
    s.prijzen && `${s.prijzen} eigen ${s.prijzen === 1 ? 'prijs' : 'prijzen'}`,
    s.bedrijf && 'je bedrijfsgegevens',
  ].filter(Boolean)
  return (
    <Dialog
      open
      onClose={() => geefToestemming(false)}
      title="Gegevens naar je account?"
      sub={`Ingelogd als ${c.gebruiker.email}`}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => geefToestemming(false)}
          >
            Nu niet
          </Button>
          <Button variant="gold" icon={<CloudUpload className="h-4 w-4" />} onClick={() => geefToestemming(true)}>
            Samenvoegen en synchroniseren
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        Op dit apparaat staan {delen.length ? delen.join(', ') : 'gegevens'}. Wil je die samenvoegen met je account, zodat je ze op al je apparaten hebt?
      </p>
      <ul className="mt-3 space-y-1.5 text-[0.82rem] text-ink-muted">
        <li>• Er wordt niets lokaal verwijderd; staat iets al in je account, dan worden beide samengevoegd.</li>
        <li>• Foto’s blijven alleen op dit apparaat (nog niet in de cloud).</li>
        <li>• Voorbeeldprojecten gaan niet mee.</li>
      </ul>
      <p className="mt-3 text-[0.82rem] text-ink-muted">Kies je ‘Nu niet’, dan blijft alles lokaal. Je kunt later starten via Account.</p>
    </Dialog>
  )
}
