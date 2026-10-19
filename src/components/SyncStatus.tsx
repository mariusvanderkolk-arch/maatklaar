import { Cloud, CloudOff, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { CloudStatus } from '../lib/cloud/sync'

export const STATUS_TEKST: Record<CloudStatus, string> = {
  uit: 'Synchronisatie uit',
  bezig: 'Synchroniseren…',
  ok: 'Gesynchroniseerd',
  offline: 'Offline',
  'geen-tabel': 'Cloud nog niet ingericht',
  fout: 'Fout',
}

/** Subtiel statuslabel voor de cloud-sync. */
export function SyncStatus({ status, klein = false }: { status: CloudStatus; klein?: boolean }) {
  const Icon = status === 'bezig' ? LoaderCircle : status === 'ok' || status === 'uit' ? Cloud : status === 'offline' ? CloudOff : TriangleAlert
  const kleur =
    status === 'ok'
      ? 'bg-sage/10 text-[#4f6b4a] ring-sage/25'
      : status === 'fout' || status === 'geen-tabel'
        ? 'bg-rust/10 text-rust ring-rust/20'
        : 'bg-sand-100 text-ink-soft ring-sand-300'
  return (
    <span role="status" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ring-1 ring-inset ${klein ? 'text-[0.75rem]' : 'text-[0.8rem]'} ${kleur}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'bezig' ? 'animate-spin' : ''}`} aria-hidden />
      {STATUS_TEKST[status]}
    </span>
  )
}
