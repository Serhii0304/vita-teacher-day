import type { RefCallback } from 'react'

/**
 * Предмети в руках персонажів. Кожен предмет намальований у власній системі:
 * початок — точка хвату, «вгору» — це -y.
 */
type Reg = (key: string) => RefCallback<SVGElement>

export function BookProp({ reg, k }: { reg: Reg; k: string }) {
  return (
    <g>
      {/* права сторінка (видно, коли обкладинка відкрита) */}
      <g transform="translate(0 -20)">
        <rect x={-1} y={-19} width={27} height={37} rx={1.6} fill="#f7efe2" stroke="#d9c8ad" strokeWidth={0.6} />
        <g stroke="#cdbb9f" strokeWidth={0.55} strokeLinecap="round" opacity={0.85}>
          <path d="M4 -12H21M4 -8H22M4 -4H19M4 0H22M4 4H20M4 8H17" />
        </g>
        <path d="M6 12 q4 -3 8 0 q4 3 8 0" fill="none" stroke="#c48f5a" strokeWidth={0.7} opacity={0.7} />
        {/* обкладинка: scaleX від 1 до -1 навколо корінця */}
        <g ref={reg(`${k}cover`)}>
          <rect x={-1} y={-19.5} width={27.5} height={38} rx={2} fill="#2f5b5d" />
          <rect x={-1} y={-19.5} width={4} height={38} fill="#264b4d" />
          <path
            d="M14 -7 c-2.6 2.2 -3.6 5.2 -1.4 8.6 c1 1.4 2.4 1.9 3.4 1.6 c1.6 -2.3 1.6 -5.2 -2 -10.2 Z M14.8 3 l-1.6 4"
            fill="none"
            stroke="#d9b26a"
            strokeWidth={0.8}
            strokeLinecap="round"
          />
          <rect x={5} y={-15.5} width={18} height={30} rx={1} fill="none" stroke="#d9b26a" strokeWidth={0.5} opacity={0.7} />
          <g ref={reg(`${k}coverIn`)} opacity={0}>
            <rect x={-1} y={-19.5} width={27.5} height={38} rx={2} fill="#efe4d2" stroke="#d9c8ad" strokeWidth={0.6} />
            <g stroke="#cdbb9f" strokeWidth={0.55} strokeLinecap="round" opacity={0.85}>
              <path d="M5 -12H22M5 -8H21M5 -4H22M5 0H18M5 4H22" />
            </g>
            <circle cx={13} cy={10} r={3.2} fill="#e9b765" opacity={0.75} />
            <path d="M13 5v-1.6M13 15v1.6M8 10H6.4M18 10h1.6" stroke="#e0a64e" strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
          </g>
        </g>
      </g>
    </g>
  )
}

export function CupProp({ reg, k }: { reg: Reg; k: string }) {
  return (
    <g>
      <g ref={reg(`${k}steam`)} opacity={0}>
        <path ref={reg(`${k}steam1`)} d="M4 -18 c-3 -4 3 -7 0 -11" fill="none" stroke="#fffaf0" strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
        <path ref={reg(`${k}steam2`)} d="M9 -18 c-3 -4 3 -7 0 -11" fill="none" stroke="#fffaf0" strokeWidth={1.2} strokeLinecap="round" opacity={0.45} />
      </g>
      {/* ручка з боку долоні */}
      <path d="M-1 -12 c-5 0 -6.5 7 -1 8.4" fill="none" stroke="#efe3d1" strokeWidth={2.4} />
      <path d="M-1 -16 L15 -16 L13.6 -1.5 C13.2 0.6 11.6 1.5 9.6 1.5 L4.4 1.5 C2.4 1.5 0.8 0.6 0.4 -1.5 Z" fill="#f3e8d8" />
      <path d="M0.1 -16 L15.9 -16 L15.6 -13.4 L0.4 -13.4 Z" fill="#fffaf0" />
      <path d="M0.7 -9 L15.2 -9 L14.9 -6.4 L1 -6.4 Z" fill="#c46b45" opacity={0.85} />
      <path d="M9 -16 L15 -16 L13.6 -1.5 C13.3 0.4 12 1.3 10.5 1.5 C12 -4 12 -10 9 -16 Z" fill="#d9c8b1" opacity={0.7} />
      <ellipse cx={7.9} cy={-16} rx={7.9} ry={1.5} fill="#8a5a3c" opacity={0.85} />
      <ellipse cx={7.9} cy={-16} rx={7.9} ry={1.5} fill="none" stroke="#fffaf0" strokeWidth={0.7} />
    </g>
  )
}

export function PhoneProp() {
  return (
    <g>
      <rect x={-4} y={-8} width={8} height={16} rx={1.8} fill="#2a2a31" />
      <rect x={-3.2} y={-7.2} width={6.4} height={14.4} rx={1.3} fill="#3a3c47" />
      <path d="M-3 -7 L3 -1 L3 -7 Z" fill="#ffffff" opacity={0.08} />
    </g>
  )
}

/** Квітка-троянда: пелюстки розкриваються з bloom. */
function Rose({ x, y, s, c1, c2, reg, k }: { x: number; y: number; s: number; c1: string; c2: string; reg: Reg; k: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g ref={reg(k)}>
        <circle r={6.2} fill={c2} />
        <path d="M-6 0 C-6 -5 -2 -7 0 -6.6 C3 -7 6.4 -4 6 0 C5.6 3.4 2 5.8 -0.6 5.6 C-4 5.4 -6 3 -6 0 Z" fill={c1} />
        <path d="M-3.6 -0.6 C-3.4 -3.4 -0.4 -4.4 1.6 -3.4 C3.4 -2.4 3.6 0.4 2 1.8" fill="none" stroke={c2} strokeWidth={1} strokeLinecap="round" />
        <path d="M-1.4 -0.2 C-1 -1.8 0.8 -1.8 1 -0.4" fill="none" stroke={c2} strokeWidth={0.9} strokeLinecap="round" />
        <path d="M-5.4 2 C-3.6 4.6 1.4 5.6 4.6 2.6" fill="none" stroke={c2} strokeWidth={0.8} opacity={0.7} />
      </g>
    </g>
  )
}

function Chrysanthemum({ x, y, s, c1, c2, reg, k }: { x: number; y: number; s: number; c1: string; c2: string; reg: Reg; k: string }) {
  const petals = []
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 360
    petals.push(<ellipse key={i} cx={0} cy={-4.4} rx={1.25} ry={3.4} fill={i % 2 ? c1 : c2} transform={`rotate(${a})`} />)
  }
  const inner = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 360 + 18
    inner.push(<ellipse key={i} cx={0} cy={-2.4} rx={1} ry={2.2} fill={c1} transform={`rotate(${a})`} />)
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g ref={reg(k)}>
        {petals}
        {inner}
        <circle r={1.6} fill="#e7c37a" />
      </g>
    </g>
  )
}

function Aster({ x, y, s, reg, k }: { x: number; y: number; s: number; reg: Reg; k: string }) {
  const petals = []
  for (let i = 0; i < 12; i++) {
    petals.push(<ellipse key={i} cx={0} cy={-3.2} rx={0.9} ry={2.5} fill="#b9a0c9" transform={`rotate(${i * 30})`} />)
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g ref={reg(k)}>
        {petals}
        <circle r={1.3} fill="#f0c25e" />
      </g>
    </g>
  )
}

/**
 * Невеликий букет: кремові та ніжно-рожеві троянди, хризантема, айстри, евкаліпт і калина,
 * у крафтовому папері з приглушено-рожевою стрічкою.
 */
export function BouquetProp({ reg, k }: { reg: Reg; k: string }) {
  return (
    <g>
      {/* зелень позаду */}
      <g fill="#7f9a86">
        <ellipse cx={-10} cy={-30} rx={2.6} ry={4} transform="rotate(-30 -10 -30)" />
        <ellipse cx={-13} cy={-24} rx={2.4} ry={3.6} transform="rotate(-50 -13 -24)" />
        <ellipse cx={11} cy={-31} rx={2.6} ry={4} transform="rotate(30 11 -31)" />
        <ellipse cx={14} cy={-24} rx={2.4} ry={3.6} transform="rotate(55 14 -24)" />
        <ellipse cx={1} cy={-41} rx={2.4} ry={3.8} transform="rotate(8 1 -41)" />
      </g>
      <path d="M-11 -34 L-14 -40 M12 -35 L15 -41" stroke="#6f8a76" strokeWidth={0.8} strokeLinecap="round" />
      {/* калина */}
      <g fill="#b8322e">
        <circle cx={-12.5} cy={-36.5} r={1.5} />
        <circle cx={-10.6} cy={-38.3} r={1.4} />
        <circle cx={-13.8} cy={-38.6} r={1.3} />
        <circle cx={-11.6} cy={-40.4} r={1.2} />
      </g>
      <g fill="#ffffff" opacity={0.45}>
        <circle cx={-12.9} cy={-37} r={0.45} />
        <circle cx={-11} cy={-38.8} r={0.4} />
      </g>
      <Aster x={10} y={-37} s={1} reg={reg} k={`${k}f5`} />
      <Aster x={-4} y={-43} s={0.85} reg={reg} k={`${k}f6`} />
      <Chrysanthemum x={8} y={-27} s={1.05} c1="#f4d9d0" c2="#e8b8ae" reg={reg} k={`${k}f3`} />
      <Rose x={-6} y={-33} s={1.08} c1="#f7ead8" c2="#e6cfb3" reg={reg} k={`${k}f1`} />
      <Rose x={3} y={-38} s={0.95} c1="#ecb7b0" c2="#d68f8b" reg={reg} k={`${k}f2`} />
      <Rose x={-1} y={-25.5} s={0.9} c1="#f3d6c8" c2="#dfae9b" reg={reg} k={`${k}f4`} />
      {/* крафтовий папір */}
      <path d="M-15 -26 L-4 6 L4 6 L16 -26 C10 -21 4 -19 0 -20 C-5 -20 -10 -22 -15 -26 Z" fill="#d8b98f" />
      <path d="M-15 -26 L-4 6 L-1 6 L-9 -24 Z" fill="#c8a477" />
      <path d="M16 -26 L4 6 L6.5 6 L18 -22 Z" fill="#e6caa2" />
      {/* стрічка */}
      <path d="M-5.2 -4 L5.2 -4 L5 0 L-5 0 Z" fill="#c98a8a" />
      <path d="M0 -2 C-4 -6 -8 -4 -7 -1 C-6 1 -3 0 0 -2 Z M0 -2 C4 -6 8 -4 7 -1 C6 1 3 0 0 -2 Z" fill="#b97576" />
      <path d="M-0.6 -1.5 L-3.6 6 M0.6 -1.5 L3 6.4" stroke="#c98a8a" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  )
}

export function NotebooksProp() {
  return (
    <g>
      <rect x={-2} y={-34} width={30} height={36} rx={1.5} fill="#7f9a86" />
      <rect x={1} y={-36} width={30} height={36} rx={1.5} fill="#c46b45" />
      <rect x={4} y={-38} width={30} height={36} rx={1.5} fill="#efe2cf" stroke="#d6c4ab" strokeWidth={0.6} />
      <rect x={10} y={-30} width={17} height={7} rx={1} fill="#ffffff" opacity={0.85} />
      <path d="M12 -27.5 H25 M12 -25 H22" stroke="#b9a68b" strokeWidth={0.6} />
    </g>
  )
}
