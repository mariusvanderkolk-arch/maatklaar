import { useEffect, useState, type FormEvent } from 'react'
import { CloudUpload, Download, KeyRound, LogOut, Mail, RefreshCw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { Button, Card, CardHeader, Dialog, Notice, PageTitle, TextField } from '../components/ui'
import { SyncStatus } from '../components/SyncStatus'
import { toast } from '../components/Toast'
import { datum } from '../lib/format'
import {
  NL_FOUT,
  controleerDatabase,
  geefToestemming,
  loginMetWachtwoord,
  maakAccount,
  nieuwWachtwoord,
  stuurInlogLink,
  stuurWachtwoordReset,
  syncNu,
  uitloggen,
  useCloud,
  verwijderAccount,
  verwijderCloudGegevens,
} from '../lib/cloud/sync'

type Db = 'onbekend' | 'klaar' | 'geen-tabel' | 'offline' | 'fout'

const GEEN_TABEL =
  'De cloud-opslag wordt nog ingericht (de database-tabel bestaat nog niet). Inloggen en synchroniseren werkt zodra dat klaar is. Je kunt de app gewoon lokaal blijven gebruiken; er gaat niets verloren.'

export function Account() {
  const c = useCloud()
  const [db, setDb] = useState<Db>('onbekend')
  useEffect(() => {
    let weg = false
    controleerDatabase().then((r) => !weg && setDb(r))
    return () => {
      weg = true
    }
  }, [c.status])

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <PageTitle
        eyebrow="Account"
        title="Account en synchronisatie"
        sub="Optioneel. Log in om je gegevens op al je apparaten te hebben. Zonder account werkt alles gewoon lokaal, op dit apparaat."
      />

      <div className="mt-7 space-y-4">
        {(db === 'geen-tabel' || c.status === 'geen-tabel') && (
          <Notice title="Cloud nog niet beschikbaar">
            {GEEN_TABEL}
          </Notice>
        )}
        {c.inlogMelding && (
          <Notice title="Inloggen lukte niet">
            {c.inlogMelding}
          </Notice>
        )}

        {c.herstel && c.gebruiker && <NieuwWachtwoord />}
        {c.gebruiker ? <Ingelogd db={db} /> : <Inloggen />}

        <Card className="p-5 sm:p-6">
          <p className="font-semibold">Wat wordt gesynchroniseerd?</p>
          <ul className="mt-2 grid gap-1.5 text-sm text-ink-soft sm:grid-cols-2">
            <li>✓ Projecten, incl. planning en uren</li>
            <li>✓ Facturen</li>
            <li>✓ Eigen prijzen</li>
            <li>✓ Bedrijfsgegevens</li>
            <li className="text-ink-muted">✗ Foto’s (blijven op dit apparaat)</li>
            <li className="text-ink-muted">✗ AI-sleutel en voorbeeldprojecten</li>
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            Bij een conflict wint de laatste wijziging. Offline werk je gewoon door; zodra je weer online bent wordt alles verstuurd.{' '}
            <a href="#/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy
            </a>
          </p>
        </Card>
      </div>
    </div>
  )
}

function Inloggen() {
  const [modus, setModus] = useState<'link' | 'wachtwoord'>('link')
  const [nieuw, setNieuw] = useState(false)
  const [email, setEmail] = useState('')
  const [ww, setWw] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [klaar, setKlaar] = useState<string | null>(null)
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim())

  async function verstuur(e: FormEvent) {
    e.preventDefault()
    if (!emailOk) return setFout('Vul een geldig e-mailadres in.')
    setBezig(true)
    setFout(null)
    setKlaar(null)
    try {
      if (modus === 'link') {
        await stuurInlogLink(email.trim())
        setKlaar(`We hebben een inloglink gestuurd naar ${email.trim()}. Open de mail op dit apparaat en tik op de link.`)
      } else if (nieuw) {
        const bevestigen = await maakAccount(email.trim(), ww)
        setKlaar(bevestigen ? `Account aangemaakt. Bevestig je e-mailadres via de link die we naar ${email.trim()} hebben gestuurd.` : 'Account aangemaakt en ingelogd.')
      } else {
        await loginMetWachtwoord(email.trim(), ww)
        toast('Ingelogd')
      }
    } catch (err) {
      setFout(NL_FOUT(err))
    } finally {
      setBezig(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={<UserRound className="h-5 w-5" />} title="Inloggen" sub="Inloggen om je gegevens op al je apparaten te hebben." />
      <div className="px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
        <div role="tablist" aria-label="Manier van inloggen" className="grid grid-cols-2 gap-1 rounded-xl bg-sand-100 p-1">
          {(
            [
              ['link', 'Inloglink per e-mail'],
              ['wachtwoord', 'Met wachtwoord'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={modus === id}
              onClick={() => {
                setModus(id)
                setFout(null)
                setKlaar(null)
              }}
              className={`h-9 rounded-lg text-[0.85rem] font-medium transition ${modus === id ? 'bg-paper text-ink shadow-sm ring-1 ring-sand-300' : 'text-ink-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={verstuur} className="mt-4 space-y-3">
          <TextField label="E-mailadres" type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} placeholder="naam@bedrijf.nl" />
          {modus === 'wachtwoord' && (
            <TextField
              label={nieuw ? 'Kies een wachtwoord (min. 6 tekens)' : 'Wachtwoord'}
              type="password"
              autoComplete={nieuw ? 'new-password' : 'current-password'}
              value={ww}
              onChange={setWw}
            />
          )}
          {fout && <p className="text-sm text-rust" role="alert">{fout}</p>}
          {klaar && <p className="rounded-xl bg-sage/10 px-3.5 py-2.5 text-sm text-[#4f6b4a] ring-1 ring-sage/25" role="status">{klaar}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={bezig || (modus === 'wachtwoord' && ww.length < (nieuw ? 6 : 1))} icon={modus === 'link' ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}>
            {bezig ? 'Even geduld…' : modus === 'link' ? 'Stuur inloglink' : nieuw ? 'Account maken' : 'Inloggen'}
          </Button>
        </form>
        {modus === 'wachtwoord' && (
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-[0.82rem]">
            <button type="button" className="font-medium text-ink-soft underline underline-offset-4 hover:text-ink" onClick={() => setNieuw(!nieuw)}>
              {nieuw ? 'Ik heb al een account' : 'Nog geen account? Maak er een'}
            </button>
            {!nieuw && (
              <button
                type="button"
                className="text-ink-muted underline underline-offset-4 hover:text-ink"
                onClick={async () => {
                  if (!emailOk) return setFout('Vul eerst je e-mailadres in.')
                  try {
                    await stuurWachtwoordReset(email.trim())
                    setKlaar('Als dit adres bekend is, ontvang je een mail om een nieuw wachtwoord te kiezen.')
                  } catch (err) {
                    setFout(NL_FOUT(err))
                  }
                }}
              >
                Wachtwoord vergeten?
              </button>
            )}
          </div>
        )}
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Met een inloglink heb je geen wachtwoord nodig. Een account maken is gratis. Je lokale gegevens blijven altijd op dit apparaat staan.
        </p>
      </div>
    </Card>
  )
}

function NieuwWachtwoord() {
  const [ww, setWw] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  return (
    <Card className="p-5 sm:p-6">
      <p className="font-semibold">Kies een nieuw wachtwoord</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField label="Nieuw wachtwoord (min. 6 tekens)" type="password" autoComplete="new-password" value={ww} onChange={setWw} fout={fout} />
        </div>
        <Button
          disabled={ww.length < 6}
          onClick={async () => {
            try {
              await nieuwWachtwoord(ww)
              toast('Wachtwoord gewijzigd')
            } catch (e) {
              setFout(NL_FOUT(e))
            }
          }}
        >
          Opslaan
        </Button>
      </div>
    </Card>
  )
}

function Ingelogd({ db }: { db: Db }) {
  const c = useCloud()
  const [vraag, setVraag] = useState<'data' | 'account' | null>(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  if (!c.gebruiker) return null

  async function doe(f: () => Promise<void>, ok: string) {
    setBezig(true)
    setFout(null)
    try {
      await f()
      toast(ok)
      setVraag(null)
    } catch (e) {
      setFout(NL_FOUT(e))
    } finally {
      setBezig(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader icon={<ShieldCheck className="h-5 w-5" />} title="Ingelogd" sub={c.gebruiker.email} />
        <div className="space-y-4 px-5 pt-4 pb-5 sm:px-6 sm:pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <SyncStatus status={c.syncAan ? c.status : 'uit'} />
            {c.laatste && c.syncAan && <span className="text-xs text-ink-muted">Laatst: {datum(c.laatste)}, {new Date(c.laatste).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
          {c.melding && c.syncAan && c.status !== 'geen-tabel' && <p className="text-sm text-ink-soft">{c.melding}</p>}
          <div className="flex flex-wrap gap-2">
            {c.syncAan ? (
              <Button size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} disabled={c.status === 'bezig' || db === 'geen-tabel'} onClick={() => void syncNu()}>
                Nu synchroniseren
              </Button>
            ) : (
              <Button size="sm" variant="gold" icon={<CloudUpload className="h-3.5 w-3.5" />} disabled={db === 'geen-tabel'} onClick={() => geefToestemming(true)}>
                Synchronisatie starten (samenvoegen)
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => (location.hash = '#/instellingen/backup')}>
              Back-up exporteren
            </Button>
            <Button size="sm" variant="ghost" icon={<LogOut className="h-3.5 w-3.5" />} onClick={() => doe(uitloggen, 'Uitgelogd – je gegevens blijven op dit apparaat')}>
              Uitloggen
            </Button>
          </div>
          <p className="text-xs text-ink-muted">Uitloggen of je account verwijderen laat je gegevens op dit apparaat staan.</p>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <p className="font-semibold">Gegevens verwijderen</p>
        <p className="mt-1 text-sm text-ink-soft">Je lokale gegevens blijven staan. Maak eventueel eerst een back-up.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setVraag('data')}>
            Mijn cloudgegevens verwijderen
          </Button>
          <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setVraag('account')}>
            Account verwijderen
          </Button>
        </div>
      </Card>

      <Dialog
        open={vraag != null}
        onClose={() => setVraag(null)}
        title={vraag === 'account' ? 'Account verwijderen?' : 'Cloudgegevens verwijderen?'}
        sub="Dit kan niet ongedaan worden gemaakt."
        footer={
          <>
            <Button variant="secondary" onClick={() => setVraag(null)}>
              Annuleren
            </Button>
            <Button
              className="!bg-rust hover:!bg-[#9a4a35]"
              disabled={bezig}
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() =>
                vraag === 'account'
                  ? doe(verwijderAccount, 'Account verwijderd – lokale gegevens staan nog op dit apparaat')
                  : doe(verwijderCloudGegevens, 'Cloudgegevens verwijderd – synchronisatie staat uit')
              }
            >
              {vraag === 'account' ? 'Account verwijderen' : 'Verwijderen'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          {vraag === 'account'
            ? 'Je account en alle gegevens in de cloud worden verwijderd. Op andere apparaten blijven lokale kopieën staan tot je ze daar wist. Op dit apparaat blijft alles staan.'
            : 'Alle projecten, facturen, prijzen en bedrijfsgegevens in de cloud worden verwijderd en de synchronisatie gaat uit. Op dit apparaat blijft alles staan.'}
        </p>
        {fout && <p className="mt-3 text-sm text-rust" role="alert">{fout}</p>}
      </Dialog>
    </>
  )
}
