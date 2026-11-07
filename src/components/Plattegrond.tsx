import { type SchilderWand, type WandZijde, kleurTekst } from '../lib/schilderplan'
import { useId } from 'react'
import type { Afmetingen, ProjectType, Scope, TileSpec } from '../lib/types'
import { getal } from '../lib/format'

/** Schematische plattegrond die meeschaalt met de ingevoerde maten. */
export function Plattegrond({
  afmetingen,
  scope,
  vloertegel,
  type = 'badkamer',
  className = '',
  bg = '#FFFDF9',
  schilderWanden, geselecteerdeWand, onWand,
}: {
  afmetingen: Afmetingen
  scope: Partial<Pick<Scope, 'inloopdouche' | 'toilet' | 'wastafelmeubel' | 'fontein' | 'spatwand' | 'legvloer'>>
  vloertegel?: TileSpec
  type?: ProjectType
  className?: string
  bg?: string
  schilderWanden?: SchilderWand[]
  geselecteerdeWand?: WandZijde
  onWand?: (zijde: WandZijde) => void
}) {
  const arc = `arcering-${useId().replace(/:/g, '')}`
  const L = Math.max(0.5, afmetingen.lengte || 0.5)
  const B = Math.max(0.5, afmetingen.breedte || 0.5)
  const max = 260
  const s = max / Math.max(L, B)
  const W = L * s
  const H = B * s
  const pad = 46
  const vbW = W + pad * 2
  const vbH = H + pad * 2
  const x0 = pad
  const y0 = pad

  const deur = afmetingen.openingen.find((o) => o.type === 'deur')
  const raam = afmetingen.openingen.find((o) => o.type === 'raam')
  const deurW = deur ? Math.min(deur.breedte, L * 0.6) * s : 0
  const deurX = x0 + Math.min(0.25 * s, W * 0.15)
  const raamW = raam ? Math.min(raam.breedte, L * 0.5) * s : 0
  const raamX = x0 + W * 0.35

  const dW = Math.min(afmetingen.douche.breedte, L) * s
  const dD = Math.min(afmetingen.douche.diepte, B) * s

  // tegelraster
  const tx = vloertegel ? (vloertegel.lengte / 100) * s : 0.6 * s
  const ty = vloertegel ? (vloertegel.breedte / 100) * s : 0.6 * s
  const lijnen: string[] = []
  const planken = type === 'vloer' && scope.legvloer
  if (planken) {
    // klikvloer: planken van ca. 1,2 × 0,2 m in halfsteens verband
    const pb = 0.2 * s
    const pl = 1.2 * s
    let rij = 0
    for (let y = y0 + pb; y < y0 + H - 1; y += pb) lijnen.push(`M${x0} ${y}H${x0 + W}`)
    for (let y = y0; y < y0 + H - 1; y += pb, rij++) {
      const yb = Math.min(y + pb, y0 + H)
      for (let x = x0 + (rij % 2 ? pl / 2 : pl * 0.85); x < x0 + W - 2; x += pl) lijnen.push(`M${x} ${y}V${yb}`)
    }
  } else {
    if (tx > 6) for (let x = x0 + tx; x < x0 + W - 1; x += tx) lijnen.push(`M${x} ${y0}V${y0 + H}`)
    if (ty > 6) for (let y = y0 + ty; y < y0 + H - 1; y += ty) lijnen.push(`M${x0} ${y}H${x0 + W}`)
  }
  // keuken: aanrecht langs de bovenwand (en zo nodig de rechterwand), 60 cm diep
  const aanrechtL = Math.max(0, afmetingen.spatwand?.lengte ?? 0) * s
  const diep = 0.6 * s
  const aanrechtBoven = Math.min(aanrechtL, W)
  const aanrechtRechts = Math.min(Math.max(0, aanrechtL - W + diep), H - diep)

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className} role={onWand ? "group" : "img"} aria-label={`Plattegrond ${getal(L)} bij ${getal(B)} meter`}>
      <defs>
        <pattern id={arc} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#C8A96A" strokeOpacity=".45" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect x={x0} y={y0} width={W} height={H} fill="#FFFDF9" />
      <path d={schilderWanden ? '' : lijnen.join('')} stroke={planken ? '#E6D9C2' : '#E2D5BF'} strokeWidth="1" />
      {type === 'keuken' && aanrechtL > 0 && (
        <g>
          <path
            d={`M${x0} ${y0}H${x0 + aanrechtBoven}V${y0 + diep}${aanrechtRechts > 0 ? `H${x0 + W - diep}V${y0 + diep + aanrechtRechts}H${x0 + W}V${y0}` : `H${x0}Z`}`}
            fill="#EDE3D3"
            stroke="#85796A"
            strokeWidth="1.2"
          />
          {scope.spatwand && (
            <path
              d={`M${x0 + 1} ${y0 + 4}H${x0 + aanrechtBoven}${aanrechtRechts > 0 ? `M${x0 + W - 4} ${y0}V${y0 + diep + aanrechtRechts}` : ''}`}
              stroke="#B8955A"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          )}
          <rect x={x0 + Math.min(aanrechtBoven, W) * 0.3} y={y0 + 10} width={Math.min(0.5 * s, aanrechtBoven * 0.25)} height={diep - 20} rx="4" fill="#FFFDF9" stroke="#85796A" strokeWidth="1" />
          <text x={x0 + Math.min(aanrechtBoven, W) * 0.65} y={y0 + diep / 2 + 4} textAnchor="middle" className="fill-gold-700" fontSize="10.5" fontWeight="600" letterSpacing="1.2">
            AANRECHT
          </text>
        </g>
      )}
      {type === 'vloer' && (
        <text x={x0 + W / 2} y={y0 + H / 2 + 4} textAnchor="middle" className="fill-gold-700" fontSize="11" fontWeight="600" letterSpacing="1.4" stroke="#FFFDF9" strokeWidth="6" paintOrder="stroke">
          {planken ? 'KLIKVLOER' : 'VLOER'}
        </text>
      )}
      {type === 'badkamer' && scope.inloopdouche && (
        <g>
          <rect x={x0 + W - dW} y={y0} width={dW} height={dD} fill="#F4EAD6" />
          <rect x={x0 + W - dW} y={y0} width={dW} height={dD} fill={`url(#${arc})`} />
          <line x1={x0 + W - dW} y1={y0 + dD} x2={x0 + W - dW * 0.15} y2={y0 + dD} stroke="#9C7B43" strokeWidth="3" strokeLinecap="round" />
          <line x1={x0 + W - dW + 10} y1={y0 + 14} x2={x0 + W - 10} y2={y0 + 14} stroke="#B8955A" strokeWidth="3" strokeLinecap="round" />
          <text x={x0 + W - dW / 2} y={y0 + dD / 2 + 4} textAnchor="middle" className="fill-gold-700" fontSize="11" fontWeight="600" letterSpacing="1.2">
            DOUCHE
          </text>
        </g>
      )}
      {(type === 'badkamer' || type === 'toilet') && scope.toilet && (
        <g transform={`translate(${x0 + 8} ${y0 + H * 0.34})`}>
          <rect x="0" y="0" width="12" height="30" rx="3" fill="#EDE3D3" stroke="#85796A" strokeWidth="1.2" />
          <ellipse cx="27" cy="15" rx="15" ry="11" fill="#FFFDF9" stroke="#85796A" strokeWidth="1.2" />
        </g>
      )}
      {scope.fontein && (type === 'toilet' || type === 'badkamer') && (
        <g transform={`translate(${x0 + W - 30} ${y0 + 8})`}>
          <rect x="0" y="0" width="22" height="16" rx="3" fill="#EDE3D3" stroke="#85796A" strokeWidth="1.2" />
          <ellipse cx="11" cy="8.5" rx="6.5" ry="4.5" fill="#FFFDF9" stroke="#85796A" strokeWidth="1" />
        </g>
      )}
      {type === 'badkamer' && scope.wastafelmeubel && (
        <g transform={`translate(${x0 + W - Math.min(0.8 * s, W * 0.4) - 8} ${y0 + H - 34})`}>
          <rect x="0" y="0" width={Math.min(0.8 * s, W * 0.4)} height="26" rx="4" fill="#EDE3D3" stroke="#85796A" strokeWidth="1.2" />
          <ellipse cx={Math.min(0.8 * s, W * 0.4) / 2} cy="14" rx={Math.min(0.8 * s, W * 0.4) / 4} ry="7" fill="#FFFDF9" stroke="#85796A" strokeWidth="1" />
        </g>
      )}
      {/* muren */}
      <path
        d={`M${deurX} ${y0 + H}H${x0}V${y0}H${x0 + W}V${y0 + H}H${deurX + deurW}`}
        fill="none"
        stroke="#2B2620"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {raam && (
        <g>
          <rect x={raamX} y={y0 - 4} width={raamW} height="8" fill="#FFFDF9" />
          <line x1={raamX} y1={y0 - 3} x2={raamX + raamW} y2={y0 - 3} stroke="#2B2620" strokeWidth="1.3" />
          <line x1={raamX} y1={y0 + 3} x2={raamX + raamW} y2={y0 + 3} stroke="#2B2620" strokeWidth="1.3" />
        </g>
      )}
      {deur && (
        <g>
          <line x1={deurX} y1={y0 + H} x2={deurX} y2={y0 + H - deurW} stroke="#2B2620" strokeWidth="2" />
          <path d={`M${deurX} ${y0 + H - deurW}A${deurW} ${deurW} 0 0 1 ${deurX + deurW} ${y0 + H}`} fill="none" stroke="#85796A" strokeWidth="1.2" strokeDasharray="4 4" />
        </g>
      )}
      {schilderWanden && schilderWanden.map((wand) => {
        const kant = wand.zijde
        const d = kant === 'boven' ? `M${x0} ${y0}H${x0 + W}` : kant === 'rechts' ? `M${x0 + W} ${y0}V${y0 + H}` : kant === 'onder' ? `M${x0} ${y0 + H}H${x0 + W}` : `M${x0} ${y0}V${y0 + H}`
        const label = `${kant === 'boven' ? 'A' : kant === 'rechts' ? 'B' : kant === 'onder' ? 'C' : kant === 'links' ? 'D' : 'Plafond'} · ${wand.kleur.code || wand.kleur.naam || 'kleur kiezen'}`
        const tx = kant === 'links' ? x0 + 18 : kant === 'rechts' ? x0 + W - 18 : x0 + W / 2
        const ty = kant === 'boven' ? y0 + 22 : kant === 'onder' ? y0 + H - 16 : y0 + H / 2
        return <g key={kant} role={onWand ? 'button' : undefined} tabIndex={onWand ? 0 : undefined} aria-label={`${kant}: ${kleurTekst(wand.kleur)}`} onClick={() => onWand?.(kant)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onWand?.(kant) } }} style={{ cursor: onWand ? 'pointer' : undefined }}>
          {kant === 'plafond' ? <rect x={x0 + W * .22} y={y0 + H * .3} width={W * .56} height={H * .4} fill={wand.schilderen ? wand.kleur.hex : '#eeeeee'} stroke={geselecteerdeWand === kant ? '#2B2623' : '#bbb'} strokeWidth="2" /> : <><path d={d} stroke={geselecteerdeWand === kant ? '#2B2623' : '#aaa'} strokeWidth="18" fill="none" /><path d={d} stroke={wand.schilderen ? wand.kleur.hex : '#eeeeee'} strokeWidth="12" fill="none" /></>}
          <text x={tx} y={ty} transform={kant === 'links' || kant === 'rechts' ? `rotate(-90 ${tx} ${ty})` : undefined} textAnchor="middle" fontSize="9" fontWeight="600" stroke="#fff" strokeWidth="3" paintOrder="stroke" fill="#2B2623">{label.slice(0, 34)}</text>
        </g>
      })}
      {/* maatlijnen */}
      <g stroke="#B8955A" strokeWidth="1.2">
        <line x1={x0} y1={y0 - 24} x2={x0 + W} y2={y0 - 24} />
        <line x1={x0} y1={y0 - 30} x2={x0} y2={y0 - 18} />
        <line x1={x0 + W} y1={y0 - 30} x2={x0 + W} y2={y0 - 18} />
        <line x1={x0 - 24} y1={y0} x2={x0 - 24} y2={y0 + H} />
        <line x1={x0 - 30} y1={y0} x2={x0 - 18} y2={y0} />
        <line x1={x0 - 30} y1={y0 + H} x2={x0 - 18} y2={y0 + H} />
      </g>
      <g className="fill-gold-700" fontSize="12.5" fontWeight="600">
        <rect x={x0 + W / 2 - 30} y={y0 - 33} width="60" height="18" fill={bg} />
        <text x={x0 + W / 2} y={y0 - 20} textAnchor="middle">{getal(L)} m</text>
        <g transform={`translate(${x0 - 24} ${y0 + H / 2}) rotate(-90)`}>
          <rect x="-30" y="-9" width="60" height="18" fill={bg} />
          <text x="0" y="4.5" textAnchor="middle">{getal(B)} m</text>
        </g>
      </g>
    </svg>
  )
}
