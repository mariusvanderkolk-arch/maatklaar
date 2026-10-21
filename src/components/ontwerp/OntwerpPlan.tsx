/** 2D-plattegrond (bovenaanzicht) van een ontwerp. Alleen-lezen of, met handlers, als basis voor de editor. */
import { memo, useMemo, type PointerEvent as RPointerEvent, type Ref } from 'react'
import { afstanden, halveMaat, ITEMS, kleurVan, WAND_DIKTE, type Kamer, type Ontwerp, type OntwerpItem } from '../../lib/ontwerp/model'
import { vloerAfbeelding } from '../../lib/ontwerp/tegels'
import { Symbool, SymboolDefs } from './symbolen'

const WAND = '#2B2622'
const MAAT = '#9A7A45'
const GOUD = '#C9A15A'

export const PLAN_MARGE = WAND_DIKTE + 46

const isHoog = (it: OntwerpItem) => it.type === 'spiegel' || it.type === 'bovenkast'

interface Props {
  kamer: Kamer
  ontwerp: Ontwerp
  geselecteerd?: string | null
  /** cm per schermpixel (voor lijndiktes/handgrepen/tekst); standaard berekend uit een breedte van 420 px */
  schaal?: number
  viewBox?: [number, number, number, number]
  toonMaten?: boolean
  className?: string
  svgRef?: Ref<SVGSVGElement>
  titel?: string
  onItemDown?: (e: RPointerEvent, id: string) => void
  onDraaiDown?: (e: RPointerEvent, id: string) => void
  onAchtergrondDown?: (e: RPointerEvent) => void
  interactief?: boolean
  preserveAspectRatio?: string
  onMove?: (e: RPointerEvent) => void
  onUp?: (e: RPointerEvent) => void
}

function Maatlijn({ x1, y1, x2, y2, tekst, s, kant = -1, kleur = MAAT }: { x1: number; y1: number; x2: number; y2: number; tekst: string; s: number; kant?: number; kleur?: string }) {
  const hor = Math.abs(y2 - y1) < Math.abs(x2 - x1)
  const lengte = hor ? Math.abs(x2 - x1) : Math.abs(y2 - y1)
  if (lengte < 1) return null
  const t = 5 * s
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const fs = 11 * s
  const bw = tekst.length * fs * 0.58 + 8 * s
  const past = lengte > bw + 6 * s
  return (
    <g data-maat>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={kleur} strokeWidth={0.9 * s} />
      {hor ? (
        <>
          <line x1={x1} y1={y1 - t} x2={x1} y2={y1 + t} stroke={kleur} strokeWidth={0.9 * s} />
          <line x1={x2} y1={y2 - t} x2={x2} y2={y2 + t} stroke={kleur} strokeWidth={0.9 * s} />
        </>
      ) : (
        <>
          <line x1={x1 - t} y1={y1} x2={x1 + t} y2={y1} stroke={kleur} strokeWidth={0.9 * s} />
          <line x1={x2 - t} y1={y2} x2={x2 + t} y2={y2} stroke={kleur} strokeWidth={0.9 * s} />
        </>
      )}
      <g transform={`translate(${hor ? mx : mx + (past ? 0 : kant * (bw / 2 + 4 * s))} ${hor ? my + (past ? 0 : kant * (fs + 2 * s)) : my}) ${hor ? '' : 'rotate(-90)'}`}>
        <rect x={-bw / 2} y={-fs * 0.72} width={bw} height={fs * 1.44} rx={fs * 0.72} fill="#FFFDF9" stroke={kleur} strokeWidth={0.5 * s} opacity={0.95} />
        <text x={0} y={fs * 0.36} textAnchor="middle" fontSize={fs} fontFamily="Inter Variable, Inter, system-ui, sans-serif" fontWeight={600} fill="#4A3F35">
          {tekst}
        </text>
      </g>
    </g>
  )
}

function OntwerpPlanBasis({ kamer, ontwerp, geselecteerd, schaal, viewBox, toonMaten = true, className = '', svgRef, titel, onItemDown, onDraaiDown, onAchtergrondDown, interactief, preserveAspectRatio, onMove, onUp }: Props) {
  const { L, B } = kamer
  const m = PLAN_MARGE
  const vb = viewBox ?? [-m, -m, L + 2 * m, B + 2 * m]
  const s = schaal ?? vb[2] / 420
  const T = WAND_DIKTE
  const vloer = useMemo(() => vloerAfbeelding(ontwerp.vloer, L, B), [ontwerp.vloer, L, B])
  const wandKleur = kleurVan(ontwerp.wand.kleur)
  const vloerKleur = kleurVan(ontwerp.vloer.kleur)
  const betegeld = kamer.tegelH > 0
  const laag = ontwerp.items.filter((it) => ITEMS[it.type].montage !== 'in' && !isHoog(it))
  const hoog = ontwerp.items.filter((it) => isHoog(it))
  const openingen = ontwerp.items.filter((it) => ITEMS[it.type].montage === 'in')
  const sel = ontwerp.items.find((it) => it.id === geselecteerd)

  const item = (it: OntwerpItem) => (
    <g
      key={it.id}
      transform={`translate(${it.x} ${it.y}) rotate(${it.rot})`}
      filter={ITEMS[it.type].montage === 'in' || it.type === 'douche-inloop' ? undefined : 'url(#sw-schaduw)'}
      onPointerDown={onItemDown ? (e) => onItemDown(e, it.id) : undefined}
      style={interactief ? { cursor: 'grab' } : undefined}
      data-item={it.id}
    >
      {/* ruimer raakvlak voor vingers */}
      {interactief && <rect x={-it.w / 2 - 4} y={-it.d / 2 - 4} width={it.w + 8} height={it.d + 8} fill="transparent" />}
      <Symbool type={it.type} w={it.w} d={it.d} buiten={it.draai === 'buiten'} rechts={it.scharnier === 'rechts'} />
    </g>
  )

  let selectie = null
  if (sel) {
    const { hx, hy } = halveMaat(sel)
    const a = afstanden(sel, kamer)
    const opening = ITEMS[sel.type].montage === 'in'
    const handR = 11 * s
    const rad = (sel.rot * Math.PI) / 180
    // draaihandvat voor het item (lokaal +y), buiten het item
    const afst = sel.d / 2 + 26 * s
    const hxp = sel.x - Math.sin(rad) * afst
    const hyp = sel.y + Math.cos(rad) * afst
    selectie = (
      <g data-ui>
        <rect x={sel.x - hx - 2 * s} y={sel.y - hy - 2 * s} width={hx * 2 + 4 * s} height={hy * 2 + 4 * s} rx={3 * s} fill="none" stroke="#B8893E" strokeWidth={1.6 * s} strokeDasharray={`${5 * s} ${3 * s}`} />
        {toonMaten && !opening && (
          <>
            {a.links > 0 && <Maatlijn x1={0} y1={sel.y} x2={sel.x - hx} y2={sel.y} tekst={`${a.links}`} s={s} kleur="#B8893E" />}
            {a.rechts > 0 && <Maatlijn x1={sel.x + hx} y1={sel.y} x2={L} y2={sel.y} tekst={`${a.rechts}`} s={s} kleur="#B8893E" />}
            {a.boven > 0 && <Maatlijn x1={sel.x} y1={0} x2={sel.x} y2={sel.y - hy} tekst={`${a.boven}`} s={s} kleur="#B8893E" />}
            {a.onder > 0 && <Maatlijn x1={sel.x} y1={sel.y + hy} x2={sel.x} y2={B} tekst={`${a.onder}`} s={s} kleur="#B8893E" />}
          </>
        )}
        {toonMaten && opening && (
          <Maatlijn
            x1={sel.rot % 180 === 0 ? sel.x - sel.w / 2 : sel.x + (sel.rot === 90 ? -T : T) * 1.8}
            y1={sel.rot % 180 === 0 ? sel.y + (sel.rot === 0 ? T : -T) * 1.8 : sel.y - sel.w / 2}
            x2={sel.rot % 180 === 0 ? sel.x + sel.w / 2 : sel.x + (sel.rot === 90 ? -T : T) * 1.8}
            y2={sel.rot % 180 === 0 ? sel.y + (sel.rot === 0 ? T : -T) * 1.8 : sel.y + sel.w / 2}
            tekst={`${Math.round(sel.w)}`}
            s={s}
            kleur="#B8893E"
          />
        )}
        {onDraaiDown && !opening && (
          <g onPointerDown={(e) => onDraaiDown(e, sel.id)} style={{ cursor: 'grab' }}>
            <line x1={sel.x - Math.sin(rad) * (sel.d / 2)} y1={sel.y + Math.cos(rad) * (sel.d / 2)} x2={hxp} y2={hyp} stroke="#B8893E" strokeWidth={1.2 * s} />
            <circle cx={hxp} cy={hyp} r={handR * 1.8} fill="transparent" />
            <circle cx={hxp} cy={hyp} r={handR} fill="#FFFDF9" stroke="#B8893E" strokeWidth={1.6 * s} />
            <path
              d={`M${hxp - handR * 0.45} ${hyp - handR * 0.1}A${handR * 0.5} ${handR * 0.5} 0 1 1 ${hxp + handR * 0.1} ${hyp + handR * 0.48}`}
              fill="none"
              stroke="#B8893E"
              strokeWidth={1.4 * s}
              strokeLinecap="round"
            />
            <path d={`M${hxp - handR * 0.62} ${hyp - handR * 0.42}L${hxp - handR * 0.45} ${hyp - handR * 0.02}L${hxp - handR * 0.08} ${hyp - handR * 0.2}`} fill="none" stroke="#B8893E" strokeWidth={1.4 * s} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </g>
    )
  }

  return (
    <svg
      ref={svgRef}
      viewBox={vb.join(' ')}
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      role="img"
      aria-label={titel ?? `Plattegrond ${L} × ${B} cm`}
      xmlns="http://www.w3.org/2000/svg"
      style={interactief ? { touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <defs>
        <SymboolDefs blad={ontwerp.blad ? { ...kleurVan(ontwerp.blad.kleur), metaal: (ontwerp.blad.metaal ?? 0) > 0.5 } : undefined} />
        <pattern id="sw-raster" width={10} height={10} patternUnits="userSpaceOnUse">
          <circle cx={5} cy={5} r={0.55} fill="#D9CDBB" />
        </pattern>
      </defs>
      <rect data-achtergrond x={vb[0] - vb[2]} y={vb[1] - vb[3]} width={vb[2] * 3} height={vb[3] * 3} fill="#FBF8F2" onPointerDown={onAchtergrondDown} />
      {interactief && <rect x={vb[0] - vb[2]} y={vb[1] - vb[3]} width={vb[2] * 3} height={vb[3] * 3} fill="url(#sw-raster)" pointerEvents="none" />}

      {/* vloer */}
      <g onPointerDown={onAchtergrondDown}>
        {vloer ? <image href={vloer} x={0} y={0} width={L} height={B} preserveAspectRatio="none" /> : <rect x={0} y={0} width={L} height={B} fill={vloerKleur.basis} />}
        {/* zacht licht over de vloer */}
        <rect x={0} y={0} width={L} height={B} fill="url(#sw-vloerlicht)" />
      </g>
      <defs>
        <linearGradient id="sw-wandschaduw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B2622" stopOpacity={0.35} />
          <stop offset="1" stopColor="#2B2622" stopOpacity={0.2} />
        </linearGradient>
        <radialGradient id="sw-vloerlicht" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
          <stop offset="1" stopColor="#3B3026" stopOpacity={0.08} />
        </radialGradient>
      </defs>
      {/* wandtegels: rand langs de binnenkant */}
      {betegeld && <rect x={1.6} y={1.6} width={L - 3.2} height={B - 3.2} fill="none" stroke={wandKleur.basis} strokeWidth={3.2} />}

      {/* oppervlakte in het midden (subtiel) */}
      <text x={L / 2} y={B / 2 + 4 * s} textAnchor="middle" fontSize={12 * s} fontFamily="Inter Variable, Inter, system-ui, sans-serif" fontWeight={600} fill="#2B2622" opacity={0.28} pointerEvents="none" data-ui>
        {`${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format((L * B) / 10000)} m²`}
      </text>
      <g pointerEvents={interactief ? undefined : 'none'}>{laag.map(item)}</g>

      {/* wanden */}
      <path d={`M${-T} ${-T}H${L + T}V${B + T}H${-T}Z M0 0V${B}H${L}V0Z`} fillRule="evenodd" fill={WAND} onPointerDown={onAchtergrondDown} />
      {/* gouden binnenlijn + zachte binnenschaduw langs de wand */}
      <rect x={0} y={0} width={L} height={B} fill="none" stroke="url(#sw-wandschaduw)" strokeWidth={6 * s} pointerEvents="none" opacity={0.5} />
      <rect x={-0.6 * s} y={-0.6 * s} width={L + 1.2 * s} height={B + 1.2 * s} fill="none" stroke={GOUD} strokeWidth={1.1 * s} pointerEvents="none" />
      <g pointerEvents={interactief ? undefined : 'none'}>{openingen.map(item)}</g>
      <g pointerEvents={interactief ? undefined : 'none'} opacity={0.92}>
        {hoog.map(item)}
      </g>

      {toonMaten && (
        <g pointerEvents="none">
          <Maatlijn x1={0} y1={-T - 22 * s} x2={L} y2={-T - 22 * s} tekst={`${L} cm`} s={s} />
          <Maatlijn x1={-T - 22 * s} y1={0} x2={-T - 22 * s} y2={B} tekst={`${B} cm`} s={s} />
        </g>
      )}
      {selectie}
    </svg>
  )
}

export const OntwerpPlan = memo(OntwerpPlanBasis)

/** Zet de plattegrond om naar een PNG (data-URL), zonder selectie. */
export async function planNaarPng(svg: SVGSVGElement, breedte = 2000, achtergrond = '#FBF8F2'): Promise<string> {
  const kloon = svg.cloneNode(true) as SVGSVGElement
  kloon.querySelectorAll('[data-ui]').forEach((n) => n.remove())
  const vb = svg.viewBox.baseVal
  const hoogte = Math.round((breedte * vb.height) / vb.width)
  kloon.setAttribute('width', String(breedte))
  kloon.setAttribute('height', String(hoogte))
  // lijnen meeschalen met de afbeelding (anders haarlijnen op groot formaat)
  const stijl = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  stijl.textContent = '*{vector-effect:none!important}'
  kloon.insertBefore(stijl, kloon.firstChild)
  const tekst = new XMLSerializer().serializeToString(kloon)
  const url = URL.createObjectURL(new Blob([tekst], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('De plattegrond kon niet als afbeelding worden gemaakt.'))
      img.src = url
    })
    const c = document.createElement('canvas')
    c.width = breedte
    c.height = hoogte
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas niet beschikbaar')
    ctx.fillStyle = achtergrond
    ctx.fillRect(0, 0, breedte, hoogte)
    ctx.drawImage(img, 0, 0, breedte, hoogte)
    return c.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}
