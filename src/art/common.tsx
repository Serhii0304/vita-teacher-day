import { useMemo } from 'react'
import { hash } from '../engine/math'

/*
 * Спільні художні елементи. Увесь рух — функція від часу аудіо t,
 * тому на паузі листя й пилинки завмирають, а після перемотування стоять де треба.
 *
 * Свідомо НЕ використовуємо кленове листя з п’ятьма гострими кінцями (щоб нічого не нагадувало зірку) —
 * тільки овальне листя (липа, береза, дуб, каштан).
 */

export const LEAF_COLORS = ['#e8b04a', '#d9822b', '#c4683a', '#a8452f', '#e2c46a', '#b9783c']

/** Форми листя (вісь листка вертикальна, черешок унизу; розмір ~ 20 од.). */
export const LEAF_PATHS = [
  // липа (серцеподібний)
  'M0 9 C-7 6 -10 -1 -7 -6 C-4.5 -10 -1.5 -9 0 -6 C1.5 -9 4.5 -10 7 -6 C10 -1 7 6 0 9 Z',
  // береза (овал із загостренням)
  'M0 10 C-6 5 -7 -3 -3 -8 C-1.6 -9.6 -0.6 -10.6 0 -12 C0.6 -10.6 1.6 -9.6 3 -8 C7 -3 6 5 0 10 Z',
  // дуб (м’які заокруглені лопаті)
  'M0 11 C-2 9 -5.5 8.5 -4.6 6 C-7.4 5.4 -7.6 2.4 -5 1.6 C-7.8 0 -6.8 -3.4 -4 -3.2 C-5.4 -6 -3 -8.4 -1.2 -7 C-1 -9.6 1 -9.6 1.2 -7 C3 -8.4 5.4 -6 4 -3.2 C6.8 -3.4 7.8 0 5 1.6 C7.6 2.4 7.4 5.4 4.6 6 C5.5 8.5 2 9 0 11 Z',
  // каштан (видовжений)
  'M0 12 C-4 7 -5 -2 -2.6 -9 C-1.6 -11.4 -0.6 -12.6 0 -13 C0.6 -12.6 1.6 -11.4 2.6 -9 C5 -2 4 7 0 12 Z',
]

export function Leaf({ kind = 0, color, vein = true }: { kind?: number; color: string; vein?: boolean }) {
  return (
    <g>
      <path d={LEAF_PATHS[kind % LEAF_PATHS.length]} fill={color} />
      {vein && <path d="M0 10 L0 -7" stroke="#6b3b1f" strokeWidth={0.7} opacity={0.35} fill="none" />}
    </g>
  )
}

export interface LeafFieldHandle {
  update(t: number, amount?: number, wind?: number): void
}

export interface MotesHandle {
  update(t: number, amount?: number): void
}

/** Осіннє дерево: стовбур і крона з перекритих «хмарок» листя. */
export function AutumnTree({
  x,
  y,
  s = 1,
  palette = ['#e2a640', '#d58a2f', '#c76b30', '#eec46a'],
  trunk = '#6b4a35',
  seed = 1,
  lit = 'right',
}: {
  x: number
  y: number
  s?: number
  palette?: string[]
  trunk?: string
  seed?: number
  lit?: 'left' | 'right'
}) {
  const blobs = useMemo(() => {
    const out: { cx: number; cy: number; r: number; c: string; o: number }[] = []
    for (let i = 0; i < 16; i++) {
      const h = (k: number) => hash(seed * 31.3 + i * 5.7 + k)
      const a = h(1) * Math.PI * 2
      const rr = 40 + h(2) * 70
      out.push({
        cx: Math.cos(a) * rr * 1.25,
        cy: -260 + Math.sin(a) * rr * 0.85,
        r: 42 + h(3) * 40,
        c: palette[Math.floor(h(4) * palette.length)],
        o: 0.85 + h(5) * 0.15,
      })
    }
    return out.sort((a, b) => a.cy - b.cy)
  }, [seed, palette])
  const lx = lit === 'right' ? 1 : -1
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-14 0 C-12 -60 -16 -120 -10 -180 C-8 -210 -26 -240 -40 -262 L-34 -266 C-20 -246 -4 -226 0 -206 C4 -236 18 -262 34 -280 L40 -274 C24 -250 12 -220 12 -180 C14 -120 12 -60 16 0 Z" fill={trunk} />
      <path d="M2 -40 C4 -90 2 -140 6 -180" stroke="#000" strokeWidth={4} opacity={0.12} fill="none" />
      {blobs.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.c} opacity={b.o} />
      ))}
      {blobs.slice(0, 7).map((b, i) => (
        <circle key={`h${i}`} cx={b.cx + lx * b.r * 0.25} cy={b.cy - b.r * 0.3} r={b.r * 0.55} fill="#fbe2a0" opacity={0.18} />
      ))}
    </g>
  )
}
