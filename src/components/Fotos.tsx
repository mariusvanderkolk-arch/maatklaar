import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Images, Trash2, X } from 'lucide-react'
import { Button, Card, CardHeader, useFocusVal } from './ui'
import { bewaarFoto, useFotoUrl, verkleinFoto, verwijderFoto } from '../lib/photos'
import { projectStore } from '../lib/store'
import { vraagVasteOpslag } from '../lib/vasteOpslag'
import { useCloud } from '../lib/cloud/sync'
import { uid } from '../lib/defaults'
import { kortDatum } from '../lib/format'
import type { PhotoRef, Project } from '../lib/types'

export function Fotos({ p }: { p: Project }) {
  const camera = useRef<HTMLInputElement>(null)
  const upload = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string>()
  const [open, setOpen] = useState<PhotoRef>()
  const cloud = useCloud()
  const inCloud = !!cloud.gebruiker && cloud.syncAan

  async function voegToe(files: FileList | null) {
    if (!files?.length) return
    setBezig(true)
    setFout(undefined)
    const nieuw: PhotoRef[] = []
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue
        const blob = await verkleinFoto(f)
        const ref = { id: uid(), naam: f.name || 'Foto', createdAt: Date.now() }
        await bewaarFoto(ref.id, blob)
        nieuw.push(ref)
      }
      projectStore.werkBij(p.id, (x) => ({ ...x, fotos: [...x.fotos, ...nieuw] }))
      void vraagVasteOpslag()
      if (nieuw.length) void import('../lib/fotoCloud').then((m) => m.fotoSyncNu())
    } catch (e) {
      setFout(e instanceof Error && e.message.startsWith('Foto-opslag') ? e.message : 'De foto kon niet worden opgeslagen. Controleer of er genoeg opslagruimte is.')
    } finally {
      setBezig(false)
      if (camera.current) camera.current.value = ''
      if (upload.current) upload.current.value = ''
    }
  }

  async function verwijder(f: PhotoRef) {
    await verwijderFoto(f.id).catch(() => {})
    void import('../lib/fotoCloud').then((m) => m.verwijderFotoOveral(f.id))
    projectStore.werkBij(p.id, (x) => ({ ...x, fotos: x.fotos.filter((y) => y.id !== f.id) }))
    setOpen(undefined)
  }

  return (
    <Card>
      <CardHeader
        icon={<Camera className="h-5 w-5" />}
        title="Foto's van de ruimte"
        sub="Maak foto's van elke wand, de vloer en details zoals leidingen en afvoer."
      />
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-2.5 sm:flex">
          <Button variant="primary" icon={<Camera className="h-4 w-4" />} onClick={() => camera.current?.click()} disabled={bezig}>
            Foto maken
          </Button>
          <Button variant="secondary" icon={<ImagePlus className="h-4 w-4" />} onClick={() => upload.current?.click()} disabled={bezig}>
            Uploaden
          </Button>
          <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => voegToe(e.target.files)} data-testid="foto-camera" />
          <input ref={upload} type="file" accept="image/*" multiple className="hidden" onChange={(e) => voegToe(e.target.files)} data-testid="foto-upload" />
        </div>
        {fout && <p className="mt-3 text-sm text-rust">{fout}</p>}

        {p.fotos.length === 0 && !bezig ? (
          <div className="mt-5 flex items-center gap-4 rounded-xl border border-dashed border-sand-400 bg-sand-50/70 px-4 py-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper text-gold-600 ring-1 ring-sand-300">
              <Images className="h-5 w-5" />
            </span>
            <p className="text-sm leading-snug text-ink-muted">
              {inCloud
                ? "Nog geen foto's. Ze worden verkleind en op dit apparaat bewaard, met een beveiligde kopie in je account. Handig voor later, en voor de optionele AI-analyse hieronder."
                : "Nog geen foto's. Ze worden verkleind en alleen op dit apparaat bewaard. Log in om ze ook veilig in je account te bewaren. Handig voor later, en voor de optionele AI-analyse hieronder."}
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {p.fotos.map((f) => (
              <li key={f.id}>
                <Thumb foto={f} onClick={() => setOpen(f)} />
              </li>
            ))}
            {bezig && (
              <li className="aspect-square animate-pulse rounded-xl bg-sand-200" aria-label="Foto wordt verwerkt" />
            )}
          </ul>
        )}

      </div>
      {open && <Lightbox foto={open} onClose={() => setOpen(undefined)} onDelete={() => verwijder(open)} />}
    </Card>
  )
}

function Thumb({ foto, onClick }: { foto: PhotoRef; onClick: () => void }) {
  const url = useFotoUrl(foto.id)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Foto ${foto.naam} bekijken`}
      className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-sand-200 ring-1 ring-sand-300 transition hover:ring-2 hover:ring-gold-400"
    >
      {url && <img src={url} alt={foto.naam} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent px-2 pt-5 pb-1.5 text-left text-[0.75rem] font-medium text-white">
        {kortDatum(foto.createdAt)}
      </span>
    </button>
  )
}

function Lightbox({ foto, onClose, onDelete }: { foto: PhotoRef; onClose: () => void; onDelete: () => void }) {
  const url = useFotoUrl(foto.id)
  const venster = useRef<HTMLDivElement>(null)
  useFocusVal(venster, true)
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [onClose])
  return (
    <div ref={venster} className="fixed inset-0 z-50 flex flex-col bg-ink/90 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Foto: ${foto.naam}`}>
      <div className="flex items-center justify-between gap-3 p-4 text-sand-50" onClick={(e) => e.stopPropagation()}>
        <p className="truncate text-sm">{foto.naam}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="!text-sand-50 hover:!bg-white/10" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
            Verwijderen
          </Button>
          <button type="button" aria-label="Sluiten" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 pt-0">
        {url && <img src={url} alt={foto.naam} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />}
      </div>
    </div>
  )
}
