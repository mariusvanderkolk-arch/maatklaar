import { beforeEach, describe, expect, it, vi } from 'vitest'

const lokaal = new Map<string, Blob>()
vi.mock('./photos', () => ({
  alleFotoIds: async () => [...lokaal.keys()],
  haalFoto: async (id: string) => lokaal.get(id),
  bewaarFoto: async (id: string, b: Blob) => void lokaal.set(id, b),
}))
const { fotoPad, fotoPlan, projectFotoIds, syncFotos, wisAlleCloudFotos, URL_GELDIG_S } = await import('./fotoCloud')
const { vraagVasteOpslag, iosZonderBeginscherm } = await import('./vasteOpslag')

const { opslag } = await import('./veiligeOpslag')
const { sleutel } = await import('./modus')
const UID = '11111111-2222-3333-4444-555555555555'

function nepClient(opgeslagen: Map<string, Blob>, fout?: string) {
  const b = {
    upload: vi.fn(async (pad: string, blob: Blob) => (fout ? { error: { message: fout } } : (opgeslagen.set(pad, blob), { error: null }))),
    createSignedUrl: vi.fn(async (pad: string, s: number) => (opgeslagen.has(pad) ? { data: { signedUrl: `https://x/${pad}?s=${s}` }, error: null } : { data: null, error: { message: 'not found' } })),
    remove: vi.fn(async (paden: string[]) => (paden.forEach((p) => opgeslagen.delete(p)), { error: null })),
    list: vi.fn(async (map: string) => ({ data: [...opgeslagen.keys()].filter((k) => k.startsWith(map + '/')).map((k) => ({ name: k.split('/')[1] })), error: null })),
  }
  return { c: { storage: { from: vi.fn(() => b) } } as never, b }
}

beforeEach(() => {
  lokaal.clear()
  opslag.removeItem(sleutel('fotos-cloud:v1'))
  opslag.removeItem(sleutel('persist:v1'))
})

describe('foto-paden', () => {
  it('per gebruiker, alleen veilige id\'s', () => {
    expect(fotoPad(UID, 'abc-1')).toBe(`${UID}/abc-1.jpg`)
    expect(fotoPad(UID, '../x')).toBeNull()
    expect(fotoPad('niet-een-uuid', 'abc')).toBeNull()
  })
  it('plan: omhoog wat lokaal is, omlaag wat ontbreekt', () => {
    expect(fotoPlan(['a', 'b', 'c'], new Set(['a', 'b']), new Set(['b']))).toEqual({ omhoog: ['a'], omlaag: ['c'] })
    expect(projectFotoIds([{ fotos: [{ id: 'a' }, { id: 'a' }] }, { fotos: [{ id: '../x' }] }] as never)).toEqual(['a'])
  })
})

describe('syncFotos', () => {
  it('uploadt één keer en haalt ontbrekende foto\'s op via korte signed URL', async () => {
    const cloud = new Map<string, Blob>([[`${UID}/c.jpg`, new Blob(['c'], { type: 'image/jpeg' })]])
    const { c, b } = nepClient(cloud)
    lokaal.set('a', new Blob(['a'], { type: 'image/jpeg' }))
    globalThis.fetch = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['c']) })) as never
    const projecten = [{ fotos: [{ id: 'a' }, { id: 'c' }] }] as never
    expect(await syncFotos(c, UID, projecten)).toEqual({ omhoog: 1, omlaag: 1 })
    expect(b.createSignedUrl).toHaveBeenCalledWith(`${UID}/c.jpg`, URL_GELDIG_S)
    expect(URL_GELDIG_S).toBeLessThanOrEqual(300)
    expect(lokaal.has('c')).toBe(true)
    expect(await syncFotos(c, UID, projecten)).toEqual({ omhoog: 0, omlaag: 0 })
    expect(b.upload).toHaveBeenCalledTimes(1)
  })
  it('stopt stil als de bucket nog niet bestaat', async () => {
    const { c } = nepClient(new Map(), 'Bucket not found')
    lokaal.set('a', new Blob(['a']))
    lokaal.set('b', new Blob(['b']))
    expect(await syncFotos(c, UID, [{ fotos: [{ id: 'a' }, { id: 'b' }] }] as never)).toEqual({ omhoog: 0, omlaag: 0 })
  })
  it('account verwijderen wist de eigen map', async () => {
    const cloud = new Map<string, Blob>([[`${UID}/a.jpg`, new Blob()], ['ander/b.jpg', new Blob()]])
    const { c } = nepClient(cloud)
    await wisAlleCloudFotos(c, UID)
    expect([...cloud.keys()]).toEqual(['ander/b.jpg'])
  })
})

describe('vaste opslag', () => {
  it('vraagt persist één keer', async () => {
    const persist = vi.fn(async () => true)
    const nav = { storage: { persist, persisted: async () => false } }
    expect(await vraagVasteOpslag(nav)).toBe('aan')
    expect(await vraagVasteOpslag(nav)).toBe('aan')
    expect(persist).toHaveBeenCalledTimes(1)
  })
  it('geweigerd of niet ondersteund', async () => {
    expect(await vraagVasteOpslag({ storage: { persist: async () => false, persisted: async () => false } })).toBe('uit')
    expect(await vraagVasteOpslag({})).toBe('niet-ondersteund')
  })
  it('iOS zonder beginscherm', () => {
    expect(iosZonderBeginscherm('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', false)).toBe(true)
    expect(iosZonderBeginscherm('Mozilla/5.0 (iPhone)', true)).toBe(false)
    expect(iosZonderBeginscherm('Android', false)).toBe(false)
  })
})
