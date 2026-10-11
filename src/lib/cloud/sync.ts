import { eigenArtikelStore, normaliseerArtikelen, type EigenArtikel } from '../eigenArtikelen'
/**
 * Cloud-sync (optioneel). Lokaal blijft leidend: zonder account werkt alles zoals altijd.
 * Met account worden projecten, ontwerpen, facturen, eigen prijzen en het bedrijfsprofiel als documenten
 * in de tabel user_data bewaard (laatste wijziging wint). Foto's blijven alleen op het apparaat.
 */
import { useSyncExternalStore } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { projectStore } from '../store'
import { prijsStore } from '../prijsStore'
import { bedrijfStore, type Bedrijf } from '../bedrijf'
import { factuurStore } from '../factuurStore'
import { normaliseerFactuur, type Factuur } from '../factuur'
import { laatstBijgewerkt, telEigenPrijzen, type EigenPrijzen } from '../eigenPrijzen'
import { maakLokaleStore } from '../lokaal'
import { sleutel } from '../modus'
import type { Project } from '../types'
import { ontwerpStore } from '../ontwerp/store'
import { normaliseerOntwerp, type Ontwerp } from '../ontwerp/model'
import { CLOUD_AAN, KIND_PREFIX, TABEL, redirectUrl, sessieHint } from './config'
import { haalClient } from './client'
import {
  combineerPrijzenNieuwste,
  hashVan,
  markeerWijzigingen,
  sleutelVan,
  soortFout,
  verwerkRemote,
  type Actie,
  type Doc,
  type FoutSoort,
  type Meta,
  type RemoteRij,
  type Soort,
} from './kern'

export type CloudStatus = 'uit' | 'bezig' | 'ok' | 'offline' | 'geen-tabel' | 'fout'

export interface CloudStaat {
  status: CloudStatus
  gebruiker: { id: string; email: string } | null
  /** ingelogd, maar nog niet gekozen of lokale gegevens mogen worden samengevoegd */
  toestemmingNodig: boolean
  /** synchronisatie staat aan voor deze gebruiker op dit apparaat */
  syncAan: boolean
  laatste: number | null
  melding: string | null
  /** melding uit de inloglink (bijv. verlopen link) */
  inlogMelding: string | null
  /** via een wachtwoord-herstellink binnengekomen: nieuw wachtwoord laten kiezen */
  herstel: boolean
}

let staat: CloudStaat = { status: 'uit', gebruiker: null, toestemmingNodig: false, syncAan: false, laatste: null, melding: null, inlogMelding: null, herstel: false }
const luisteraars = new Set<() => void>()
const zet = (w: Partial<CloudStaat>) => {
  staat = { ...staat, ...w }
  luisteraars.forEach((f) => f())
}
export const useCloud = () =>
  useSyncExternalStore(
    (f) => {
      luisteraars.add(f)
      return () => luisteraars.delete(f)
    },
    () => staat,
  )
export const cloudStaat = () => staat

/** Per apparaat: voor welke gebruiker de sync loopt, of er toestemming is, en de meta per document. */
interface SyncOpslag {
  userId: string | null
  toestemming: boolean
  eersteKeer: boolean
  /** gebruiker koos 'Nu niet': niet steeds opnieuw vragen */
  afgewezen?: boolean
  meta: Meta
}
const opslag = maakLokaleStore<SyncOpslag>(sleutel('sync:v1'), () => ({ userId: null, toestemming: false, eersteKeer: true, meta: {} }))

// ——— lokale documenten ————————————————————————————————————————————

const BEDRIJF_ID = 'profiel'
const PRIJZEN_ID = 'eigen'

function lokaleDocs(): Doc[] {
  const docs: Doc[] = []
  for (const p of projectStore.alle()) if (!p.voorbeeld) docs.push({ soort: 'project', id: p.id, data: p, tijd: p.updatedAt })
  const echt = new Map(projectStore.alle().filter((p) => !p.voorbeeld).map((p) => [p.id, p]))
  for (const [id, o] of Object.entries(ontwerpStore.get())) if (echt.has(id)) docs.push({ soort: 'design', id, data: o, tijd: o.bijgewerkt || undefined })
  for (const f of factuurStore.get()) docs.push({ soort: 'factuur', id: f.id, data: f })
  const prijzen = prijsStore.alle()
  const pt = laatstBijgewerkt(prijzen)
  docs.push({ soort: 'prijzen', id: PRIJZEN_ID, data: prijzen, tijd: pt ? Date.parse(pt) : undefined })
  docs.push({ soort: 'bedrijf', id: BEDRIJF_ID, data: bedrijfStore.get() })
  for (const a of eigenArtikelStore.alle()) docs.push({ soort: 'artikel', id: a.id, data: a, tijd: Date.parse(a.bijgewerkt) || undefined })
  return docs
}

/** Is er iets lokaal dat de moeite van uploaden waard is? (voorbeeldprojecten tellen niet mee) */
export function lokaleSamenvatting() {
  const projecten = projectStore.alle().filter((p) => !p.voorbeeld).length
  const facturen = factuurStore.get().length
  const prijzen = telEigenPrijzen(prijsStore.alle())
  const bedrijf = Boolean(bedrijfStore.get().naam?.trim())
  const artikelen = eigenArtikelStore.alle().length
  return { projecten, facturen, prijzen, bedrijf, artikelen, iets: projecten + facturen + prijzen + artikelen > 0 || bedrijf }
}

const VOORTGANG: Record<string, number> = { concept: 0, verzonden: 1, betaald: 2 }

function samenvoegen(soort: Soort, lokaal: unknown, remote: unknown): unknown {
  if (soort === 'prijzen') return combineerPrijzenNieuwste((remote ?? {}) as EigenPrijzen, (lokaal ?? {}) as EigenPrijzen)
  if (soort === 'bedrijf') {
    const l = lokaal as Bedrijf
    const r = remote as Bedrijf
    const basis = r?.naam?.trim() ? { ...l, ...r } : { ...r, ...l }
    return { ...basis, factuurVolgnummer: Math.max(l?.factuurVolgnummer ?? 1, r?.factuurVolgnummer ?? 1) }
  }
  if (soort === 'project') return ((lokaal as Project).updatedAt ?? 0) >= ((remote as Project)?.updatedAt ?? 0) ? lokaal : remote
  if (soort === 'artikel') return Date.parse((lokaal as EigenArtikel)?.bijgewerkt ?? '') >= Date.parse((remote as EigenArtikel)?.bijgewerkt ?? '') ? lokaal : remote
  if (soort === 'design') return ((lokaal as Ontwerp)?.bijgewerkt ?? 0) >= ((remote as Ontwerp)?.bijgewerkt ?? 0) ? lokaal : remote
  const lf = lokaal as Factuur
  const rf = remote as Factuur
  return (VOORTGANG[lf.status] ?? 0) > (VOORTGANG[rf?.status] ?? 0) ? lf : rf
}

let bezigMetToepassen = false

function pasToe(acties: Actie[], samengevoegd: Set<string>) {
  if (!acties.length) return
  bezigMetToepassen = true
  try {
    const per = (s: Soort) => acties.filter((a) => a.soort === s)
    const huidig = new Map(lokaleDocs().map((d) => [sleutelVan(d.soort, d.id), d.data]))
    const waarde = (a: Actie) => {
      if (a.type !== 'samenvoegen') return a.type === 'zet' ? a.data : null
      samengevoegd.add(sleutelVan(a.soort, a.id))
      return samenvoegen(a.soort, huidig.get(sleutelVan(a.soort, a.id)), a.data)
    }

    const pa = per('project')
    if (pa.length) {
      let lijst = [...projectStore.alle()]
      for (const a of pa) {
        lijst = lijst.filter((p) => p.id !== a.id)
        if (a.type !== 'verwijder') {
          const p = waarde(a) as Project | null
          if (p && typeof p === 'object') lijst.push({ ...p, id: a.id })
        }
      }
      lijst.sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0))
      projectStore.vervangAlles(lijst)
    }
    const fa = per('factuur')
    if (fa.length) {
      let lijst = [...factuurStore.get()]
      for (const a of fa) {
        lijst = lijst.filter((f) => f.id !== a.id)
        if (a.type !== 'verwijder') {
          const f = normaliseerFactuur(waarde(a))
          if (f) lijst.push(f)
        }
      }
      lijst.sort((x, y) => (y.aangemaakt ?? 0) - (x.aangemaakt ?? 0))
      factuurStore.set(lijst)
    }
    const da = per('design')
    if (da.length) {
      const alle = { ...ontwerpStore.get() }
      for (const a of da) {
        if (a.type === 'verwijder') delete alle[a.id]
        else {
          const o = waarde(a)
          if (o && typeof o === 'object') {
            const type = projectStore.alle().find((p) => p.id === a.id)?.type ?? 'badkamer'
            alle[a.id] = normaliseerOntwerp(o, type)
          }
        }
      }
      ontwerpStore.set(alle)
    }
    const aa = per('artikel')
    if (aa.length) {
      let lijst = [...eigenArtikelStore.alle()]
      for (const a of aa) {
        lijst = lijst.filter((x) => x.id !== a.id)
        if (a.type !== 'verwijder') lijst.push(...normaliseerArtikelen([{ ...(waarde(a) as object), id: a.id }]))
      }
      eigenArtikelStore.vervang(lijst)
    }
    for (const a of per('prijzen')) if (a.type !== 'verwijder') prijsStore.vervang((waarde(a) ?? {}) as EigenPrijzen)
    for (const a of per('bedrijf')) {
      if (a.type === 'verwijder') continue
      const b = waarde(a) as Bedrijf
      const l = bedrijfStore.get()
      bedrijfStore.set({ ...l, ...b, factuurVolgnummer: Math.max(l.factuurVolgnummer ?? 1, b?.factuurVolgnummer ?? 1) })
    }
  } finally {
    bezigMetToepassen = false
  }
}

/** Na het toepassen: de hash gelijkzetten met wat de stores er (genormaliseerd) van gemaakt hebben. */
function herijk(meta: Meta, keys: Set<string>, samengevoegd: Set<string>): Meta {
  const uit = { ...meta }
  for (const d of lokaleDocs()) {
    const k = sleutelVan(d.soort, d.id)
    if (!keys.has(k) || !uit[k]) continue
    if (samengevoegd.has(k)) uit[k] = { ...uit[k], hash: hashVan(d.data), vuil: true, tijd: Date.now() }
    else uit[k] = { ...uit[k], hash: hashVan(d.data) }
  }
  return uit
}

// ——— sync ————————————————————————————————————————————————————————

let client: SupabaseClient | null = null
let loopt: Promise<void> | null = null
let nogEens = false

function meldFout(e: unknown) {
  const s: FoutSoort = soortFout(e)
  if (s === 'geen-tabel') zet({ status: 'geen-tabel', melding: 'De cloud-database is nog niet ingericht. Je gegevens blijven gewoon op dit apparaat werken.' })
  else if (s === 'offline') zet({ status: 'offline', melding: 'Geen verbinding. Wijzigingen worden verstuurd zodra je weer online bent.' })
  else if (s === 'niet-ingelogd') zet({ status: 'fout', melding: 'Je sessie is verlopen. Log opnieuw in.' })
  else zet({ status: 'fout', melding: `Synchroniseren lukte niet: ${(e as { message?: string })?.message ?? String(e)}` })
}

export function syncNu(): Promise<void> {
  if (loopt) {
    nogEens = true
    return loopt
  }
  loopt = (async () => {
    try {
      do {
        nogEens = false
        await syncEenmaal()
      } while (nogEens)
    } finally {
      loopt = null
    }
  })()
  return loopt
}

async function syncEenmaal() {
  const o = opslag.get()
  if (!client || !staat.gebruiker || !o.toestemming || o.userId !== staat.gebruiker.id) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    zet({ status: 'offline', melding: 'Geen verbinding. Wijzigingen worden verstuurd zodra je weer online bent.' })
    return
  }
  zet({ status: 'bezig' })
  try {
    // 1. lokale wijzigingen markeren
    let meta = markeerWijzigingen(o.meta, lokaleDocs(), Date.now()).meta

    // 2. alles van deze gebruiker ophalen (kleine hoeveelheden; robuuster dan 'sinds')
    const { data, error } = await client.from(TABEL).select('kind,id,data,updated_at,deleted')
    if (error) throw error
    const aanwezig = new Set(lokaleDocs().map((d) => sleutelVan(d.soort, d.id)))
    const r = verwerkRemote(meta, (data ?? []) as RemoteRij[], { eersteKeer: o.eersteKeer, prefix: KIND_PREFIX, lokaalAanwezig: (k) => aanwezig.has(k) })
    const samengevoegd = new Set<string>()
    pasToe(r.acties, samengevoegd)
    meta = herijk(r.meta, new Set(r.acties.map((a) => sleutelVan(a.soort, a.id))), samengevoegd)

    // 3. vuile documenten versturen
    const docs = new Map(lokaleDocs().map((d) => [sleutelVan(d.soort, d.id), d]))
    const teSturen = Object.entries(meta).filter(([, m]) => m.vuil)
    if (teSturen.length) {
      const rijen = teSturen.map(([k, m]) => {
        const [soort, ...rest] = k.split('/')
        const d = docs.get(k)
        return {
          user_id: staat.gebruiker!.id,
          kind: KIND_PREFIX + soort,
          id: rest.join('/'),
          data: m.weg || !d ? null : d.data,
          deleted: Boolean(m.weg || !d),
          updated_at: new Date(m.tijd).toISOString(),
        }
      })
      for (let i = 0; i < rijen.length; i += 200) {
        const { error: e2 } = await client.from(TABEL).upsert(rijen.slice(i, i + 200), { onConflict: 'user_id,kind,id' })
        if (e2) throw e2
      }
      for (const rij of rijen) {
        const k = `${rij.kind.slice(KIND_PREFIX.length)}/${rij.id}`
        meta[k] = { ...meta[k], vuil: false, server: rij.updated_at }
      }
    }
    opslag.set({ ...opslag.get(), meta, eersteKeer: false })
    zet({ status: 'ok', laatste: Date.now(), melding: null })
  } catch (e) {
    meldFout(e)
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
function plan(ms = 2500) {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNu(), ms)
}

let gestart = false
function koppelLuisteraars() {
  if (gestart) return
  gestart = true
  const opWijziging = () => {
    if (!bezigMetToepassen && staat.gebruiker && opslag.get().toestemming) plan()
  }
  projectStore.abonneer(opWijziging)
  prijsStore.abonneer(opWijziging)
  bedrijfStore.abonneer(opWijziging)
  factuurStore.abonneer(opWijziging)
  ontwerpStore.abonneer(opWijziging)
  eigenArtikelStore.abonneer(opWijziging)
  window.addEventListener('online', () => plan(500))
  window.addEventListener('offline', () => staat.gebruiker && zet({ status: 'offline', melding: 'Geen verbinding. Wijzigingen worden verstuurd zodra je weer online bent.' }))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && plan(300))
  setInterval(() => document.visibilityState === 'visible' && plan(0), 60_000)
}

function zetSessie(s: Session | null) {
  const u = s?.user
  if (!u) {
    zet({ gebruiker: null, status: 'uit', toestemmingNodig: false, syncAan: false, melding: null })
    return
  }
  const gebruiker = { id: u.id, email: u.email ?? '' }
  const o = opslag.get()
  if (o.userId !== u.id) {
    // nieuwe gebruiker op dit apparaat: eerst vragen (tenzij er lokaal niets is om te uploaden)
    const niets = !lokaleSamenvatting().iets
    opslag.set({ userId: u.id, toestemming: niets, eersteKeer: true, meta: {} })
    zet({ gebruiker, toestemmingNodig: !niets, syncAan: niets, status: niets ? 'bezig' : 'uit' })
  } else zet({ gebruiker, toestemmingNodig: !o.toestemming && !o.afgewezen, syncAan: o.toestemming })
  koppelLuisteraars()
  if (opslag.get().toestemming) plan(200)
}

/** Bij het opstarten: alleen als er (mogelijk) een sessie is wordt Supabase geladen. */
export async function startCloud(forceer = false): Promise<void> {
  if (!CLOUD_AAN || (!forceer && !sessieHint())) return
  // fout uit de inloglink (bijv. verlopen) bewaren voordat Supabase de hash leegmaakt
  const h = new URLSearchParams(location.hash.replace(/^#\/?/, ''))
  const linkFout = h.get('error_description')
  const vanLink = /access_token=/.test(location.hash)
  if (h.get('type') === 'recovery') zet({ herstel: true })
  if (client) return
  try {
    client = await haalClient()
    const { data } = await client.auth.getSession()
    zetSessie(data.session)
    client.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        zet({ herstel: true })
        location.hash = '#/account'
      }
      if (event === 'SIGNED_OUT') zetSessie(null)
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        if (s?.user?.id !== staat.gebruiker?.id) zetSessie(s)
      }
    })
    if (linkFout) {
      zet({ inlogMelding: linkFout.includes('expired') || linkFout.includes('invalid') ? 'Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.' : linkFout })
      location.hash = '#/account'
    } else if (vanLink || (data.session && /access_token=/.test(location.hash))) {
      location.hash = '#/account'
    }
  } catch (e) {
    meldFout(e)
  }
}

// ——— acties voor het accountscherm ————————————————————————————————

async function zekerClient(): Promise<SupabaseClient> {
  if (!client) await startCloud(true)
  if (!client) throw new Error('Cloud is niet beschikbaar.')
  return client
}

export async function stuurInlogLink(email: string) {
  const c = await zekerClient()
  const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl() } })
  if (error) throw error
}

export async function loginMetWachtwoord(email: string, wachtwoord: string) {
  const c = await zekerClient()
  const { error } = await c.auth.signInWithPassword({ email, password: wachtwoord })
  if (error) throw error
}

/** Geeft true terug als de gebruiker eerst zijn e-mailadres moet bevestigen. */
export async function maakAccount(email: string, wachtwoord: string): Promise<boolean> {
  const c = await zekerClient()
  const { data, error } = await c.auth.signUp({ email, password: wachtwoord, options: { emailRedirectTo: redirectUrl() } })
  if (error) throw error
  return !data.session
}

export async function stuurWachtwoordReset(email: string) {
  const c = await zekerClient()
  const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() })
  if (error) throw error
}

export async function nieuwWachtwoord(wachtwoord: string) {
  const c = await zekerClient()
  const { error } = await c.auth.updateUser({ password: wachtwoord })
  if (error) throw error
  zet({ herstel: false })
}

/** Kiest of de lokale gegevens met het account worden samengevoegd. */
export function geefToestemming(ja: boolean) {
  const o = opslag.get()
  opslag.set({ ...o, toestemming: ja, afgewezen: !ja, eersteKeer: true, meta: ja ? {} : o.meta })
  zet({ toestemmingNodig: false, syncAan: ja, status: ja ? 'bezig' : 'uit' })
  if (ja) void syncNu()
}

/** Uitloggen: lokale gegevens blijven op dit apparaat staan. */
export async function uitloggen() {
  const c = await zekerClient()
  await c.auth.signOut({ scope: 'local' })
  opslag.set({ userId: null, toestemming: false, eersteKeer: true, meta: {} })
  zetSessie(null)
}

/** Verwijdert alle cloudgegevens van deze gebruiker; lokaal blijft alles staan. Sync gaat uit. */
export async function verwijderCloudGegevens() {
  const c = await zekerClient()
  if (!staat.gebruiker) throw new Error('Niet ingelogd.')
  const { error } = await c.from(TABEL).delete().eq('user_id', staat.gebruiker.id)
  if (error) throw error
  opslag.set({ ...opslag.get(), toestemming: false, afgewezen: true, eersteKeer: true, meta: {} })
  zet({ toestemmingNodig: false, syncAan: false, status: 'uit', melding: null })
}

/** Verwijdert het account (en via 'on delete cascade' alle cloudgegevens). Lokaal blijft staan. */
export async function verwijderAccount() {
  const c = await zekerClient()
  const { error } = await c.rpc('delete_my_account')
  if (error) throw error
  await c.auth.signOut({ scope: 'local' }).catch(() => {})
  opslag.set({ userId: null, toestemming: false, eersteKeer: true, meta: {} })
  zetSessie(null)
}

/** Controleert (ook zonder account) of de tabel bestaat. */
export async function controleerDatabase(): Promise<'klaar' | 'geen-tabel' | 'offline' | 'fout'> {
  try {
    const c = await zekerClient()
    const { error } = await c.from(TABEL).select('id').limit(1)
    if (!error) return 'klaar'
    const s = soortFout(error)
    // zonder login mag anon de tabel niet lezen: dan bestaat hij wel
    if (error.code === '42501') return 'klaar'
    return s === 'geen-tabel' ? 'geen-tabel' : s === 'offline' ? 'offline' : 'fout'
  } catch (e) {
    const s = soortFout(e)
    return s === 'offline' ? 'offline' : s === 'geen-tabel' ? 'geen-tabel' : 'fout'
  }
}

export const NL_FOUT = (e: unknown): string => {
  const m = String((e as { message?: string })?.message ?? e)
  if (/invalid login credentials/i.test(m)) return 'E-mailadres of wachtwoord klopt niet.'
  if (/email not confirmed/i.test(m)) return 'Bevestig eerst je e-mailadres via de link in je mail.'
  if (/user already registered/i.test(m)) return 'Er bestaat al een account met dit e-mailadres. Log in of vraag een inloglink aan.'
  if (/password should be at least/i.test(m)) return 'Kies een wachtwoord van minstens 6 tekens.'
  if (/rate limit|too many|security purposes/i.test(m)) return 'Te veel pogingen of e-mails kort na elkaar. Wacht even en probeer het opnieuw.'
  if (/invalid email|unable to validate email/i.test(m)) return 'Dit e-mailadres lijkt niet te kloppen.'
  if (/signups not allowed/i.test(m)) return 'Nieuwe accounts zijn op dit moment uitgeschakeld.'
  if (soortFout(e) === 'offline') return 'Geen verbinding. Probeer het opnieuw als je online bent.'
  if (soortFout(e) === 'geen-tabel') return 'De cloud-database is nog niet ingericht.'
  return m
}
