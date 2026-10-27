/** Stap 'Ontwerp': 2D-plattegrond-editor + 3D-weergave om aan de klant te laten zien. */
import { BAD_KRANEN, DOUCHE_KRANEN, FRONT_KLEUREN, KRAAN_KLEUREN, heeftOmbouw, metOmbouw, sanitairVan, WASTAFEL_KRANEN, type Sanitair } from '../lib/ontwerp/sanitair'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Box, Copy, Download, FileImage, Grid2x2, Maximize2, Minus, Plus, Redo2, RotateCcw, RotateCw, Sparkles, Trash2, Undo2, Wand2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Notice, NumberField, Switch } from '../components/ui'
import { toast } from '../components/Toast'
import { OntwerpPlan, PLAN_MARGE, planNaarPng } from '../components/ontwerp/OntwerpPlan'
import { SymboolIcoon } from '../components/ontwerp/symbolen'
import { achterwandBeeld, keukenVan, werkbladBeeld } from '../lib/keuken'
import type { Api3D } from '../components/ontwerp/Ontwerp3D'
import { laadLater } from '../lib/lazy'
import { track } from '../lib/analytics'
import { uid } from '../lib/defaults'
import { projectStore } from '../lib/store'
import type { Project } from '../lib/types'
import {
  familieVan,
  FORMATEN,
  formaatVan,
  ITEMS,
  ITEM_TYPES,
  kamerVan,
  KLEUREN,
  VERBANDEN,
  VOEGEN,
  kleurVan,
  snap,
  voorstelIndeling,
  vrijePlek,
  wisselType,
  type Afwerking,
  type Groep,
  type ItemType,
  type Ontwerp,
  type OntwerpItem,
} from '../lib/ontwerp/model'
import { bewaarOntwerp, ontwerpStore, useOntwerp } from '../lib/ontwerp/store'
import { vloerAfbeelding } from '../lib/ontwerp/tegels'
import { webglBeschikbaar } from '../lib/ontwerp/webgl'
import { bewaar3dBeeld, use3dBeeld } from '../lib/ontwerp/beeld'

const Ontwerp3D = laadLater(() => import('../components/ontwerp/Ontwerp3D').then((m) => m.Ontwerp3D))

type VB = [number, number, number, number]
type Modus =
  | { soort: 'item'; id: string; dx: number; dy: number; bewogen: boolean; sx: number; sy: number }
  | { soort: 'draai'; id: string }
  | { soort: 'pan'; vb: VB; cx: number; cy: number; bewogen: boolean }
  | { soort: 'knijp'; vb: VB; afstand: number; mx: number; my: number }
  | null

const GROEPEN: { id: Groep; label: string }[] = [
  { id: 'sanitair', label: 'Sanitair' },
  { id: 'keuken', label: 'Keuken' },
  { id: 'meubel', label: 'Meubels' },
  { id: 'verwarming', label: 'Verwarming' },
  { id: 'openingen', label: 'Deur & raam' },
]

function downloadDataUrl(naam: string, url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = naam
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const bestandsnaam = (p: Project, wat: string) => `${(p.naam || 'ontwerp').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase()}-${wat}.png`

export function OntwerpScherm({ p }: { p: Project }) {
  useEffect(() => track('design_opened'), [])
  const kamer = useMemo(() => kamerVan(p), [p])
  const opgeslagen = useOntwerp(p)
  const [concept, setConcept] = useState<Ontwerp | null>(null)
  const ontwerp = concept ?? opgeslagen
  // keuken: werkblad uit de keukenkeuze tonen in 2D en 3D (alleen weergave, niet opgeslagen)
  const beeld = useMemo(() => (p.type === 'keuken' ? { ...ontwerp, blad: werkbladBeeld(keukenVan(p)), ...(keukenVan(p).achterwand ? { achterwand: achterwandBeeld(keukenVan(p)), wand: { kleur: achterwandBeeld(keukenVan(p)).kleur, formaat: achterwandBeeld(keukenVan(p)).formaat, verband: achterwandBeeld(keukenVan(p)).verband } as typeof ontwerp.wand } : {}) } : ontwerp), [ontwerp, p])
  const [hist, setHist] = useState<{ terug: Ontwerp[]; vooruit: Ontwerp[] }>({ terug: [], vooruit: [] })
  const [sel, setSel] = useState<string | null>(null)
  const [weergave, setWeergave] = useState<'2d' | '3d'>('2d')
  const webgl = useMemo(() => webglBeschikbaar(), [])
  const [fout3d, setFout3d] = useState<string | null>(null)
  const api3d = useRef<Api3D | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const vak = useRef<HTMLDivElement>(null)
  const [vb, setVb] = useState<VB | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const modus = useRef<Modus>(null)
  const [groep, setGroep] = useState<Groep>(p.type === 'keuken' ? 'keuken' : p.type === 'vloer' ? 'meubel' : 'sanitair')
  const [sleep, setSleep] = useState<{ type: ItemType; x: number; y: number; actief: boolean } | null>(null)
  const beeld3d = use3dBeeld(p.id)
  const opslagFout = ontwerpStore.fout()

  // ——— geschiedenis ———
  const commit = useCallback(
    (nieuw: Ontwerp) => {
      setHist((h) => ({ terug: [...h.terug.slice(-60), opgeslagen], vooruit: [] }))
      bewaarOntwerp(p.id, nieuw)
      setConcept(null)
    },
    [opgeslagen, p.id],
  )
  const zetItems = (items: OntwerpItem[]) => commit({ ...ontwerp, items })
  const ongedaan = () => {
    const vorige = hist.terug[hist.terug.length - 1]
    if (!vorige) return
    setHist((h) => ({ terug: h.terug.slice(0, -1), vooruit: [opgeslagen, ...h.vooruit] }))
    bewaarOntwerp(p.id, vorige)
  }
  const opnieuw = () => {
    const volgende = hist.vooruit[0]
    if (!volgende) return
    setHist((h) => ({ terug: [...h.terug, opgeslagen], vooruit: h.vooruit.slice(1) }))
    bewaarOntwerp(p.id, volgende)
  }

  const geselecteerd = ontwerp.items.find((i) => i.id === sel) ?? null

  // ——— weergavevak / zoom ———
  const pas = useCallback(() => {
    const r = vak.current?.getBoundingClientRect()
    if (!r || !r.width || !r.height) return
    const m = PLAN_MARGE
    const bw = kamer.L + 2 * m
    const bh = kamer.B + 2 * m
    const aspect = r.height / r.width
    if (bh / bw < aspect) {
      const h = bw * aspect
      setVb([-m, -m - (h - bh) / 2, bw, h])
    } else {
      const w = bh / aspect
      setVb([-m - (w - bw) / 2, -m, w, bh])
    }
  }, [kamer.L, kamer.B])

  useEffect(() => {
    pas()
    if (typeof ResizeObserver === 'undefined' || !vak.current) return
    const ro = new ResizeObserver(() => pas())
    ro.observe(vak.current)
    return () => ro.disconnect()
  }, [pas, weergave])

  const zoom = (factor: number, cx?: number, cy?: number) => {
    const r = vak.current?.getBoundingClientRect()
    if (!r || !vb) return
    const basis = kamer.L + 2 * PLAN_MARGE
    const w = Math.min(basis * 2.5, Math.max(basis * 0.2, vb[2] * factor))
    const h = (w * r.height) / r.width
    const fx = cx == null ? 0.5 : (cx - r.left) / r.width
    const fy = cy == null ? 0.5 : (cy - r.top) / r.height
    const px = vb[0] + fx * vb[2]
    const py = vb[1] + fy * vb[3]
    setVb([px - fx * w, py - fy * h, w, h])
  }

  const naarCm = (cx: number, cy: number, v: VB | null = vb) => {
    const r = vak.current!.getBoundingClientRect()
    const b = v ?? [0, 0, 1, 1]
    return { x: b[0] + ((cx - r.left) / r.width) * b[2], y: b[1] + ((cy - r.top) / r.height) * b[3] }
  }

  // ——— aanwijzer (muis/touch/pen) ———
  const startKnijp = () => {
    const [a, b] = [...pointers.current.values()]
    if (!a || !b || !vb) return
    if (modus.current?.soort === 'item' && modus.current.bewogen) setConcept(null)
    modus.current = { soort: 'knijp', vb, afstand: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
  }

  const vang = (e: RPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try {
      svgRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* niet erg */
    }
  }

  const onItemDown = (e: RPointerEvent, id: string) => {
    e.stopPropagation()
    vang(e)
    if (pointers.current.size >= 2) return startKnijp()
    const it = ontwerp.items.find((i) => i.id === id)
    if (!it) return
    setSel(id)
    const pt = naarCm(e.clientX, e.clientY)
    modus.current = { soort: 'item', id, dx: it.x - pt.x, dy: it.y - pt.y, bewogen: false, sx: e.clientX, sy: e.clientY }
  }
  const onDraaiDown = (e: RPointerEvent, id: string) => {
    e.stopPropagation()
    vang(e)
    modus.current = { soort: 'draai', id }
  }
  const onAchtergrondDown = (e: RPointerEvent) => {
    vang(e)
    if (pointers.current.size >= 2) return startKnijp()
    if (vb) modus.current = { soort: 'pan', vb, cx: e.clientX, cy: e.clientY, bewogen: false }
  }

  const onMove = (e: RPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const m = modus.current
    if (!m) return
    const r = vak.current!.getBoundingClientRect()
    if (m.soort === 'knijp') {
      const [a, b] = [...pointers.current.values()]
      if (!a || !b) return
      const afstand = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const basis = kamer.L + 2 * PLAN_MARGE
      const w = Math.min(basis * 2.5, Math.max(basis * 0.2, (m.vb[2] * m.afstand) / afstand))
      const h = (w * r.height) / r.width
      const fx0 = (m.mx - r.left) / r.width
      const fy0 = (m.my - r.top) / r.height
      const px = m.vb[0] + fx0 * m.vb[2]
      const py = m.vb[1] + fy0 * m.vb[3]
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      setVb([px - ((mx - r.left) / r.width) * w, py - ((my - r.top) / r.height) * h, w, h])
    } else if (m.soort === 'pan') {
      const dx = e.clientX - m.cx
      const dy = e.clientY - m.cy
      if (Math.abs(dx) + Math.abs(dy) > 4) m.bewogen = true
      setVb([m.vb[0] - (dx / r.width) * m.vb[2], m.vb[1] - (dy / r.height) * m.vb[3], m.vb[2], m.vb[3]])
    } else if (m.soort === 'item') {
      if (!m.bewogen && Math.hypot(e.clientX - m.sx, e.clientY - m.sy) < 4) return
      m.bewogen = true
      const pt = naarCm(e.clientX, e.clientY)
      const basis = opgeslagen.items.find((i) => i.id === m.id)
      if (!basis) return
      const nieuw = snap({ ...basis, x: pt.x + m.dx, y: pt.y + m.dy }, kamer)
      setConcept({ ...opgeslagen, items: opgeslagen.items.map((i) => (i.id === m.id ? nieuw : i)) })
    } else if (m.soort === 'draai') {
      const it = opgeslagen.items.find((i) => i.id === m.id)
      if (!it) return
      const pt = naarCm(e.clientX, e.clientY)
      let hoek = (Math.atan2(-(pt.x - it.x), pt.y - it.y) * 180) / Math.PI
      hoek = Math.round(hoek / 15) * 15
      const nieuw = snap({ ...it, rot: hoek }, kamer, { wandAfstand: -1 })
      setConcept({ ...opgeslagen, items: opgeslagen.items.map((i) => (i.id === m.id ? nieuw : i)) })
    }
  }

  const onUp = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId)
    const m = modus.current
    if (m?.soort === 'knijp') {
      modus.current = null
      return
    }
    if (pointers.current.size > 0) return
    modus.current = null
    if (!m) return
    if ((m.soort === 'item' && m.bewogen) || m.soort === 'draai') {
      if (concept) commit(concept)
    } else if (m.soort === 'pan' && !m.bewogen) setSel(null)
  }

  // muiswiel zoomt (niet-passieve luisteraar, zodat de pagina niet meescrolt)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  useEffect(() => {
    const el = vak.current
    if (!el || weergave !== '2d') return
    const h = (ev: WheelEvent) => {
      ev.preventDefault()
      zoomRef.current(Math.pow(1.0015, ev.deltaY), ev.clientX, ev.clientY)
    }
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [weergave])

  // ——— acties op het geselecteerde item ———
  const werkBij = (f: (it: OntwerpItem) => OntwerpItem) => {
    if (!geselecteerd) return
    zetItems(ontwerp.items.map((i) => (i.id === geselecteerd.id ? f(i) : i)))
  }
  const draai = (graden: number) => werkBij((it) => snap({ ...it, rot: it.rot + graden }, kamer, { wandAfstand: -1 }))
  const verwijder = () => {
    if (!geselecteerd) return
    zetItems(ontwerp.items.filter((i) => i.id !== geselecteerd.id))
    setSel(null)
  }
  const dupliceer = () => {
    if (!geselecteerd) return
    const kopie = vrijePlek(geselecteerd.type, kamer, ontwerp.items, uid())
    const nieuw = { ...kopie, w: geselecteerd.w, d: geselecteerd.d }
    zetItems([...ontwerp.items, snap(nieuw, kamer)])
    setSel(nieuw.id)
  }
  const voegToe = (type: ItemType, bij?: { x: number; y: number }) => {
    const it = vrijePlek(type, kamer, ontwerp.items, uid(), bij)
    const mo = type === 'toilet-hangend' ? metOmbouw(it, kamer, ontwerp.items, uid()) : null
    if (mo) {
      zetItems([...ontwerp.items, mo.ombouw, mo.toilet])
      setSel(mo.toilet.id)
      toast('Hangtoilet toegevoegd met leidingombouw erachter (voor reservoir en afvoer)')
      return
    }
    zetItems([...ontwerp.items, it])
    setSel(it.id)
    if (weergave === '3d') toast(`${ITEMS[type].naam} toegevoegd`)
  }
  const ombouwErachter = () => {
    if (!geselecteerd) return
    const mo = metOmbouw(geselecteerd, kamer, ontwerp.items, uid())
    if (!mo) return toast('Zet het hangtoilet eerst tegen een wand')
    zetItems([mo.ombouw, ...ontwerp.items.map((i) => (i.id === geselecteerd.id ? mo.toilet : i))])
  }
  const zetSanitair = (s: Partial<Sanitair>) => commit({ ...ontwerp, sanitair: { ...sanitairVan(ontwerp.sanitair), ...s } })

  // toetsenbord (desktop)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const doel = e.target as HTMLElement
      if (doel && (doel.tagName === 'INPUT' || doel.tagName === 'TEXTAREA' || doel.isContentEditable)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) opnieuw()
        else ongedaan()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        opnieuw()
      } else if (geselecteerd && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        verwijder()
      } else if (geselecteerd && e.key.toLowerCase() === 'r') draai(e.shiftKey ? -90 : 90)
      else if (geselecteerd && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const st = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0
        const dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0
        werkBij((it) => snap({ ...it, x: it.x + dx, y: it.y + dy }, kamer, { raster: 1, wandAfstand: 2 }))
      } else if (e.key === 'Escape') setSel(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  // ——— slepen vanuit de bibliotheek ———
  const bibDown = (e: RPointerEvent, type: ItemType) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    setSleep({ type, x: e.clientX, y: e.clientY, actief: false })
  }
  const bibMove = (e: RPointerEvent) => {
    setSleep((s) => (s ? { ...s, x: e.clientX, y: e.clientY, actief: s.actief || Math.abs(e.clientY - s.y) > 12 || Math.abs(e.clientX - s.x) > 24 } : s))
  }
  const bibUp = (e: RPointerEvent) => {
    const s = sleep
    setSleep(null)
    if (!s) return
    const r = vak.current?.getBoundingClientRect()
    if (s.actief && r && weergave === '2d' && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      voegToe(s.type, naarCm(e.clientX, e.clientY))
    } else if (!s.actief) voegToe(s.type)
  }

  // ——— afwerking ———
  const zetAfwerking = (wat: 'vloer' | 'wand', a: Partial<Afwerking>) => commit({ ...ontwerp, [wat]: { ...ontwerp[wat], ...a } })
  const tegelsInBerekening = () => {
    const v = formaatVan(ontwerp.vloer.formaat)
    const w = formaatVan(ontwerp.wand.formaat)
    projectStore.werkBij(p.id, (x) => ({
      ...x,
      vloertegel: { ...x.vloertegel, lengte: v.l, breedte: v.b },
      wandtegel: { ...x.wandtegel, lengte: w.l, breedte: w.b },
    }))
    toast('Tegelmaten overgenomen in de berekening')
  }
  const berekeningKlopt =
    p.vloertegel.lengte === formaatVan(ontwerp.vloer.formaat).l &&
    p.vloertegel.breedte === formaatVan(ontwerp.vloer.formaat).b &&
    p.wandtegel.lengte === formaatVan(ontwerp.wand.formaat).l &&
    p.wandtegel.breedte === formaatVan(ontwerp.wand.formaat).b

  // ——— export ———
  const exporteer2d = async () => {
    try {
      if (!svgRef.current) {
        setWeergave('2d')
        toast('Open eerst de 2D-weergave')
        return
      }
      downloadDataUrl(bestandsnaam(p, 'plattegrond'), await planNaarPng(svgRef.current))
    } catch (e) {
      toast((e as Error).message || 'Exporteren mislukt', 'fout')
    }
  }
  const exporteer3d = () => {
    if (!api3d.current) return toast('Open eerst de 3D-weergave')
    downloadDataUrl(bestandsnaam(p, '3d'), api3d.current.foto(1800, 1200))
  }
  const legVast3d = async () => {
    if (!api3d.current) return toast('Open eerst de 3D-weergave')
    const url = api3d.current.foto(1500, 1000, 'image/jpeg')
    const ok = await bewaar3dBeeld(p.id, url)
    toast(ok ? '3D-beeld staat nu op de offerte' : 'Opslaan van het 3D-beeld lukte niet in deze browser', ok ? 'ok' : 'fout')
  }

  const voorstel = () => {
    const items = voorstelIndeling(p, uid)
    commit({ ...ontwerp, items })
    setSel(null)
    toast('Voorstel-indeling geplaatst — sleep alles naar wens')
  }

  const leeg = ontwerp.items.length === 0
  const bibItems = ITEM_TYPES.filter((t) => ITEMS[t].groep === groep)
  const relevanteGroepen = GROEPEN.filter((g) => ITEM_TYPES.some((t) => ITEMS[t].groep === g.id && (ITEMS[t].ruimtes.includes(p.type) || g.id === 'openingen' || g.id === 'meubel')))
  const s = vb ? vb[2] / Math.max(1, vak.current?.getBoundingClientRect().width ?? 400) : undefined

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0 space-y-3">
        {/* werkbalk */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Weergave" className="inline-flex rounded-xl bg-sand-200/70 p-1 ring-1 ring-sand-300/70">
            {(['2d', '3d'] as const).map((w) => (
              <button
                key={w}
                role="tab"
                aria-selected={weergave === w}
                type="button"
                onClick={() => setWeergave(w)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition ${weergave === w ? 'bg-paper text-ink shadow-sm ring-1 ring-sand-300' : 'text-ink-muted hover:text-ink'}`}
              >
                {w === '2d' ? <Grid2x2 className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                {w === '2d' ? '2D-plattegrond' : '3D'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <IconKnop label="Ongedaan maken" onClick={ongedaan} disabled={!hist.terug.length}>
              <Undo2 className="h-4 w-4" />
            </IconKnop>
            <IconKnop label="Opnieuw" onClick={opnieuw} disabled={!hist.vooruit.length}>
              <Redo2 className="h-4 w-4" />
            </IconKnop>
            <span className="mx-1 h-6 w-px bg-sand-300" />
            <IconKnop label="Draai 90°" onClick={() => draai(90)} disabled={!geselecteerd || ITEMS[geselecteerd.type].montage === 'in'}>
              <RotateCw className="h-4 w-4" />
            </IconKnop>
            <IconKnop label="Verwijderen" onClick={verwijder} disabled={!geselecteerd}>
              <Trash2 className="h-4 w-4" />
            </IconKnop>
          </div>
        </div>

        {/* plattegrond of 3D */}
        <div
          ref={vak}
          className="relative h-[58vh] max-h-[640px] min-h-[340px] overflow-hidden rounded-2xl bg-[#FBF8F2] shadow-[0_18px_40px_-28px_rgba(59,48,38,.55)] ring-1 ring-sand-300/80"
        >
          {weergave === '2d' || !webgl ? (
            <>
              {vb && (
                <OntwerpPlan
                  kamer={kamer}
                  ontwerp={beeld}
                  geselecteerd={sel}
                  viewBox={vb}
                  schaal={s}
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  svgRef={svgRef}
                  interactief
                  onItemDown={onItemDown}
                  onDraaiDown={onDraaiDown}
                  onAchtergrondDown={onAchtergrondDown}
                  onMove={onMove}
                  onUp={onUp}
                  titel={`Plattegrond ${p.naam}, ${kamer.L} × ${kamer.B} cm`}
                />
              )}
              <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
                <IconKnop label="Inzoomen" onClick={() => zoom(0.8)} zwevend>
                  <Plus className="h-4 w-4" />
                </IconKnop>
                <IconKnop label="Uitzoomen" onClick={() => zoom(1.25)} zwevend>
                  <Minus className="h-4 w-4" />
                </IconKnop>
                <IconKnop label="Passend maken" onClick={pas} zwevend>
                  <Maximize2 className="h-4 w-4" />
                </IconKnop>
              </div>
              {weergave === '3d' && !webgl && (
                <p className="absolute inset-x-3 top-3 rounded-xl bg-paper/95 px-3.5 py-2.5 text-[0.82rem] leading-snug text-ink-soft ring-1 ring-sand-300">
                  3D wordt niet ondersteund in deze browser (geen WebGL). De 2D-plattegrond werkt wel. Open de app in Chrome voor 3D.
                </p>
              )}
              {leeg && (
                <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
                  <div className="pointer-events-auto max-w-sm rounded-2xl bg-paper/95 p-4 text-center shadow-lg ring-1 ring-sand-300">
                    <p className="font-semibold">Nog leeg ontwerp</p>
                    <p className="mt-1 text-[0.82rem] leading-snug text-ink-muted">Begin met een voorstel op basis van je maten, of tik hieronder op een object om het te plaatsen.</p>
                    <Button size="sm" variant="gold" className="mt-3" icon={<Sparkles className="h-4 w-4" />} onClick={voorstel}>
                      Voorstel-indeling
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-sm text-ink-muted">3D laden…</div>}>
              <Ontwerp3D
                kamer={kamer}
                ontwerp={beeld}
                className="absolute inset-0"
                onApi={(a) => (api3d.current = a)}
                onFout={(m) => {
                  setFout3d(m)
                  setWeergave('2d')
                }}
              />
              <div className="absolute right-3 bottom-3">
                <IconKnop label="Camera herstellen" onClick={() => api3d.current?.herstelCamera()} zwevend>
                  <Maximize2 className="h-4 w-4" />
                </IconKnop>
              </div>
              <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-paper/80 px-2.5 py-1 text-[0.72rem] text-ink-muted ring-1 ring-sand-300/70">Sleep om te draaien · knijp om te zoomen</p>
            </Suspense>
          )}
        </div>
        {fout3d && (
          <Notice title="3D is niet beschikbaar">
            {fout3d} De 2D-plattegrond werkt gewoon.
          </Notice>
        )}

        {/* bibliotheek */}
        <div className="no-print rounded-2xl bg-paper p-3 ring-1 ring-sand-300/70">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Categorie">
            {relevanteGroepen.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={groep === g.id}
                onClick={() => setGroep(g.id)}
                className={`h-8 shrink-0 rounded-full px-3 text-[0.8rem] font-medium transition ${groep === g.id ? 'bg-ink text-sand-50' : 'bg-sand-100 text-ink-soft ring-1 ring-sand-300 hover:text-ink'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" style={{ touchAction: 'pan-x' }}>
            {bibItems.map((t) => (
              <button
                key={t}
                type="button"
                onPointerDown={(e) => bibDown(e, t)}
                onPointerMove={bibMove}
                onPointerUp={bibUp}
                onPointerCancel={() => setSleep(null)}
                className="flex w-[84px] shrink-0 cursor-grab flex-col items-center gap-1 rounded-xl bg-sand-50 px-1.5 pt-2 pb-1.5 text-center ring-1 ring-sand-200 transition hover:ring-gold-400 active:scale-[.97]"
                style={{ touchAction: 'pan-x' }}
                title={`${ITEMS[t].naam} toevoegen (tik of sleep naar de plattegrond)`}
              >
                <SymboolIcoon type={t} w={ITEMS[t].w} d={ITEMS[t].montage === 'in' ? 30 : ITEMS[t].d} />
                <span className="text-[0.72rem] leading-tight font-medium text-ink">{ITEMS[t].naam}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[0.72rem] text-ink-muted">Tik om toe te voegen of sleep omhoog naar de plattegrond. Objecten klikken vast aan de wand en een raster van 5 cm.</p>
        </div>
        {sleep?.actief && (
          <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-80" style={{ left: sleep.x, top: sleep.y }}>
            <SymboolIcoon type={sleep.type} w={ITEMS[sleep.type].w} d={ITEMS[sleep.type].montage === 'in' ? 30 : ITEMS[sleep.type].d} size={64} />
          </div>
        )}
      </div>

      <aside className="no-print space-y-4 lg:sticky lg:top-24">
        {opslagFout && <Notice title="Niet opgeslagen">{opslagFout} Je ontwerp blijft zichtbaar tot je de pagina sluit.</Notice>}
        {geselecteerd ? (
          <ItemPaneel
            it={geselecteerd}
            onWissel={(t) => werkBij((it) => wisselType(it, t, kamer))}
            onMaat={(w, d) => werkBij((it) => snap({ ...it, w, d }, kamer, { wandAfstand: 2 }))}
            onDraai={draai}
            onDeur={(patch) => werkBij((it) => ({ ...it, ...patch }))}
            onDupliceer={dupliceer}
            onVerwijder={verwijder}
            onOmbouw={geselecteerd.type === 'toilet-hangend' && !heeftOmbouw(geselecteerd, ontwerp.items) ? ombouwErachter : undefined}
          />
        ) : (
          <Card className="p-5">
            <p className="text-[0.98rem] font-semibold">Ontwerp {p.naam}</p>
            <p className="mt-1 text-[0.82rem] leading-snug text-ink-muted">
              {kamer.L} × {kamer.B} cm, hoogte {kamer.H} cm (uit Opmeten). Tik op een object om het te verplaatsen, draaien of aan te passen. Twee vingers: zoomen en schuiven.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={<Wand2 className="h-4 w-4" />} onClick={voorstel}>
                {leeg ? 'Voorstel-indeling' : 'Opnieuw indelen'}
              </Button>
            </div>
          </Card>
        )}

        {(p.type === 'badkamer' || p.type === 'toilet') && (
          <Card>
            <CardHeader title="Kranen & kleuren" sub="Kraankleur, kraantypes en meubelfront — zichtbaar in 3D" />
            <SanitairKiezer s={sanitairVan(ontwerp.sanitair)} badkamer={p.type === 'badkamer'} onChange={zetSanitair} />
          </Card>
        )}

        <Card>
          <CardHeader title="Tegels & afwerking" sub="Zichtbaar in 2D en 3D" />
          <div className="space-y-5 p-5">
            <AfwerkingKiezer titel="Vloer" a={ontwerp.vloer} onChange={(a) => zetAfwerking('vloer', a)} />
            <AfwerkingKiezer titel={kamer.tegelH > 0 ? `Wanden (tot ${kamer.tegelH} cm)` : p.type === 'keuken' ? 'Spatwand' : 'Wanden'} a={ontwerp.wand} onChange={(a) => zetAfwerking('wand', a)} />
            <div className="rounded-xl bg-sand-50 px-3.5 py-3 text-[0.8rem] ring-1 ring-sand-200">
              {berekeningKlopt ? (
                <p className="text-ink-soft">De berekening gebruikt dezelfde tegelmaten.</p>
              ) : (
                <>
                  <p className="text-ink-soft">
                    Berekening gebruikt nu vloer {p.vloertegel.lengte}×{p.vloertegel.breedte} en wand {p.wandtegel.lengte}×{p.wandtegel.breedte} cm.
                  </p>
                  <Button size="sm" variant="secondary" className="mt-2" onClick={tegelsInBerekening}>
                    Tegelmaten overnemen in berekening
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Laten zien aan de klant" sub="Afbeeldingen en offerte" icon={<FileImage className="h-5 w-5" />} />
          <div className="space-y-3 p-5">
            <label className="flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-3.5 py-3 ring-1 ring-sand-200">
              <span className="text-sm font-medium">Ontwerp op de offerte</span>
              <Switch checked={ontwerp.inOfferte} onChange={(v) => commit({ ...ontwerp, inOfferte: v })} label="Ontwerp op de offerte tonen" />
            </label>
            <div className="grid gap-2">
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exporteer2d} disabled={weergave !== '2d' && webgl}>
                Plattegrond als PNG
              </Button>
              {webgl && (
                <>
                  <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exporteer3d} disabled={weergave !== '3d'}>
                    3D-beeld als PNG
                  </Button>
                  <Button variant="gold" icon={<FileImage className="h-4 w-4" />} onClick={weergave === '3d' ? legVast3d : () => setWeergave('3d')}>
                    {weergave === '3d' ? 'Dit 3D-beeld op de offerte' : '3D openen voor de offerte'}
                  </Button>
                </>
              )}
            </div>
            <p className="text-[0.74rem] leading-relaxed text-ink-muted">
              De plattegrond komt automatisch op de offerte en in de klantlink (daar kan de klant ook zelf in 3D kijken).
              {beeld3d ? ' Er staat een vastgelegd 3D-beeld op de afgedrukte offerte.' : ' Leg een 3D-beeld vast om het ook op de afgedrukte offerte te zetten.'}
            </p>
            {beeld3d && <img src={beeld3d} alt="Vastgelegd 3D-beeld" className="w-full rounded-xl ring-1 ring-sand-300" />}
          </div>
        </Card>
      </aside>
    </div>
  )
}

function IconKnop({ label, onClick, disabled, children, zwevend }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; zwevend?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-10 w-10 place-items-center rounded-xl text-ink transition disabled:opacity-35 ${zwevend ? 'bg-paper/95 shadow-md ring-1 ring-sand-300 hover:bg-paper' : 'hover:bg-sand-200/70'}`}
    >
      {children}
    </button>
  )
}

function ItemPaneel({
  it,
  onWissel,
  onMaat,
  onDraai,
  onDeur,
  onDupliceer,
  onVerwijder,
  onOmbouw,
}: {
  it: OntwerpItem
  onWissel: (t: ItemType) => void
  onMaat: (w: number, d: number) => void
  onDraai: (g: number) => void
  onDeur: (patch: Pick<OntwerpItem, 'draai' | 'scharnier'>) => void
  onDupliceer: () => void
  onVerwijder: () => void
  onOmbouw?: () => void
}) {
  const def = ITEMS[it.type]
  const familie = familieVan(it.type)
  const opening = def.montage === 'in'
  const begrens = (v: number, i: 0 | 1) => Math.min(def.max[i], Math.max(def.min[i], Math.round(v)))
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sand-50 ring-1 ring-sand-200">
          <SymboolIcoon type={it.type} w={it.w} d={opening ? 30 : it.d} size={40} buiten={it.draai === 'buiten'} rechts={it.scharnier === 'rechts'} />
        </span>
        <div className="min-w-0">
          <p className="text-[0.98rem] font-semibold">{def.naam}</p>
          <p className="text-[0.8rem] text-ink-muted">
            {Math.round(it.w)} × {opening ? `${def.h} cm hoog` : `${Math.round(it.d)} cm`} · {Math.round(it.rot)}°
          </p>
        </div>
        <Badge className="ml-auto">geselecteerd</Badge>
      </div>
      {familie.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {familie.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onWissel(t)}
              className={`h-8 rounded-full px-3 text-[0.8rem] font-medium ring-1 transition ${t === it.type ? 'bg-ink text-sand-50 ring-ink' : 'bg-paper text-ink-soft ring-sand-300 hover:ring-gold-400'}`}
            >
              {ITEMS[t].naam}
            </button>
          ))}
        </div>
      )}
      {onOmbouw && (
        <div className="mt-4 rounded-xl border border-gold-200 bg-gold-100/60 px-3.5 py-3 text-[0.8rem]">
          <p className="text-ink-soft">Een hangtoilet heeft meestal een leidingombouw (voorzetwand) nodig voor reservoir en afvoer.</p>
          <button type="button" onClick={onOmbouw} className="mt-2 h-8 rounded-full bg-ink px-3 text-[0.78rem] font-medium text-sand-50">
            Leidingombouw erachter zetten
          </button>
        </div>
      )}
      <div className={`mt-4 grid gap-3 ${opening ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <NumberField label="Breedte" unit="cm" decimals={0} value={Math.round(it.w)} onChange={(v) => v >= def.min[0] && onMaat(begrens(v, 0), it.d)} compact />
        {!opening && <NumberField label="Diepte" unit="cm" decimals={0} value={Math.round(it.d)} onChange={(v) => v >= def.min[1] && onMaat(it.w, begrens(v, 1))} compact />}
      </div>
      <p className="mt-1.5 text-[0.72rem] text-ink-muted">
        {def.min[0]}–{def.max[0]} cm breed{opening ? '' : `, ${def.min[1]}–${def.max[1]} cm diep`}
      </p>
      {it.type === 'deur' && (
        <div className="mt-4 grid gap-3" data-testid="deur-opties">
          <Segment
            label="Draairichting"
            waarde={it.draai === 'buiten' ? 'buiten' : 'binnen'}
            opties={[
              ['binnen', 'Naar binnen draaiend'],
              ['buiten', 'Naar buiten draaiend'],
            ]}
            onKies={(v) => onDeur({ draai: v as 'binnen' | 'buiten' })}
          />
          <Segment
            label="Scharnieren (gezien vanuit de ruimte)"
            waarde={it.scharnier === 'rechts' ? 'rechts' : 'links'}
            opties={[
              ['links', 'Links'],
              ['rechts', 'Rechts'],
            ]}
            onKies={(v) => onDeur({ scharnier: v as 'links' | 'rechts' })}
          />
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {!opening && (
          <>
            <Button size="sm" variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => onDraai(-90)}>
              Draai links
            </Button>
            <Button size="sm" variant="secondary" icon={<RotateCw className="h-4 w-4" />} onClick={() => onDraai(90)}>
              Draai rechts
            </Button>
          </>
        )}
        <Button size="sm" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={onDupliceer}>
          Dupliceren
        </Button>
        <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={onVerwijder}>
          Verwijderen
        </Button>
      </div>
    </Card>
  )
}

const stalen = new Map<string, string | null>()
function staal(kleur: string, formaat: string) {
  const k = `${kleur}|${formaat}`
  if (!stalen.has(k)) {
    const f = formaatVan(formaat)
    const maat = Math.max(f.l, f.b) * 1.6 > 120 ? Math.max(f.l, f.b) * 1.6 : 120
    stalen.set(k, vloerAfbeelding({ kleur, formaat, verband: 'recht' }, maat, maat))
  }
  return stalen.get(k)
}

function Keuze<T extends string>({ titel, lijst, waarde, onChange, kleur }: { titel: string; lijst: { id: T; naam: string; kleur?: string }[]; waarde: T; onChange: (v: T) => void; kleur?: boolean }) {
  return (
    <div>
      <p className="text-sm font-semibold">{titel}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {lijst.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={waarde === o.id}
            onClick={() => onChange(o.id)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.76rem] font-medium ring-1 transition ${waarde === o.id ? 'bg-ink text-sand-50 ring-ink' : 'bg-paper text-ink-soft ring-sand-300 hover:ring-gold-400'}`}
          >
            {kleur && o.kleur && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-sand-300" style={{ background: o.kleur }} />}
            {o.naam}
          </button>
        ))}
      </div>
    </div>
  )
}

function SanitairKiezer({ s, badkamer, onChange }: { s: Sanitair; badkamer: boolean; onChange: (s: Partial<Sanitair>) => void }) {
  return (
    <div className="space-y-4 p-5">
      <Keuze titel="Kleur kranen & beslag" lijst={KRAAN_KLEUREN} waarde={s.kraan} onChange={(kraan) => onChange({ kraan })} kleur />
      <Keuze titel="Wastafelkraan" lijst={WASTAFEL_KRANEN} waarde={s.wastafel} onChange={(wastafel) => onChange({ wastafel })} />
      {badkamer && (
        <>
          <Keuze titel="Douchekraan" lijst={DOUCHE_KRANEN} waarde={s.douche} onChange={(douche) => onChange({ douche })} />
          <Keuze titel="Badkraan" lijst={BAD_KRANEN} waarde={s.bad} onChange={(bad) => onChange({ bad })} />
          <Keuze titel="Front badmeubel & kasten" lijst={FRONT_KLEUREN} waarde={s.front} onChange={(front) => onChange({ front })} kleur />
        </>
      )}
      <p className="text-[0.76rem] text-ink-muted">Impressie van het uiterlijk; merk en type spreek je af met de klant.</p>
    </div>
  )
}

function AfwerkingKiezer({ titel, a, onChange }: { titel: string; a: Afwerking; onChange: (a: Partial<Afwerking>) => void }) {
  const f = formaatVan(a.formaat)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{titel}</p>
        <p className="text-[0.76rem] text-ink-muted">
          {kleurVan(a.kleur).naam} · {f.naam}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1.5">
        {KLEUREN.map((k) => {
          const img = staal(k.id, a.formaat)
          return (
            <button
              key={k.id}
              type="button"
              title={k.naam}
              aria-label={k.naam}
              aria-pressed={a.kleur === k.id}
              onClick={() => onChange({ kleur: k.id })}
              className={`aspect-square overflow-hidden rounded-lg ring-2 transition ${a.kleur === k.id ? 'ring-gold-500 ring-offset-2 ring-offset-paper' : 'ring-sand-200 hover:ring-gold-300'}`}
              style={{ background: img ? `url(${img}) center/cover` : k.basis }}
            />
          )
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {FORMATEN.map((fm) => (
          <button
            key={fm.id}
            type="button"
            onClick={() => onChange({ formaat: fm.id })}
            className={`h-8 rounded-full px-2.5 text-[0.76rem] font-medium ring-1 transition ${a.formaat === fm.id ? 'bg-ink text-sand-50 ring-ink' : 'bg-paper text-ink-soft ring-sand-300 hover:ring-gold-400'}`}
          >
            {fm.naam}
          </button>
        ))}
      </div>
      {f.l !== f.b && (
        <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-0.5 ring-1 ring-sand-200">
          {VERBANDEN.map((v) => (
            <button key={v} type="button" onClick={() => onChange({ verband: v })} className={`h-7 rounded-md px-2.5 text-[0.76rem] font-medium ${a.verband === v ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted'}`}>
              {v === 'recht' ? 'Recht' : v === 'halfsteens' ? 'Halfsteens' : 'Visgraat'}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[0.76rem] text-ink-muted">Voeg</span>
        {VOEGEN.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={(a.voeg ?? 'auto') === v.id}
            onClick={() => onChange({ voeg: v.id })}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.74rem] font-medium ring-1 transition ${(a.voeg ?? 'auto') === v.id ? 'bg-ink text-sand-50 ring-ink' : 'bg-paper text-ink-soft ring-sand-300 hover:ring-gold-400'}`}
          >
            <span className="h-3 w-3 rounded-full ring-1 ring-sand-300" style={{ background: v.kleur ?? kleurVan(a.kleur).voeg }} />
            {v.naam}
          </button>
        ))}
      </div>
    </div>
  )
}

function Segment({ label, waarde, opties, onKies }: { label: string; waarde: string; opties: [string, string][]; onKies: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[0.8rem] font-medium text-ink-soft">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-xl bg-sand-50 p-1 ring-1 ring-sand-200">
        {opties.map(([v, tekst]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={waarde === v}
            onClick={() => onKies(v)}
            className={`min-h-9 rounded-lg px-2 py-1.5 text-[0.8rem] font-medium leading-tight transition ${waarde === v ? 'bg-ink text-sand-50 shadow-sm' : 'text-ink-soft hover:bg-paper'}`}
          >
            {tekst}
          </button>
        ))}
      </div>
    </div>
  )
}
