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
  blad: 'url(#sw-blad)',
  zwart: '#2A2624',
  staal: '#C6CBCE',
}

/** Gedeelde defs: verlopen en schaduw. Eén keer per SVG opnemen. */
export function SymboolDefs({ id = 'sw', blad }: { id?: string; blad?: { basis: string; voeg: string; accent?: string; stijl: string; metaal?: boolean } }) {
  const b = blad ?? { basis: '#F1EEE9', voeg: '#DCD6CC', accent: '#C9C1B6', stijl: 'effen' }
  return (
    <>
      {/* werkblad: kleur + structuur (steen-spikkels, houtnerf, geborsteld staal) */}
      <pattern id={`${id}-blad`} width={b.stijl === 'hout' ? 60 : 24} height={b.stijl === 'hout' ? 12 : 24} patternUnits="userSpaceOnUse">
        <rect width="100%" height="100%" fill={b.metaal ? '#C9CED2' : b.basis} />
        {b.metaal ? (
          <>
            <line x1={0} y1={4} x2={24} y2={4} stroke="#E8ECEE" strokeWidth={0.6} />
            <line x1={0} y1={11} x2={24} y2={11} stroke="#AEB4B9" strokeWidth={0.5} />
            <line x1={0} y1={18} x2={24} y2={18} stroke="#E1E5E8" strokeWidth={0.6} />
          </>
        ) : b.stijl === 'hout' ? (
          <>
            <path d="M0 3 Q15 1.5 30 3.5 T60 3" stroke={b.accent ?? b.voeg} strokeWidth={0.7} fill="none" opacity={0.7} />
            <path d="M0 8.5 Q20 10 38 8 T60 9" stroke={b.voeg} strokeWidth={0.5} fill="none" opacity={0.6} />
          </>
        ) : b.stijl === 'marmer' ? (
          <path d="M-2 20 C6 14 10 16 14 9 S22 2 26 0" stroke={b.accent ?? b.voeg} strokeWidth={0.45} fill="none" opacity={0.75} />
        ) : (
          <>
            <circle cx={5} cy={6} r={0.7} fill={b.accent ?? b.voeg} opacity={0.7} />
            <circle cx={16} cy={13} r={0.5} fill={b.voeg} opacity={0.8} />
            <circle cx={9} cy={19} r={0.6} fill={b.accent ?? b.voeg} opacity={0.55} />
            <circle cx={20} cy={4} r={0.4} fill={b.voeg} opacity={0.7} />
          </>
        )}
      </pattern>
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
export function Symbool({ type, w, d, buiten = false, rechts = false }: { type: ItemType; w: number; d: number; buiten?: boolean; rechts?: boolean }) {
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
    case 'bad': {
      // inbouw-ligbad, bovenaanzicht: rechte ombouw/rand, kuip met ronde hoofdeinde en smaller voeteneinde, kraan + afvoer aan de voetkant (links)
      const rand = Math.min(8, d * 0.11)
      const ix0 = x0 + rand + 2
      const ix1 = w / 2 - rand
      const iy0 = y0 + rand
      const iy1 = d / 2 - rand
      const ih = iy1 - iy0
      const kv = Math.min(ih * 0.28, 14) // hoekradius voeteneinde
      const kh = Math.min(ih * 0.48, 34) // hoekradius hoofdeinde (ruim afgerond)
      const kuip = `M${ix0 + kv} ${iy0}H${ix1 - kh}A${kh} ${kh} 0 0 1 ${ix1} ${iy0 + kh}V${iy1 - kh}A${kh} ${kh} 0 0 1 ${ix1 - kh} ${iy1}H${ix0 + kv}A${kv} ${kv} 0 0 1 ${ix0} ${iy1 - kv}V${iy0 + kv}A${kv} ${kv} 0 0 1 ${ix0 + kv} ${iy0}Z`
      const afvoerX = ix0 + Math.min(16, w * 0.1)
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={2} fill={KLEUR.keramiek} {...sw} />
          <path d={kuip} fill="url(#sw-water)" stroke={KLEUR.lijnZacht} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
          {/* afvoer + overloop */}
          <circle cx={afvoerX} cy={0} r={2.8} fill="url(#sw-staal)" stroke={KLEUR.lijn} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          <circle cx={ix0 + 3.5} cy={0} r={2} fill="none" stroke={KLEUR.chroom} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
          {/* thermostaatkraan op de rand aan de wandzijde, voetkant */}
          <rect x={x0 + 1.5} y={-7} width={rand + 1} height={14} rx={1.5} fill={KLEUR.chroom} stroke={KLEUR.lijnZacht} strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
          <rect x={x0 + rand} y={-1.2} width={6} height={2.4} rx={1.2} fill={KLEUR.chroom} />
        </g>
      )
    }
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
    case 'badmeubel':
    case 'badmeubel-dubbel': {
      const bak = Math.min(w - 10, 60)
      const n = w >= 110 || type === 'badmeubel-dubbel' ? 2 : 1
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
      // in de wand: kamerzijde is +y (lokaal). Standaard scharnier links en naar binnen; spiegelen voor rechts/buiten.
      return (
        <g transform={buiten || rechts ? `scale(${rechts ? -1 : 1} ${buiten ? -1 : 1})` : undefined} data-deur={`${buiten ? 'buiten' : 'binnen'}-${rechts ? 'rechts' : 'links'}`}>
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
    case 'kolomkast':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={1.5} fill={KLEUR.hout} {...sw} />
          <path d={`M${x0} ${y0}L${w / 2} ${d / 2}M${w / 2} ${y0}L${x0} ${d / 2}`} {...fijn} />
          <line x1={x0} y1={d / 2 - 2.5} x2={w / 2} y2={d / 2 - 2.5} {...fijn} />
        </g>
      )
    case 'spiegelkast':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={1} fill="rgba(236,230,220,0.6)" stroke={KLEUR.lijn} strokeWidth={0.7} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
          <rect x={x0 + 1} y={d / 2 - 2.2} width={w - 2} height={2.2} fill="url(#sw-spiegel)" stroke={KLEUR.lijnZacht} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          {w >= 70 && <line x1={0} y1={y0 + 1} x2={0} y2={d / 2 - 1} {...fijn} />}
        </g>
      )
    case 'bad-vrijstaand': {
      // vrijstaand bad: zachte "pil"-vorm (geen ovaal), dunne rand, afvoer in het midden, staande kraan aan de kopse kant
      const r = Math.min(d / 2, w * 0.3)
      const rand = Math.min(6, d * 0.08)
      const ri = Math.max(4, r - rand)
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={r} fill={KLEUR.keramiek} {...sw} />
          <rect x={x0 + rand} y={y0 + rand} width={w - 2 * rand} height={d - 2 * rand} rx={ri} fill="url(#sw-water)" stroke={KLEUR.lijnZacht} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
          <circle cx={0} cy={0} r={2.8} fill="url(#sw-staal)" stroke={KLEUR.lijn} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          <circle cx={x0 - 7} cy={0} r={3.2} fill={KLEUR.chroom} stroke={KLEUR.lijnZacht} strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
          <rect x={x0 - 6} y={-1.1} width={7} height={2.2} rx={1.1} fill={KLEUR.chroom} />
        </g>
      )
    }
    case 'waskom': {
      const n = w >= 110 ? 2 : 1
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} rx={1.5} fill={KLEUR.houtDonker} {...sw} />
          {Array.from({ length: n }, (_, i) => {
            const cx = n === 1 ? 0 : i === 0 ? -w / 4 : w / 4
            const r = Math.min(d * 0.36, 20)
            return (
              <g key={i}>
                <circle cx={cx} cy={d * 0.06} r={r} fill={KLEUR.keramiek} {...sw} />
                <circle cx={cx} cy={d * 0.06} r={r - 3} fill="url(#sw-water)" stroke={KLEUR.lijnZacht} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
                <rect x={cx - 1.6} y={y0 + 2} width={3.2} height={Math.max(5, d * 0.16)} rx={1.2} fill={KLEUR.chroom} />
              </g>
            )
          })}
        </g>
      )
    }
    case 'douchewand':
      return (
        <g>
          <rect x={x0} y={-Math.max(d, 1.4) / 2} width={w} height={Math.max(d, 1.4)} fill={KLEUR.glas} opacity={0.85} />
          <rect x={x0} y={-1.6} width={2.4} height={3.2} fill={KLEUR.chroom} />
        </g>
      )
    case 'nis':
      return <rect x={x0} y={y0} width={w} height={d} fill="rgba(201,165,106,0.12)" stroke={KLEUR.lijn} strokeWidth={0.6} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
    case 'ombouw':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} fill="#E7E0D4" {...sw} />
          <path d={`M${x0} ${d / 2}L${x0 + d} ${y0}`} {...fijn} />
        </g>
      )
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
export function SymboolIcoon({ type, w, d, size = 44, buiten, rechts }: { type: ItemType; w: number; d: number; size?: number; buiten?: boolean; rechts?: boolean }) {
  const m = Math.max(w, d) * 1.18
  return (
    <svg viewBox={`${-m / 2} ${-m / 2} ${m} ${m}`} width={size} height={size} aria-hidden>
      <defs>
        <SymboolDefs />
      </defs>
      <g filter="url(#sw-schaduw)">
        <Symbool type={type} w={w} d={d} buiten={buiten} rechts={rechts} />
      </g>
    </svg>
  )
}
