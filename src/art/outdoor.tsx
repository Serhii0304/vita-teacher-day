import { useId, useMemo } from 'react'
import { hash } from '../engine/math'

/*
 * Елементи осіннього простору: квіткові клумби (хризантеми, чорнобривці, айстри), кущ калини,
 * паркан, ліхтар, лавка, круглий столик, гірлянда лампочок, будівля школи (без назви).
 */

const CHRYS = [
  ['#f2c14e', '#d99a2b'],
  ['#e9874a', '#c4683a'],
  ['#f6ead6', '#d9c3a3'],
  ['#d9a3a8', '#b97a80'],
]

/** Кущ хризантем / чорнобривців: купка квіткових голівок над темним листям. */
export function FlowerBush({ x, y, s = 1, seed = 1, palette = 0, count = 9 }: { x: number; y: number; s?: number; seed?: number; palette?: number; count?: number }) {
  const heads = useMemo(() => {
    const out: { x: number; y: number; r: number; c: string[] }[] = []
    for (let i = 0; i < count; i++) {
      const h = (k: number) => hash(seed * 17.3 + i * 4.1 + k)
      out.push({ x: (h(1) - 0.5) * 110, y: -30 - h(2) * 44, r: 9 + h(3) * 6, c: CHRYS[(palette + Math.floor(h(4) * 2)) % CHRYS.length] })
    }
    return out.sort((a, b) => a.y - b.y)
  }, [seed, palette, count])
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={-18} rx={70} ry={30} fill="#4f6b4b" />
      <ellipse cx={-24} cy={-26} rx={36} ry={20} fill="#5f7d58" />
      <ellipse cx={26} cy={-24} rx={34} ry={18} fill="#58744f" />
      {heads.map((hd, i) => (
        <g key={i} transform={`translate(${hd.x.toFixed(1)} ${hd.y.toFixed(1)})`}>
          <circle r={hd.r} fill={hd.c[1]} />
          <circle r={hd.r * 0.78} fill={hd.c[0]} />
          <path
            d={Array.from({ length: 8 }, (_, j) => {
              const a = (j / 8) * Math.PI * 2
              return `M${Math.cos(a) * hd.r * 0.25} ${Math.sin(a) * hd.r * 0.25} L${Math.cos(a) * hd.r * 0.9} ${Math.sin(a) * hd.r * 0.9}`
            }).join(' ')}
            fill="none"
            stroke={hd.c[1]}
            strokeWidth={1.2}
            opacity={0.6}
          />
          <circle r={hd.r * 0.22} fill={hd.c[1]} />
        </g>
      ))}
    </g>
  )
}

/** Кущ калини з червоними гронами. */
export function KalynaBush({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const berries: [number, number][] = [
    [-40, -120],
    [-34, -112],
    [-46, -110],
    [-38, -102],
    [30, -140],
    [38, -132],
    [24, -130],
    [32, -122],
    [0, -170],
    [8, -162],
    [-6, -160],
  ]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C-6 -60 -30 -100 -44 -118 M0 0 C4 -70 22 -110 34 -136 M0 0 C2 -80 -2 -130 2 -168" stroke="#6b4a35" strokeWidth={5} fill="none" />
      <g fill="#6f8f5f">
        <ellipse cx={-60} cy={-96} rx={30} ry={18} transform="rotate(-20 -60 -96)" />
        <ellipse cx={50} cy={-110} rx={30} ry={18} transform="rotate(20 50 -110)" />
        <ellipse cx={-20} cy={-150} rx={26} ry={16} transform="rotate(-30 -20 -150)" />
        <ellipse cx={24} cy={-176} rx={22} ry={14} transform="rotate(30 24 -176)" />
        <ellipse cx={-4} cy={-70} rx={34} ry={20} />
      </g>
      <g fill="#c0332c">
        {berries.map(([bx, by], i) => (
          <circle key={i} cx={bx} cy={by} r={6.5} />
        ))}
      </g>
      <g fill="#fff" opacity={0.45}>
        {berries.map(([bx, by], i) => (
          <circle key={i} cx={bx - 2} cy={by - 2} r={1.6} />
        ))}
      </g>
    </g>
  )
}

export function Fence({ x0, x1, y, h = 70, color = '#efe3cf' }: { x0: number; x1: number; y: number; h?: number; color?: string }) {
  const n = Math.floor((x1 - x0) / 34)
  return (
    <g>
      <rect x={x0} y={y - h * 0.72} width={x1 - x0} height={7} fill={color} opacity={0.9} />
      <rect x={x0} y={y - h * 0.3} width={x1 - x0} height={7} fill={color} opacity={0.9} />
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${x0 + i * 34 + 10} ${y} v${-h + 8} l7 -10 l7 10 v${h - 8} Z`} fill={color} />
      ))}
    </g>
  )
}

/** Будівля школи: світлий фасад, високі вікна з теплим світлом, ганок. Без назв і табличок. */
export function SchoolFacade({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const cols = Math.floor(w / 150)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#e8d3b4" />
      <rect x={x} y={y} width={w} height={h} fill="#c78a5e" opacity={0.12} />
      <path d={`M${x - 30} ${y} L${x + w / 2} ${y - 120} L${x + w + 30} ${y} Z`} fill="#a85d3f" />
      <path d={`M${x - 30} ${y} H${x + w + 30} v14 H${x - 30} Z`} fill="#8a4a32" />
      {Array.from({ length: cols }, (_, i) => {
        const wx = x + 50 + i * (w - 100) / Math.max(1, cols - 1) - 36
        return (
          <g key={i}>
            {[0, 1].map((r) => (
              <g key={r} transform={`translate(${wx} ${y + 70 + r * (h * 0.42)})`}>
                <path d="M0 110 V30 A36 30 0 0 1 72 30 V110 Z" fill="#f4e7cf" />
                <path d="M6 106 V32 A30 25 0 0 1 66 32 V106 Z" fill="#f2c27a" opacity={0.75} />
                <path d="M36 6 V106 M6 60 H66" stroke="#f4e7cf" strokeWidth={4} />
              </g>
            ))}
          </g>
        )
      })}
      {/* ганок */}
      <rect x={x + w / 2 - 80} y={y + h - 150} width={160} height={150} fill="#d9bf98" />
      <path d={`M${x + w / 2 - 50} ${y + h} V${y + h - 110} A50 40 0 0 1 ${x + w / 2 + 50} ${y + h - 110} V${y + h} Z`} fill="#6b4a35" />
      <path d={`M${x + w / 2 - 110} ${y + h} h220 v12 h-220 Z M${x + w / 2 - 130} ${y + h + 12} h260 v12 h-260 Z`} fill="#cdb38d" />
    </g>
  )
}

export function Bench({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-150 -170 h300 v16 h-300 Z M-150 -146 h300 v16 h-300 Z" fill="#9a6a44" />
      <path d="M-150 -96 h300 v14 h-300 Z" fill="#a8744a" />
      <path d="M-150 -82 h300 v10 h-300 Z" fill="#8a5d3b" />
      <path d="M-134 -176 v176 M134 -176 v176" stroke="#3e3a36" strokeWidth={10} strokeLinecap="round" />
      <path d="M-140 -40 h40 M100 -40 h40" stroke="#3e3a36" strokeWidth={8} strokeLinecap="round" />
    </g>
  )
}

/** Невеликий круглий столик (для двох чашок). */
export function CafeTable({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={-112} rx={64} ry={11} fill="#efe3cf" />
      <path d="M-64 -112 v6 a64 11 0 0 0 128 0 v-6" fill="#d8c7a8" />
      <path d="M0 -104 V-6 M-30 0 L0 -12 L30 0" stroke="#4a4540" strokeWidth={6} fill="none" strokeLinecap="round" />
    </g>
  )
}

/** Чашка на столі (статична), з парою. */
export function TableCup({ x, y, color = '#c46b45', steamRef }: { x: number; y: number; color?: string; steamRef?: (el: SVGGElement | null) => void }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g ref={steamRef} opacity={0.6}>
        <path d="M-3 -24 c-5 -6 5 -10 0 -16" stroke="#fffaf0" strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M4 -24 c-5 -6 5 -10 0 -16" stroke="#fffaf0" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </g>
      <ellipse cx={0} cy={0} rx={15} ry={3} fill="#d9c8b1" />
      <path d="M-9 -20 h18 l-1.6 16 c-0.4 2.2 -2 3.4 -4 3.4 h-6.8 c-2 0 -3.6 -1.2 -4 -3.4 Z" fill="#f3e8d8" />
      <path d="M-8.6 -12 h17.2 l-0.3 3 h-16.6 Z" fill={color} opacity={0.85} />
      <path d="M9 -16 c6 0 7 8 0.6 9.6" fill="none" stroke="#efe3d1" strokeWidth={2.6} />
    </g>
  )
}

/** Гірлянда теплих лампочок; glowRef — сяйво (вмикається). */
export function StringLights({ x0, x1, y, sag = 60, n = 14, glowRef }: { x0: number; x1: number; y: number; sag?: number; n?: number; glowRef?: (el: SVGGElement | null) => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const pts = Array.from({ length: n }, (_, i) => {
    const u = (i + 0.5) / n
    const x = x0 + (x1 - x0) * u
    const yy = y + sag * 4 * u * (1 - u)
    return [x, yy]
  })
  return (
    <g>
      <defs>
        <radialGradient id={`bulb-glow-${uid}`}>
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffcf70" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={`M${x0} ${y} Q${(x0 + x1) / 2} ${y + sag * 2} ${x1} ${y}`} stroke="#3e3a36" strokeWidth={2} fill="none" />
      <g ref={glowRef} opacity={0}>
        {pts.map(([x, yy], i) => (
          <circle key={i} cx={x} cy={yy + 8} r={26} fill={`url(#bulb-glow-${uid})`} />
        ))}
      </g>
      {pts.map(([x, yy], i) => (
        <g key={i}>
          <rect x={x - 2} y={yy - 2} width={4} height={6} fill="#4a4540" />
          <ellipse cx={x} cy={yy + 9} rx={5} ry={6.5} fill="#ffe6b0" />
        </g>
      ))}
    </g>
  )
}

/** Вуличний ліхтар (для вечірньої вулиці). */
export function StreetLamp({ x, y, s = 1, glowRef }: { x: number; y: number; s?: number; glowRef?: (el: SVGGElement | null) => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <radialGradient id={`slamp-glow-${uid}`}>
          <stop offset="0" stopColor="#ffd88a" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffd88a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g ref={glowRef}>
        <circle cx={0} cy={-300} r={150} fill={`url(#slamp-glow-${uid})`} />
      </g>
      <path d="M-5 0 V-290 M5 0 V-290" stroke="#2f3236" strokeWidth={6} />
      <path d="M-20 -290 h40 l-8 -40 h-24 Z" fill="#2f3236" />
      <path d="M-14 -296 h28 l-6 -28 h-16 Z" fill="#ffe2a0" />
      <path d="M-26 0 h52 l-8 -18 h-36 Z" fill="#2f3236" />
    </g>
  )
}
