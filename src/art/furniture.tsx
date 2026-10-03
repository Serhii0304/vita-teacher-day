/*
 * Меблі в напівпрофіль (повернуті вправо, спинка ліворуч), розділені на задню і передню частини,
 * щоб персонаж сидів «усередині» крісла: задня частина малюється до персонажа, передня — після.
 */

export function ArmchairBack({ x, y, s = 1, flip = 1, c = '#b86b4b', d = '#934f36', l = '#d08a64' }: { x: number; y: number; s?: number; flip?: number; c?: string; d?: string; l?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      {/* спинка */}
      <path d="M-96 -96 C-108 -150 -104 -232 -82 -262 C-70 -278 -46 -276 -40 -258 C-30 -228 -34 -160 -40 -96 Z" fill={d} />
      <path d="M-86 -100 C-96 -150 -92 -226 -74 -252 C-64 -264 -50 -262 -46 -248 C-38 -222 -42 -160 -48 -100 Z" fill={c} />
      <path d="M-70 -246 C-78 -220 -80 -170 -76 -112" stroke={l} strokeWidth={6} opacity={0.45} fill="none" strokeLinecap="round" />
      {/* дальній підлокітник */}
      <path d="M-70 -150 C-30 -160 60 -160 96 -148 C108 -144 110 -126 98 -120 L-60 -116 Z" fill={d} />
      {/* сидіння */}
      <path d="M-74 -118 C-20 -126 60 -126 98 -116 C112 -112 112 -94 100 -90 L-70 -86 Z" fill={l} />
      <path d="M-72 -92 L102 -94 L98 -50 L-70 -50 Z" fill={c} />
      <path d="M-50 -112 C0 -118 50 -118 90 -110" stroke="#fff" strokeWidth={3} opacity={0.14} fill="none" />
      {/* ніжки */}
      <path d="M-66 -50 l-6 50 h9 l9 -50 Z M88 -50 l6 50 h9 l-4 -50 Z" fill="#5a3a28" />
    </g>
  )
}

export function ArmchairFront({ x, y, s = 1, flip = 1, c = '#b86b4b', d = '#934f36', l = '#d08a64' }: { x: number; y: number; s?: number; flip?: number; c?: string; d?: string; l?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      {/* ближній підлокітник і бокова панель */}
      <path d="M-84 -132 C-60 -146 70 -146 104 -134 C122 -128 124 -104 108 -98 L102 -46 L-80 -46 Z" fill={c} />
      <path d="M-84 -132 C-60 -146 70 -146 104 -134 C116 -130 120 -118 114 -110 C80 -122 -50 -122 -84 -112 Z" fill={l} />
      <path d="M-80 -60 H102" stroke={d} strokeWidth={4} opacity={0.6} />
      <path d="M-74 -46 l-6 46 h9 l9 -46 Z M92 -46 l6 46 h9 l-4 -46 Z" fill="#5a3a28" />
    </g>
  )
}

/** Дерев’яний стілець для письмового столу (напівпрофіль). */
export function DeskChairBack({ x, y, s = 1, flip = 1 }: { x: number; y: number; s?: number; flip?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      <path d="M-60 -250 C-66 -200 -66 -150 -62 -96 L-48 -96 C-52 -150 -52 -200 -46 -250 Z" fill="#7a5236" />
      <path d="M-62 -236 C-40 -244 -10 -244 6 -238 L4 -196 C-14 -202 -40 -202 -60 -196 Z" fill="#8a5d3b" />
      <path d="M-66 -100 C-20 -106 50 -106 74 -100 L70 -86 L-64 -84 Z" fill="#9a6a44" />
      <path d="M-58 -86 l-4 86 h8 l6 -86 Z M60 -86 l6 86 h8 l-6 -86 Z" fill="#6b4630" />
    </g>
  )
}

export function WritingDesk({ x, y, s = 1, flip = 1 }: { x: number; y: number; s?: number; flip?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      <rect x={-130} y={-150} width={260} height={16} rx={4} fill="#9a6a44" />
      <rect x={-130} y={-136} width={260} height={8} fill="#7a5236" />
      <rect x={-118} y={-128} width={14} height={128} fill="#8a5d3b" />
      <rect x={104} y={-128} width={14} height={128} fill="#7a5236" />
      <rect x={20} y={-128} width={84} height={46} rx={3} fill="#8a5d3b" />
      <circle cx={62} cy={-105} r={3} fill="#e2c08a" />
    </g>
  )
}
