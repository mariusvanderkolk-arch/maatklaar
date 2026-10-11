/** Rustige illustratie in de stijl van het huislogo (beige, zacht goud): huis met plattegrond, meetlint en tegels. */
export function HuisIllustratie({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Illustratie: huis met plattegrond en meetlint" fill="none">
      <defs>
        <linearGradient id="hi-goud" x1="60" y1="20" x2="260" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D9C08A" />
          <stop offset="1" stopColor="#B08D52" />
        </linearGradient>
        <radialGradient id="hi-gloed" cx="160" cy="110" r="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F3E7CC" stopOpacity="0.9" />
          <stop offset="1" stopColor="#F8F4ED" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="110" rx="150" ry="95" fill="url(#hi-gloed)" />
      <path d="M40 182h240" stroke="#E6DccB" strokeWidth="2" strokeLinecap="round" />
      {/* huis */}
      <path d="M104 92 160 44l56 48v78a8 8 0 0 1-8 8h-96a8 8 0 0 1-8-8Z" fill="#FBF6EC" />
      <path d="M104 96v74a8 8 0 0 0 8 8h96a8 8 0 0 0 8-8V96" stroke="url(#hi-goud)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M196 62V46h10v26" stroke="url(#hi-goud)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M88 104 160 42l72 62" stroke="url(#hi-goud)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      {/* tegelraster in het huis */}
      <g stroke="#E3D3AE" strokeWidth="1.5">
        <rect x="122" y="104" width="40" height="40" rx="3" fill="#F6EEDC" />
        <path d="M135.3 104v40M148.6 104v40M122 117.3h40M122 130.6h40" />
      </g>
      <path d="M174 178v-30a10 10 0 0 1 20 0v30Z" fill="url(#hi-goud)" />
      {/* meetlint */}
      <g transform="translate(232 128)">
        <rect x="0" y="0" width="44" height="44" rx="12" fill="#FBF6EC" stroke="url(#hi-goud)" strokeWidth="4" />
        <circle cx="22" cy="22" r="7" stroke="url(#hi-goud)" strokeWidth="3" />
        <path d="M44 34h18v10H44" fill="#F3E7CC" stroke="url(#hi-goud)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M50 34v4M55 34v6M60 34v4" stroke="#B08D52" strokeWidth="1.5" />
      </g>
      {/* plattegrondvel */}
      <g transform="translate(34 118) rotate(-6)">
        <rect width="58" height="46" rx="5" fill="#FFFDF8" stroke="#E3D3AE" strokeWidth="2" />
        <path d="M10 10h38v26H10Z" stroke="url(#hi-goud)" strokeWidth="2.5" />
        <path d="M29 10v12M10 24h10" stroke="url(#hi-goud)" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* sterretjes */}
      <path d="M252 62l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#D9C08A" />
      <path d="M70 70l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2Z" fill="#E3D3AE" />
    </svg>
  )
}
