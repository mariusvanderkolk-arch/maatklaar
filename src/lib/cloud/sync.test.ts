/**
 * Integratietest van de sync-engine met een nep-Supabase (in geheugen) en twee "apparaten".
 * Elk apparaat = verse modules + eigen localStorage.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Rij = { user_id: string; kind: string; id: string; data: unknown; deleted: boolean; updated_at: string }
const server: { rijen: Rij[]; tabel: boolean } = { rijen: [], tabel: true }
const USER = { id: 'u1', email: 'a@b.nl' }

function nepClient() {
  const geenTabel = { code: 'PGRST205', message: "Could not find the table 'public.user_data' in the schema cache" }
  return {
    auth: {
      getSession: async () => ({ data: { session: { user: USER } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => {
        const res = server.tabel ? { data: server.rijen.filter((r) => r.user_id === USER.id), error: null } : { data: null, error: geenTabel }
        return Object.assign(Promise.resolve(res), { limit: () => Promise.resolve(res) })
      },
      upsert: async (rijen: Rij[]) => {
        if (!server.tabel) return { error: geenTabel }
        for (const r of rijen) {
          server.rijen = server.rijen.filter((x) => !(x.user_id === r.user_id && x.kind === r.kind && x.id === r.id))
          server.rijen.push(structuredClone(r))
        }
        return { error: null }
      },
      delete: () => ({ eq: async () => ((server.rijen = []), { error: null }) }),
    }),
  }
}

vi.mock('./client', () => ({ haalClient: async () => nepClient() }))

function nieuwApparaat() {
  const data = new Map<string, string>()
  const ls = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size
    },
  }
  const g = globalThis as Record<string, unknown>
  g.localStorage = ls
  g.window = { addEventListener() {}, removeEventListener() {} }
  g.document = { addEventListener() {}, visibilityState: 'hidden' }
  g.location = { hash: '', search: '', origin: 'https://x', pathname: '/slimmer-wonen/' }
  vi.resetModules()
}

async function laad() {
  const sync = await import('./sync')
  const { projectStore } = await import('../store')
  const { prijsStore } = await import('../prijsStore')
  const { voorbeeldProjecten } = await import('../defaults')
  return { sync, projectStore, prijsStore, voorbeeldProjecten }
}

const eigenProject = (id: string, naam: string, updatedAt: number) => ({ id, naam, updatedAt, voorbeeld: false })

describe('cloud-sync met twee apparaten', () => {
  beforeEach(() => {
    server.rijen = []
    server.tabel = true
  })

  it('A uploadt na toestemming; B voegt samen zonder lokaal iets te verwijderen; verwijderen gaat via tombstone', async () => {
    // Apparaat A: lokaal een eigen project + prijs, dan inloggen
    nieuwApparaat()
    let a = await laad()
    const basis = a.voorbeeldProjecten()[0]
    a.projectStore.voegToe({ ...basis, ...eigenProject('pA', 'Badkamer A', 1000) })
    a.prijsStore.zet('kit', 'gamma', { prijs: 7.5 })
    await a.sync.startCloud(true)
    expect(a.sync.cloudStaat().toestemmingNodig).toBe(true)
    a.sync.geefToestemming(true)
    await a.sync.syncNu()
    expect(a.sync.cloudStaat().status).toBe('ok')
    expect(server.rijen.map((r) => `${r.kind}/${r.id}`).sort()).toEqual(['bedrijf/profiel', 'prijzen/eigen', 'project/pA'])

    // Apparaat B: eigen lokaal project, logt in met hetzelfde account
    nieuwApparaat()
    const b = await laad()
    b.projectStore.voegToe({ ...basis, ...eigenProject('pB', 'Keuken B', 2000) })
    await b.sync.startCloud(true)
    b.sync.geefToestemming(true)
    await b.sync.syncNu()
    const namen = b.projectStore.alle().filter((p) => !p.voorbeeld).map((p) => p.naam).sort()
    expect(namen).toEqual(['Badkamer A', 'Keuken B']) // samengevoegd, niets kwijt
    expect(b.prijsStore.alle().kit?.gamma?.prijs).toBe(7.5)
    expect(server.rijen.some((r) => r.id === 'pB' && !r.deleted)).toBe(true)

    // B verwijdert project A → tombstone
    b.projectStore.verwijder('pA')
    await b.sync.syncNu()
    expect(server.rijen.find((r) => r.id === 'pA')?.deleted).toBe(true)

    // A synct opnieuw (zelfde opslag als eerder: simuleer door A opnieuw te laden is niet nodig; nieuw apparaat C)
    nieuwApparaat()
    a = await laad()
    await a.sync.startCloud(true)
    await a.sync.syncNu() // lege lokale opslag → automatisch toestemming
    const c = a.projectStore.alle().filter((p) => !p.voorbeeld).map((p) => p.id)
    expect(c).toEqual(['pB'])
  })

  it('ontwerp synct als kind design; nieuwste bijgewerkt wint', async () => {
    nieuwApparaat()
    const a = await laad()
    const { ontwerpStore, bewaarOntwerp } = await import('../ontwerp/store')
    const basis = a.voorbeeldProjecten()[0]
    a.projectStore.voegToe({ ...basis, ...eigenProject('pD', 'Badkamer D', 1000) })
    const leeg = { v: 1 as const, items: [], vloer: { kleur: 'kalk', formaat: '60x60', verband: 'recht' as const }, wand: { kleur: 'marmer', formaat: '30x60', verband: 'recht' as const }, inOfferte: true, bijgewerkt: 0 }
    bewaarOntwerp('pD', { ...leeg, items: [{ id: 'x1', type: 'toilet-hangend', x: 50, y: 30, w: 38, d: 55, rot: 0 }] })
    await a.sync.startCloud(true)
    a.sync.geefToestemming(true)
    await a.sync.syncNu()
    const rij = server.rijen.find((r) => r.kind === 'design' && r.id === 'pD')
    expect(rij).toBeTruthy()
    expect(ontwerpStore.get().pD.items).toHaveLength(1)

    nieuwApparaat()
    const b = await laad()
    const sb = await import('../ontwerp/store')
    await b.sync.startCloud(true)
    await b.sync.syncNu()
    expect(sb.ontwerpStore.get().pD?.items[0]?.type).toBe('toilet-hangend')
    expect(sb.ontwerpStore.get().pD?.wand.kleur).toBe('marmer')
  })

  it('zonder tabel: status geen-tabel en lokaal blijft alles werken', async () => {
    server.tabel = false
    nieuwApparaat()
    const a = await laad()
    const basis = a.voorbeeldProjecten()[0]
    a.projectStore.voegToe({ ...basis, ...eigenProject('pX', 'X', 1) })
    await a.sync.startCloud(true)
    a.sync.geefToestemming(true)
    await a.sync.syncNu()
    expect(a.sync.cloudStaat().status).toBe('geen-tabel')
    expect(a.projectStore.alle().some((p) => p.id === 'pX')).toBe(true)
    expect(await a.sync.controleerDatabase()).toBe('geen-tabel')
  })
})
