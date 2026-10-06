/** 2D-symbolen (bovenaanzicht) voor de ontwerp-items. Lokale coördinaten in cm, middelpunt = (0,0), achterkant = -d/2. */
import type { ReactNode } from 'react'
import type { ItemType } from '../../lib/ontwerp/model'

export const KLEUR = {
  lijn: '#6F655C',
  lijnZacht: '#A39889',
  keramiek: 'url(#sw-keramiek)',
  wit: '#FFFFFF',
  glas: '#7FA6B6',
  chroom: '#AEB5BA',
  hout: '#C9A57A',
  houtDonker: '#A9855A',
  blad: '#ECE6DC',
  zwart: '#2A2624',
  staal: '#C6CBCE',
}

/** Gedeelde defs: verlopen en schaduw. Eén keer per SVG opnemen. */
export function SymboolDefs({ id = 'sw' }: { id?: string }) {
  return (
    <>
      <linearGradient id={`${id}-keramiek`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#F2EEE8" />
      </linearGradient>
      <linearGradient id={`${id}-water`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F4F8FA" />
        <stop offset="1" stopColor="#DDE8EE" />
      </linearGradient>
      <linearGradient id={`${id}-spiegel`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#C9D6DD" />
        <stop offset="0.5" stopColor="#EEF4F7" />
        <stop offset="1" stopColor="#BFCDD5" />
      </linearGradient>
      <linearGradient id={`${id}-staal`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#E3E7E9" />
        <stop offset="1" stopColor="#B7BEC2" />
      </linearGradient>
      <filter id={`${id}-schaduw`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.6" stdDeviation="1.8" floodColor="#3B3026" floodOpacity="0.22" />
      </filter>
    </>
  )
}

const sw = { stroke: KLEUR.lijn, strokeWidth: 0.8, vectorEffect: 'non-scaling-stroke' as const }
const fijn = { stroke: KLEUR.lijnZacht, strokeWidth: 0.6, vectorEffect: 'non-scaling-stroke' as const, fill: 'none' }

function Kast({ w, d, blad = KLEUR.blad, verdeling = 60 }: { w: number; d: number; blad?: string; verdeling?: number }) {
  const lijnen: ReactNode[] = []
  const n = Math.max(1, Math.round(w / verdeling))
  for (let i = 1; i < n; i++) lijnen.push(<line key={i} x1={-w / 2 + (w * i) / n} y1={-d / 2 + 2} x2={-w / 2 + (w * i) / n} y2={d / 2 - 2} {...fijn} strokeDasharray="3 2" />)
  return (
    <>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={1} fill={blad} {...sw} />
      <line x1={-w / 2} y1={d / 2 - 3} x2={w / 2} y2={d / 2 - 3} {...fijn} />
      {lijnen}
    </>
  )
}

/** Tekent het symbool voor een type, gecentreerd, w × d cm. */
export function Symbool({ type, w, d }: { type: ItemType; w: number; d: number }) {
  const x0 = -w / 2
  const y0 = -d / 2
  switch (type) {
    case 'douche-inloop': {
      const glas = Math.min(w, Math.max(60, w * 0.7))
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} fill="rgba(127,166,182,0.10)" stroke={KLEUR.glas} strokeWidth={0.6} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          {/* glazen wand aan de voorzijde */}
          <rect x={x0} y={d / 2 - 1.2} width={glas} height={1.2} fill={KLEUR.glas} opacity={0.85} />
          <rect x={x0 + glas - 2} y={d / 2 - 2} width={2} height={2.6} fill={KLEUR.chroom} />
          {/* goot en regendouche */}
          <rect x={x0 + 8} y={y0 + 6} width={w - 16} height={3.2} rx={1.6} fill="url(#sw-staal)" stroke={KLEUR.lijnZacht} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          <circle cx={0} cy={y0 + Math.min(32, d * 0.3)} r={Math.min(13, w * 0.14)} fill="none" stroke={KLEUR.chroom} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
          <circle cx={0} cy={y0 + Math.min(32, d * 0.3)} r={Math.min(9, w * 0.1)} fill="none" stroke={KLEUR.chroom} strokeWidth={0.5} strokeDasharray="1 1.5" vectorEffect="non-scaling-stroke" />
        </g>
      )
    }
    case 'douche-cabine':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={3} fill={KLEUR.keramiek} {...sw} />
          <rect x={x0 + 3} y={y0 + 3} width={w - 6} height={d - 6} rx={2} fill="url(#sw-water)" stroke={KLEUR.lijnZacht} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          <path d={`M${x0} ${d / 2 - 0.8}H${w / 2 - 0.8}V${y0}`} fill="none" stroke={KLEUR.glas} strokeWidth={1.4} />
          <circle cx={0} cy={0} r={3.5} fill="url(#sw-staal)" stroke={KLEUR.lijnZacht} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          <path d={`M${x0 + w * 0.15} ${d / 2}A${w * 0.6} ${w * 0.6} 0 0 0 ${w / 2} ${d / 2 - w * 0.6}`} {...fijn} strokeDasharray="2 2" />
        </g>
      )
    case 'bad':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={Math.min(10, d * 0.15)} fill={KLEUR.keramiek} {...sw} />
          <rect x={x0 + 7} y={y0 + 7} width={w - 14} height={d - 14} rx={Math.min(d * 0.3, 22)} fill="url(#sw-water)" stroke={KLEUR.lijnZacht} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
          <circle cx={x0 + 20} cy={0} r={2.6} fill="url(#sw-staal)" stroke={KLEUR.lijnZacht} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          <rect x={x0 + 2} y={-4} width={4} height={8} rx={1.5} fill={KLEUR.chroom} />
        </g>
      )
    case 'toilet-hangend':
    case 'toilet-staand': {
      const staand = type === 'toilet-staand'
      const tank = staand ? Math.min(20, d * 0.3) : 5
      const bw = w
      const by = y0 + tank
      const bd = d - tank
      return (
        <g>
          <rect x={x0 + (staand ? 0 : w * 0.05)} y={y0} width={staand ? w : w * 0.9} height={tank} rx={staand ? 3 : 1} fill={KLEUR.keramiek} {...sw} />
          <path
            d={`M${-bw / 2} ${by}H${bw / 2}V${by + bd - bw / 2}A${bw / 2} ${bw / 2} 0 0 1 ${-bw / 2} ${by + bd - bw / 2}Z`}
            fill={KLEUR.keramiek}
            {...sw}
          />
          <ellipse cx={0} cy={by + bd * 0.58} rx={bw * 0.32} ry={bd * 0.33} fill="url(#sw-water)" stroke={KLEUR.lijnZacht} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          {!staand && <rect x={-6} y={y0 - 0.5} width={12} height={2} rx={0.6} fill={KLEUR.chroom} />}
        </g>
      )
    }
    case 'wastafel':
    case 'fontein':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={Math.min(6, d * 0.2)} fill={KLEUR.keramiek} {...sw} />
          <rect x={x0 + w * 0.12} y={y0 + d * 0.28} width={w * 0.76} height={d * 0.6} rx={Math.min(d * 0.28, 12)} fill="url(#sw-water)" stroke={KLEUR.lijnZacht} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          <rect x={-1.6} y={y0 + 3} width={3.2} height={Math.max(5, d * 0.2)} rx={1.2} fill={KLEUR.chroom} />
        </g>
      )
    case 'badmeubel': {
      const bak = Math.min(w - 10, 60)
      const n = w >= 110 ? 2 : 1
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={2} fill={KLEUR.hout} {...sw} />
          <rect x={x0 + 1.5} y={y0 + 1.5} width={w - 3} height={d - 3} rx={1.5} fill={KLEUR.keramiek} stroke={KLEUR.lijnZacht} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          {Array.from({ length: n }, (_, i) => {
            const cx = n === 1 ? 0 : (i === 0 ? -w / 4 : w / 4)
            const bw = n === 1 ? bak : Math.min(bak, w / 2 - 12)
            return (
              <g key={i}>
                <rect x={cx - bw / 2} y={y0 + d * 0.3} width={bw} height={d * 0.55} rx={Math.min(d * 0.2, 9)} fill="url(#sw-water)" stroke={KLEUR.lijnZacht} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
                <rect x={cx - 1.6} y={y0 + 3.5} width={3.2} height={Math.max(6, d * 0.2)} rx={1.2} fill={KLEUR.chroom} />
              </g>
            )
          })}
        </g>
      )
    }
    case 'spiegel':
      return <rect x={x0} y={y0} width={w} height={Math.max(d, 2.5)} rx={0.8} fill="url(#sw-spiegel)" stroke={KLEUR.lijnZacht} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
    case 'handdoekradiator':
    case 'radiator': {
      const n = Math.max(3, Math.round(w / (type === 'radiator' ? 5 : 9)))
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={1} fill={type === 'radiator' ? '#F7F5F1' : '#5A5652'} {...sw} />
          {Array.from({ length: n - 1 }, (_, i) => (
            <line key={i} x1={x0 + (w * (i + 1)) / n} y1={y0 + 1} x2={x0 + (w * (i + 1)) / n} y2={d / 2 - 1} stroke={type === 'radiator' ? KLEUR.lijnZacht : '#8B8580'} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )
    }
    case 'deur':
      // in de wand: kamerzijde is +y (lokaal). Scharnier links.
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} fill="#E9E1D3" />
          <line x1={x0} y1={y0} x2={x0} y2={d / 2} {...sw} />
          <line x1={w / 2} y1={y0} x2={w / 2} y2={d / 2} {...sw} />
          <rect x={x0} y={d / 2} width={3.5} height={w - 2} fill="#FFFFFF" {...sw} />
          <path d={`M${w / 2} ${d / 2}A${w - 2} ${w - 2} 0 0 1 ${x0 + 1.75} ${d / 2 + w - 2}`} fill="rgba(201,165,106,0.06)" stroke={KLEUR.lijnZacht} strokeWidth={0.6} strokeDasharray="3 2.5" vectorEffect="non-scaling-stroke" />
        </g>
      )
    case 'raam':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} fill="#FBFAF7" {...sw} />
          <line x1={x0} y1={-1.2} x2={w / 2} y2={-1.2} stroke={KLEUR.glas} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
          <line x1={x0} y1={1.2} x2={w / 2} y2={1.2} stroke={KLEUR.glas} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
        </g>
      )
    case 'onderkast':
    case 'aanrecht':
      return <Kast w={w} d={d} />
    case 'spoelbak':
      return (
        <g>
          <Kast w={w} d={d} verdeling={w} />
          <rect x={-Math.min(w - 16, 50) / 2} y={y0 + d * 0.25} width={Math.min(w - 16, 50)} height={d * 0.55} rx={4} fill="url(#sw-staal)" stroke={KLEUR.lijnZacht} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          <circle cx={0} cy={y0 + 7} r={2.4} fill={KLEUR.chroom} stroke={KLEUR.lijnZacht} strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
        </g>
      )
    case 'kookplaat': {
      const pw = Math.min(w - 10, 76)
      const pd = Math.min(d - 10, 50)
      const ringen: [number, number, number][] = [
        [-pw * 0.25, -pd * 0.2, 9],
        [pw * 0.25, -pd * 0.2, 7],
        [-pw * 0.25, pd * 0.22, 7],
        [pw * 0.25, pd * 0.22, 10],
      ]
      return (
        <g>
          <Kast w={w} d={d} verdeling={w} />
          <rect x={-pw / 2} y={-pd / 2 - 1} width={pw} height={pd} rx={3} fill={KLEUR.zwart} />
          {ringen.map(([cx, cy, rr], i) => (
            <circle key={i} cx={cx} cy={cy - 1} r={rr} fill="none" stroke="#6E6862" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )
    }
    case 'bovenkast':
      return <rect x={x0} y={y0} width={w} height={d} rx={1} fill="rgba(236,230,220,0.55)" stroke={KLEUR.lijn} strokeWidth={0.7} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
    case 'koelkast':
    case 'kast':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={1.5} fill={type === 'koelkast' ? '#F4F3F1' : KLEUR.hout} {...sw} />
          <path d={`M${x0} ${y0}L${w / 2} ${d / 2}M${w / 2} ${y0}L${x0} ${d / 2}`} {...fijn} />
          <line x1={x0} y1={d / 2 - 3} x2={w / 2} y2={d / 2 - 3} {...fijn} />
        </g>
      )
  }
}

/** Kleine voorbeeldweergave voor de bibliotheek. */
export function SymboolIcoon({ type, w, d, size = 44 }: { type: ItemType; w: number; d: number; size?: number }) {
  const m = Math.max(w, d) * 1.18
  return (
    <svg viewBox={`${-m / 2} ${-m / 2} ${m} ${m}`} width={size} height={size} aria-hidden>
      <defs>
        <SymboolDefs />
      </defs>
      <g filter="url(#sw-schaduw)">
        <Symbool type={type} w={w} d={d} />
      </g>
    </svg>
  )
}
