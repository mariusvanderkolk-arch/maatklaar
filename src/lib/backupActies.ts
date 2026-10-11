/** Browserkant van de back-up: verzamelen uit localStorage/IndexedDB en terugzetten. */
import { maakLokaleStore } from './lokaal'
import { eigenArtikelStore } from './eigenArtikelen'
import { backupBestandsnaam, combineerArtikelen, combineerBedrijf, combineerFacturen, combineerProjecten, maakBackup, type Backup, type BackupFoto, type ImportModus } from './backup'
import { projectStore } from './store'
import { prijsStore } from './prijsStore'
import { bedrijfStore } from './bedrijf'
import { aiStore } from './aiStore'
import { alleFotoIds, bewaarFoto, haalFoto, verwijderFoto } from './photos'
import { voegSamen } from './eigenPrijzen'
import { downloadBestand } from './download'
import { factuurStore } from './factuurStore'
import { sleutel } from './modus'
import { ontwerpStore } from './ontwerp/store'
import { normaliseerOntwerp, type Ontwerp } from './ontwerp/model'

export const backupStatus = maakLokaleStore<{ laatste: number | null; later: number | null }>(sleutel('backup:v1'), () => ({ laatste: null, later: null }))

const naarDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })

async function naarBlob(dataUrl: string): Promise<Blob> {
  const [kop, data] = dataUrl.split(',', 2)
  const mime = kop.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg'
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

/** Verzamelt alle lokale gegevens (incl. foto's) als back-upobject, zonder te downloaden. */
export async function verzamelBackup(): Promise<{ backup: Backup; ontbrekend: number }> {
  const projecten = projectStore.alle()
  const fotos: BackupFoto[] = []
  let ontbrekend = 0
  for (const id of new Set(projecten.flatMap((p) => p.fotos.map((f) => f.id)))) {
    const blob = await haalFoto(id).catch(() => undefined)
    if (blob) fotos.push({ id, dataUrl: await naarDataUrl(blob) })
    else ontbrekend++
  }
  const backup = maakBackup({ projecten, fotos, prijzen: prijsStore.alle(), bedrijf: bedrijfStore.get(), ai: aiStore.get(), facturen: factuurStore.get(), ontwerpen: ontwerpStore.get(), artikelen: eigenArtikelStore.alle() })
  return { backup, ontbrekend }
}

/** Maakt de volledige back-up en laat hem downloaden. Geeft het aantal bytes terug. */
export async function exporteerAlles(): Promise<{ bytes: number; ontbrekend: number }> {
  const { backup, ontbrekend } = await verzamelBackup()
  const tekst = JSON.stringify(backup)
  downloadBestand(backupBestandsnaam(), tekst, 'application/json')
  backupStatus.set({ laatste: Date.now(), later: null })
  return { bytes: tekst.length, ontbrekend }
}

/** Zet een (gecontroleerde) back-up terug. */
export async function importeerBackup(b: Backup, modus: ImportModus): Promise<void> {
  for (const f of b.fotos) await bewaarFoto(f.id, await naarBlob(f.dataUrl))
  const projecten = combineerProjecten(projectStore.alle(), b.projecten, modus)
  if (!projectStore.vervangAlles(projecten)) throw new Error('De projecten konden niet worden opgeslagen: de opslag van je browser is vol.')
  eigenArtikelStore.vervang(combineerArtikelen(eigenArtikelStore.alle(), b.artikelen, modus))
  prijsStore.vervang(modus === 'vervangen' ? b.prijzen : voegSamen(prijsStore.alle(), b.prijzen))
  if (b.bedrijf) bedrijfStore.set(combineerBedrijf(bedrijfStore.get(), b.bedrijf))
  if (!factuurStore.set(combineerFacturen(factuurStore.get(), b.facturen, modus))) throw new Error('De facturen konden niet worden opgeslagen: de opslag van je browser is vol.')
  if (b.ontwerpen) {
    const typeVan = new Map(projecten.map((p) => [p.id, p.type]))
    const uit: Record<string, Ontwerp> = modus === 'vervangen' ? {} : { ...ontwerpStore.get() }
    for (const [id, o] of Object.entries(b.ontwerpen)) if (typeVan.has(id)) uit[id] = normaliseerOntwerp(o, typeVan.get(id)!)
    ontwerpStore.set(uit)
  }
  if (b.ai) aiStore.update((i) => ({ ...i, provider: b.ai!.provider ?? i.provider, modellen: { ...i.modellen, ...b.ai!.modellen }, baseUrl: b.ai!.baseUrl ?? i.baseUrl }))
  if (modus === 'vervangen') {
    // foto's die nergens meer bij horen opruimen
    const nodig = new Set(projecten.flatMap((p) => p.fotos.map((f) => f.id)))
    for (const id of await alleFotoIds().catch(() => [] as string[])) if (!nodig.has(id) && !id.startsWith('ontwerp3d:')) await verwijderFoto(id).catch(() => {})
  }
}

/** Geschatte opslag (indien de browser het ondersteunt). */
export async function opslagSchatting(): Promise<{ gebruikt: number; beschikbaar: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    return e?.usage != null && e.quota ? { gebruikt: e.usage, beschikbaar: e.quota } : null
  } catch {
    return null
  }
}
