import { useId, type ReactNode, type Ref } from 'react'
import { AutumnTree } from './common'

/*
 * Інтер’єрні елементи для класу, вечірньої кімнати та кімнати героя.
 * Без дрібних «зірок»: усі декоративні мотиви — листя, калина, ромбики, кола.
 */

/** Вікно: рама, шибки, підвіконня; вид за вікном передається через children (обрізається шибками). */
export function RoomWindow({
  id,
  x,
  y,
  w,
  h,
  frame = '#f4ead8',
  frameShade = '#d8c7a8',
  cols = 3,
  rows = 3,
  children,
  glassRef,
  part = 'all',
}: {
  part?: 'all' | 'view' | 'frame'
  id: string
  x: number
  y: number
  w: number
  h: number
  frame?: string
  frameShade?: string
  cols?: number
  rows?: number
  children?: ReactNode
  glassRef?: Ref<SVGGElement>
}) {
  const b = 16
  const mull = 8
  const ix = x + b
  const iy = y + b
  const iw = w - 2 * b
  const ih = h - 2 * b
  const cw = (iw - (cols - 1) * mull) / cols
  const chh = (ih - (rows - 1) * mull) / rows
  const panes: ReactNode[] = []
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) panes.push(<rect key={`${c}-${r}`} x={ix + c * (cw + mull)} y={iy + r * (chh + mull)} width={cw} height={chh} />)
  // part: 'view' — лише вид за склом; 'frame' — скло, рама й підвіконня. Так між ними можна вставити
  // окремий шар листопаду (рама лишається поверх листя, як і раніше).
  return (
    <g>
      {part !== 'frame' && (
        <>
          <defs>
            <clipPath id={`${id}-clip`}>{panes}</clipPath>
            <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          {/* відкіс */}
          <rect x={x - 14} y={y - 14} width={w + 28} height={h + 22} fill="#000" opacity={0.08} rx={6} />
          <g clipPath={`url(#${id}-clip)`}>{children}</g>
        </>
      )}
      {part !== 'view' && (
        <>
          <g clipPath={`url(#${id}-clip)`}>
            <g ref={glassRef}>
              <rect x={ix} y={iy} width={iw} height={ih} fill={`url(#${id}-glass)`} />
            </g>
          </g>
          {/* рама */}
          <path d={`M${x} ${y}h${w}v${h}h${-w}Z M${ix} ${iy}v${ih}h${iw}v${-ih}Z`} fill={frame} fillRule="evenodd" />
          {Array.from({ length: cols - 1 }, (_, i) => (
            <rect key={`v${i}`} x={ix + (i + 1) * cw + i * mull} y={iy} width={mull} height={ih} fill={frame} />
          ))}
          {Array.from({ length: rows - 1 }, (_, i) => (
            <rect key={`h${i}`} x={ix} y={iy + (i + 1) * chh + i * mull} width={iw} height={mull} fill={frame} />
          ))}
          <rect x={x} y={y + h - 4} width={w} height={4} fill={frameShade} />
          {/* підвіконня */}
          <path d={`M${x - 30} ${y + h} h${w + 60} l-12 18 h${-w - 36} Z`} fill={frame} />
          <path d={`M${x - 18} ${y + h + 18} h${w + 36} v6 h${-w - 36} Z`} fill={frameShade} />
        </>
      )}
    </g>
  )
}

/** Внутрішній прямокутник шибок вікна (для обрізання шару листопаду). */
export function windowPanes(x: number, y: number, w: number, h: number) {
  return { x: x + 16, y: y + 16, w: w - 32, h: h - 32 }
}

/** Вид за вікном удень: тепле небо, осіннє дерево, далекий шкільний двір. */
export function DayView({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <g>
      <defs>
        <linearGradient id={`dayview-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9cc1cf" />
          <stop offset="0.55" stopColor="#d9e1d4" />
          <stop offset="1" stopColor="#f3d9a6" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#dayview-sky-${uid})`} />
      <ellipse cx={x + w * 0.25} cy={y + h * 0.2} rx={w * 0.5} ry={h * 0.25} fill="#fff6dc" opacity={0.45} />
      {/* далекі дахи та паркан шкільного двору */}
      <path d={`M${x} ${y + h * 0.78} L${x + w * 0.2} ${y + h * 0.7} L${x + w * 0.38} ${y + h * 0.76} L${x + w * 0.6} ${y + h * 0.68} L${x + w} ${y + h * 0.75} V${y + h} H${x} Z`} fill="#c7b9a0" opacity={0.75} />
      <rect x={x} y={y + h * 0.86} width={w} height={h * 0.14} fill="#cbb48a" />
      <g stroke="#9b8466" strokeWidth={3} opacity={0.6}>
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1={x + 10 + i * (w / 14)} x2={x + 10 + i * (w / 14)} y1={y + h * 0.8} y2={y + h * 0.88} />
        ))}
        <line x1={x} x2={x + w} y1={y + h * 0.82} y2={y + h * 0.82} />
      </g>
      <AutumnTree x={x + w * 0.62} y={y + h * 1.02} s={1.25} seed={3} />
      <AutumnTree x={x + w * 0.08} y={y + h * 1.06} s={0.95} seed={8} palette={['#e8b64e', '#d9952f', '#efc86a', '#c97b2e']} />
    </g>
  )
}

/** Вид за вікном увечері: бірюзово-бузкове небо, захід, дерево проти світла, теплі вікна далеких будинків. */
export function EveningView({ x, y, w, h, gref }: { x: number; y: number; w: number; h: number; gref?: Ref<SVGGElement> }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <g ref={gref}>
      <defs>
        <linearGradient id={`eveview-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d4a5c" />
          <stop offset="0.45" stopColor="#5e6f86" />
          <stop offset="0.78" stopColor="#c98a7a" />
          <stop offset="1" stopColor="#efb37a" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#eveview-sky-${uid})`} />
      <circle cx={x + w * 0.78} cy={y + h * 0.26} r={9} fill="#f7ecd6" opacity={0.9} />
      <circle cx={x + w * 0.78} cy={y + h * 0.26} r={26} fill="#f7ecd6" opacity={0.12} />
      <path d={`M${x} ${y + h * 0.74} h${w * 0.18} v${-h * 0.12} h${w * 0.14} v${h * 0.06} h${w * 0.2} v${-h * 0.16} h${w * 0.16} v${h * 0.1} h${w * 0.32} V${y + h} H${x} Z`} fill="#2c3440" opacity={0.85} />
      <g fill="#f3c27a">
        <rect x={x + w * 0.24} y={y + h * 0.66} width={8} height={10} opacity={0.9} />
        <rect x={x + w * 0.56} y={y + h * 0.62} width={8} height={10} opacity={0.8} />
        <rect x={x + w * 0.6} y={y + h * 0.7} width={8} height={10} opacity={0.7} />
        <rect x={x + w * 0.86} y={y + h * 0.76} width={8} height={10} opacity={0.85} />
      </g>
      <AutumnTree x={x + w * 0.66} y={y + h * 1.04} s={1.25} seed={3} palette={['#8a5a3a', '#a46a3c', '#6f4a34', '#b8763f']} trunk="#3a2a22" />
    </g>
  )
}

export function Curtain({ x, y, h, w = 90, side, color = '#efe0c9', shade = '#d6c0a0' }: { x: number; y: number; h: number; w?: number; side: 'left' | 'right'; color?: string; shade?: string }) {
  const s = side === 'left' ? 1 : -1
  return (
    <g transform={`translate(${x} ${y}) scale(${s} 1)`}>
      <path d={`M0 0 H${w} C${w * 0.7} ${h * 0.3} ${w * 0.45} ${h * 0.5} ${w * 0.5} ${h * 0.58} C${w * 0.6} ${h * 0.7} ${w * 0.75} ${h * 0.85} ${w * 0.8} ${h} H0 Z`} fill={color} />
      <path d={`M${w * 0.25} 0 C${w * 0.22} ${h * 0.3} ${w * 0.2} ${h * 0.6} ${w * 0.28} ${h}`} stroke={shade} strokeWidth={6} fill="none" opacity={0.6} />
      <path d={`M${w * 0.55} 0 C${w * 0.45} ${h * 0.25} ${w * 0.32} ${h * 0.45} ${w * 0.4} ${h * 0.58}`} stroke={shade} strokeWidth={5} fill="none" opacity={0.5} />
      <path d={`M${w * 0.32} ${h * 0.56} q${w * 0.2} ${-10} ${w * 0.36} 4`} stroke="#c98a5a" strokeWidth={6} fill="none" strokeLinecap="round" />
    </g>
  )
}

export function PottedPlant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill="#6f8f68">
        <path d="M0 -40 C-30 -70 -50 -60 -60 -90 C-30 -90 -10 -70 0 -44 Z" />
        <path d="M0 -40 C20 -80 40 -80 56 -110 C30 -110 6 -84 0 -46 Z" />
        <path d="M0 -40 C-6 -80 -2 -110 -14 -130 C8 -120 10 -90 2 -44 Z" fill="#82a37a" />
        <path d="M0 -40 C30 -56 50 -50 70 -66 C50 -76 26 -64 2 -42 Z" fill="#5d7d58" />
      </g>
      <path d="M-26 -42 H26 L20 0 H-20 Z" fill="#c46b45" />
      <path d="M-28 -46 H28 V-38 H-28 Z" fill="#d9825a" />
    </g>
  )
}

export function Books({ x, y, s = 1, colors = ['#2f5b5d', '#c46b45', '#d9b26a', '#8e6d8c', '#6f8f68'] }: { x: number; y: number; s?: number; colors?: string[] }) {
  const ws = [16, 12, 18, 14, 20]
  const hs = [60, 52, 66, 48, 58]
  let cx = 0
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {ws.map((w, i) => {
        const el = (
          <g key={i}>
            <rect x={cx} y={-hs[i]} width={w} height={hs[i]} fill={colors[i % colors.length]} />
            <rect x={cx + 2} y={-hs[i] + 8} width={w - 4} height={3} fill="#f4e6c8" opacity={0.6} />
          </g>
        )
        cx += w + 1
        return el
      })}
      <g transform={`translate(${cx + 6} 0) rotate(-14)`}>
        <rect x={0} y={-56} width={16} height={56} fill="#b9783c" />
      </g>
    </g>
  )
}

/** Шкільна дошка з крейдяними малюнками (сонце, листя, слово «Осінь»). glowRef — шар, що «оживає». */
export function ChalkBoard({ x, y, w, h, glowRef, chalkRef }: { x: number; y: number; w: number; h: number; glowRef?: Ref<SVGGElement>; chalkRef?: Ref<SVGGElement> }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <g>
      <defs>
        <linearGradient id={`board-g-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#35524a" />
          <stop offset="1" stopColor="#273e38" />
        </linearGradient>
        <radialGradient id={`board-sun-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff2c4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff2c4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={x - 16} y={y - 16} width={w + 32} height={h + 32} rx={6} fill="#8a5d3b" />
      <rect x={x} y={y} width={w} height={h} fill={`url(#board-g-${uid})`} />
      <rect x={x} y={y} width={w} height={h} fill="#fff" opacity={0.03} />
      <path d={`M${x + 20} ${y + h * 0.3} q${w * 0.2} -30 ${w * 0.45} 10`} stroke="#fff" strokeWidth={10} opacity={0.04} fill="none" />
      {/* полиця для крейди */}
      <rect x={x - 6} y={y + h + 12} width={w + 12} height={10} rx={3} fill="#7a5236" />
      <rect x={x + w * 0.2} y={y + h + 6} width={26} height={7} rx={3} fill="#f5f1e6" />
      <rect x={x + w * 0.24} y={y + h + 7} width={18} height={6} rx={3} fill="#f2c7c0" />
      <g ref={chalkRef} fill="none" stroke="#f3efe2" strokeLinecap="round" strokeLinejoin="round">
        {/* сонце: коло з короткими променями */}
        <g transform={`translate(${x + w * 0.16} ${y + h * 0.3})`}>
          <g ref={glowRef} opacity={0}>
            <circle r={70} fill={`url(#board-sun-${uid})`} stroke="none" />
          </g>
          <circle r={26} strokeWidth={3.4} opacity={0.85} />
          <g strokeWidth={3} opacity={0.75}>
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2
              return <line key={i} x1={Math.cos(a) * 34} y1={Math.sin(a) * 34} x2={Math.cos(a) * 46} y2={Math.sin(a) * 46} />
            })}
          </g>
          <path d="M-9 -4 v1 M9 -4 v1 M-10 7 q10 9 20 0" strokeWidth={2.6} opacity={0.8} />
        </g>
        {/* листя */}
        <g opacity={0.8} strokeWidth={2.6}>
          <path d={`M${x + w * 0.44} ${y + h * 0.66} c-24 -14 -22 -46 6 -58 c18 22 14 46 -6 58 Z M${x + w * 0.44} ${y + h * 0.66} l4 -50`} stroke="#f1c27a" />
          <path d={`M${x + w * 0.54} ${y + h * 0.78} c-18 -18 -10 -46 18 -50 c8 26 0 44 -18 50 Z M${x + w * 0.54} ${y + h * 0.78} l14 -44`} stroke="#ef9f74" />
          <path d={`M${x + w * 0.35} ${y + h * 0.82} c-6 -24 12 -40 32 -36 c-2 24 -14 34 -32 36 Z`} stroke="#f3e08a" />
        </g>
        {/* слово «Осінь» крейдою */}
        <text x={x + w * 0.62} y={y + h * 0.36} fill="#f3efe2" stroke="none" opacity={0.86} fontFamily="'Marck Script', cursive" fontSize={64}>
          Осінь
        </text>
        <path d={`M${x + w * 0.62} ${y + h * 0.43} q${w * 0.12} 12 ${w * 0.3} -4`} strokeWidth={2.4} opacity={0.6} />
        {/* хвиляста лінія і квітка-ромашка */}
        <path d={`M${x + w * 0.66} ${y + h * 0.72} q20 -16 40 0 t40 0 t40 0`} strokeWidth={2.4} opacity={0.5} />
        <g transform={`translate(${x + w * 0.86} ${y + h * 0.7})`} strokeWidth={2.2} opacity={0.7}>
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx={0} cy={-11} rx={4.5} ry={9} transform={`rotate(${i * 45})`} />
          ))}
          <circle r={4} />
        </g>
      </g>
    </g>
  )
}

/** Гірлянда дитячих малюнків (папір на мотузці). */
export function KidsDrawings({ x, y, w, n = 6, gref }: { x: number; y: number; w: number; n?: number; gref?: Ref<SVGGElement> }) {
  const papers = ['#fff8ea', '#fdf1dd', '#f9f4ff', '#fff3e8', '#f2faf2', '#fff8ea']
  const step = w / n
  return (
    <g ref={gref}>
      <path d={`M${x - 20} ${y} Q${x + w / 2} ${y + 40} ${x + w + 20} ${y}`} stroke="#8a6a4e" strokeWidth={2} fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const px = x + step * (i + 0.5)
        const sag = 40 * (1 - Math.pow((px - (x + w / 2)) / (w / 2 + 20), 2))
        const py = y + sag - 4
        const rot = (i % 2 ? 1 : -1) * (3 + (i % 3))
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${rot})`}>
            <rect x={-32} y={0} width={64} height={80} fill={papers[i % papers.length]} />
            <rect x={-6} y={-6} width={12} height={10} fill="#d9b26a" opacity={0.8} />
            <Drawing kind={i} />
          </g>
        )
      })}
    </g>
  )
}

function Drawing({ kind }: { kind: number }) {
  switch (kind % 6) {
    case 0: // будиночок і сонце
      return (
        <g>
          <circle cx={18} cy={18} r={8} fill="#f2b84a" />
          <path d="M-18 60 V40 L-4 28 L10 40 V60 Z" fill="#e07a5a" />
          <rect x={-8} y={46} width={8} height={14} fill="#7a5236" />
          <path d="M-26 62 H26" stroke="#6f8f68" strokeWidth={4} />
        </g>
      )
    case 1: // дерево
      return (
        <g>
          <rect x={-3} y={40} width={6} height={24} fill="#8a5d3b" />
          <circle cx={0} cy={32} r={18} fill="#e8a33c" />
          <circle cx={-10} cy={28} r={8} fill="#d2742e" />
          <circle cx={10} cy={24} r={7} fill="#f0c95e" />
        </g>
      )
    case 2: // калина
      return (
        <g>
          <path d="M-14 20 Q0 34 4 62" stroke="#6f8f68" strokeWidth={3} fill="none" />
          <ellipse cx={-14} cy={24} rx={9} ry={5} fill="#6f8f68" transform="rotate(-30 -14 24)" />
          {[
            [6, 30],
            [12, 36],
            [2, 38],
            [9, 44],
            [16, 43],
            [4, 47],
          ].map(([cx, cy], j) => (
            <circle key={j} cx={cx} cy={cy} r={4.5} fill="#c8352c" />
          ))}
        </g>
      )
    case 3: // квітка
      return (
        <g>
          <path d="M0 64 V36" stroke="#6f8f68" strokeWidth={3} />
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse key={i} cx={0} cy={22} rx={5} ry={10} fill="#c98bb9" transform={`rotate(${i * 51} 0 32)`} />
          ))}
          <circle cx={0} cy={32} r={5} fill="#f2c25e" />
        </g>
      )
    case 4: // веселка і хмаринка
      return (
        <g fill="none" strokeWidth={5}>
          <path d="M-22 52 A22 22 0 0 1 22 52" stroke="#e07a5a" />
          <path d="M-16 52 A16 16 0 0 1 16 52" stroke="#f2b84a" />
          <path d="M-10 52 A10 10 0 0 1 10 52" stroke="#6f8f68" />
          <ellipse cx={14} cy={24} rx={12} ry={7} fill="#cfdfe8" stroke="none" />
        </g>
      )
    default: // листочок і серединка-сонечко
      return (
        <g>
          <path d="M-14 58 C-24 34 -4 16 16 18 C18 40 4 56 -14 58 Z" fill="#e2a640" />
          <path d="M-14 58 L12 22" stroke="#9e5a24" strokeWidth={2} />
        </g>
      )
  }
}

export function TeacherDesk({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={20} rx={4} fill="#a8744a" />
      <rect x={x} y={y + 16} width={w} height={6} fill="#8a5d3b" />
      <rect x={x + 14} y={y + 22} width={w * 0.32} height={140} fill="#9a6a44" />
      <rect x={x + w - 26} y={y + 22} width={12} height={140} fill="#8a5d3b" />
      <rect x={x + 26} y={y + 40} width={w * 0.24} height={36} rx={3} fill="#a8744a" />
      <circle cx={x + 26 + w * 0.12} cy={y + 58} r={3.5} fill="#e2c08a" />
    </g>
  )
}

export function Globe({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-18 0 H18 L12 -8 H-12 Z" fill="#6b4a35" />
      <rect x={-2} y={-24} width={4} height={18} fill="#6b4a35" />
      <circle cx={0} cy={-52} r={30} fill="#7fa6b3" />
      <path d="M-20 -66 C-10 -72 4 -70 8 -60 C2 -52 -12 -56 -20 -48 C-26 -54 -24 -62 -20 -66 Z M6 -40 C14 -44 22 -40 24 -32 C16 -26 8 -30 6 -40 Z" fill="#c7b27a" />
      <path d="M-34 -52 A34 34 0 0 1 2 -86" fill="none" stroke="#a87d4a" strokeWidth={3} />
      <circle cx={-8} cy={-62} r={10} fill="#fff" opacity={0.18} />
    </g>
  )
}

export function Armchair({ x, y, s = 1, color = '#b86b4b', shade = '#97553a', light = '#cf8461' }: { x: number; y: number; s?: number; color?: string; shade?: string; light?: string }) {
  // кріcло, звернене вправо: спинка ліворуч, сидіння посередині
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-86 -238 C-96 -232 -100 -200 -98 -150 L-96 -40 L-62 -40 L-56 -150 C-54 -190 -60 -222 -66 -236 C-72 -244 -80 -244 -86 -238 Z" fill={shade} />
      <path d="M-80 -232 C-86 -220 -88 -190 -86 -150 L-84 -60 L-62 -60 L-58 -150 C-56 -190 -60 -216 -66 -230 Z" fill={color} />
      <path d="M-96 -110 C-60 -112 40 -112 76 -106 C90 -104 92 -84 86 -74 L-92 -70 Z" fill={light} />
      <path d="M-96 -82 L90 -78 L84 -40 L-92 -40 Z" fill={color} />
      <path d="M-104 -150 C-116 -150 -120 -136 -116 -122 L-110 -40 L-88 -40 L-86 -126 C-86 -142 -94 -150 -104 -150 Z" fill={light} />
      <path d="M68 -126 C82 -126 92 -118 92 -104 L88 -40 L66 -40 L62 -110 C62 -120 64 -126 68 -126 Z" fill={light} />
      <rect x={-96} y={-42} width={186} height={14} rx={4} fill={shade} />
      <path d="M-86 -28 l-6 28 h8 l8 -28 Z M76 -28 l6 28 h8 l-4 -28 Z" fill="#5a3a28" />
      <path d="M-40 -100 C0 -104 40 -104 70 -100" stroke="#fff" strokeWidth={3} opacity={0.12} fill="none" />
    </g>
  )
}

export function SideTable({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={-128} rx={56} ry={10} fill="#9a6a44" />
      <rect x={-56} y={-128} width={112} height={8} fill="#8a5d3b" />
      <path d="M-6 -120 L-10 -10 L-34 0 M6 -120 L10 -10 L34 0 M0 -120 V0" stroke="#7a5236" strokeWidth={7} strokeLinecap="round" fill="none" />
    </g>
  )
}

/** Сяйво настільної лампи (у системі координат лампи: центр абажура над точкою (0, −110)). */
export function LampGlow() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <>
      <defs>
        <radialGradient id={`lamp-glow-${uid}`}>
          <stop offset="0" stopColor="#ffd98f" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#ffc56a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffb44f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={-110} rx={420} ry={340} fill={`url(#lamp-glow-${uid})`} />
    </>
  )
}

/** Настільна лампа; glowRef — сяйво (вмикається анімацією), shadeRef — абажур (світлішає). */
export function TableLamp({
  x,
  y,
  s = 1,
  glowRef,
  shadeRef,
  glow = true,
}: {
  x: number
  y: number
  s?: number
  glowRef?: Ref<SVGGElement>
  shadeRef?: Ref<SVGPathElement>
  /** false — сяйво малює сцена окремим шаром (LampGlow). */
  glow?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {glow && (
        <g ref={glowRef} opacity={0}>
          <LampGlow />
        </g>
      )}
      <path d="M-22 0 C-24 -12 -12 -16 0 -16 C12 -16 24 -12 22 0 Z" fill="#c9a77a" />
      <rect x={-4} y={-80} width={8} height={66} fill="#b08a5c" />
      <path ref={shadeRef} d="M-40 -82 L-26 -138 H26 L40 -82 Z" fill="#e9d4ac" />
      <path d="M-40 -82 H40" stroke="#c9a77a" strokeWidth={3} />
    </g>
  )
}

export function Bookshelf({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const shelves = 4
  const sh = h / shelves
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#7a5236" />
      <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} fill="#5e3e2a" />
      {Array.from({ length: shelves }, (_, i) => (
        <g key={i}>
          <rect x={x + 6} y={y + (i + 1) * sh - 8} width={w - 12} height={10} fill="#8a5d3b" />
          <Books x={x + 22 + (i % 2) * 30} y={y + (i + 1) * sh - 8} s={0.9 + (i % 2) * 0.1} colors={i % 2 ? ['#c46b45', '#2f5b5d', '#e2c08a', '#7f9a86', '#8e6d8c'] : ['#6f8f68', '#d9b26a', '#b85c38', '#3f5d7a', '#c98b8b']} />
        </g>
      ))}
    </g>
  )
}

/** Настінний годинник; handsRef — групи стрілок (хвилинна, годинна). */
export function WallClock({ x, y, r = 46, minRef, hourRef }: { x: number; y: number; r?: number; minRef?: Ref<SVGLineElement>; hourRef?: Ref<SVGLineElement> }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r + 6} fill="#8a5d3b" />
      <circle r={r} fill="#fbf4e6" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return <line key={i} x1={Math.sin(a) * (r - 8)} y1={-Math.cos(a) * (r - 8)} x2={Math.sin(a) * (r - 3)} y2={-Math.cos(a) * (r - 3)} stroke="#5a4636" strokeWidth={i % 3 === 0 ? 3 : 1.5} />
      })}
      <line ref={hourRef} x1={0} y1={0} x2={0} y2={-r * 0.5} stroke="#3a2a22" strokeWidth={4} strokeLinecap="round" />
      <line ref={minRef} x1={0} y1={0} x2={0} y2={-r * 0.78} stroke="#3a2a22" strokeWidth={2.6} strokeLinecap="round" />
      <circle r={3.5} fill="#c46b45" />
    </g>
  )
}

export function PictureFrame({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} fill="#b8935f" />
      <rect x={x} y={y} width={w} height={h} fill="#f4ead8" />
      {children}
    </g>
  )
}

export function Rug({ x, y, w, h, color = '#b5654a', border = '#e1b77a' }: { x: number; y: number; w: number; h: number; color?: string; border?: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} fill={color} />
      <ellipse cx={x} cy={y} rx={w / 2 - 14} ry={h / 2 - 7} fill="none" stroke={border} strokeWidth={4} opacity={0.7} />
      <ellipse cx={x} cy={y} rx={w / 2 - 34} ry={h / 2 - 16} fill="none" stroke={border} strokeWidth={2} opacity={0.5} strokeDasharray="10 8" />
    </g>
  )
}

/** Невелика ваза з букетом (той самий, що подарували) — для вечірніх сцен. */
export function VaseBouquet({ x, y, s = 1, bloomRef }: { x: number; y: number; s?: number; bloomRef?: Ref<SVGGElement> }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g ref={bloomRef}>
        <g fill="#7f9a86">
          <ellipse cx={-22} cy={-78} rx={6} ry={10} transform="rotate(-30 -22 -78)" />
          <ellipse cx={24} cy={-80} rx={6} ry={10} transform="rotate(30 24 -80)" />
          <ellipse cx={2} cy={-104} rx={5} ry={9} />
        </g>
        <circle cx={-12} cy={-84} r={12} fill="#f7ead8" />
        <circle cx={-12} cy={-84} r={6} fill="#e6cfb3" />
        <circle cx={10} cy={-92} r={11} fill="#ecb7b0" />
        <circle cx={10} cy={-92} r={5} fill="#d68f8b" />
        <circle cx={4} cy={-72} r={10} fill="#f4d9d0" />
        <circle cx={22} cy={-70} r={7} fill="#b9a0c9" />
        <g fill="#b8322e">
          <circle cx={-26} cy={-96} r={3} />
          <circle cx={-22} cy={-100} r={3} />
          <circle cx={-28} cy={-101} r={2.6} />
        </g>
      </g>
      <path d="M-18 0 C-24 -20 -22 -44 -12 -56 H12 C22 -44 24 -20 18 0 Z" fill="#cfe0de" opacity={0.85} />
      <path d="M-12 -56 H12 L10 -62 H-10 Z" fill="#b9cfcc" />
      <path d="M-14 -40 C-16 -26 -14 -12 -10 -2" stroke="#fff" strokeWidth={3} opacity={0.4} fill="none" />
    </g>
  )
}
