import { useImperativeHandle, useMemo, useRef, type Ref } from 'react'
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

interface LeafSpec {
  x0: number
  speed: number
  amp: number
  freq: number
  phase: number
  spin: number
  flip: number
  size: number
  kind: number
  color: string
  drift: number
  off: number
}

/**
 * Поле листя, що падає в прямокутнику area. amount (0…1) — скільки листків видно,
 * wind — бічний знос.
 */
export function LeafField({
  count,
  area,
  seed = 1,
  scale = 1,
  speed = 1,
  colors = LEAF_COLORS,
  opacity = 1,
  ref,
}: {
  count: number
  area: { x: number; y: number; w: number; h: number }
  seed?: number
  scale?: number
  speed?: number
  colors?: string[]
  opacity?: number
  ref?: Ref<LeafFieldHandle>
}) {
  const specs = useMemo<LeafSpec[]>(() => {
    const out: LeafSpec[] = []
    for (let i = 0; i < count; i++) {
      const h = (k: number) => hash(seed * 97.13 + i * 13.7 + k * 3.31)
      out.push({
        x0: area.x + h(1) * area.w,
        speed: (34 + h(2) * 40) * speed,
        amp: 18 + h(3) * 46,
        freq: 0.6 + h(4) * 0.9,
        phase: h(5) * 6.28,
        spin: (h(6) - 0.5) * 140,
        flip: 0.8 + h(7) * 1.8,
        size: (0.75 + h(8) * 0.8) * scale,
        kind: Math.floor(h(9) * 4),
        color: colors[Math.floor(h(10) * colors.length)],
        drift: (h(11) - 0.3) * 30,
        off: h(12) * (area.h + 80),
      })
    }
    return out
  }, [count, area.x, area.y, area.w, area.h, seed, scale, speed, colors])
  const els = useRef<(SVGGElement | null)[]>([])
  useImperativeHandle(ref, () => ({
    update(t: number, amount = 1, wind = 0) {
      const H = area.h + 80
      specs.forEach((s, i) => {
        const el = els.current[i]
        if (!el) return
        const visible = i < Math.round(count * amount)
        if (!visible) {
          el.style.display = 'none'
          return
        }
        el.style.display = ''
        const fall = (t * s.speed + s.off) % H
        const y = area.y - 40 + fall
        let x = s.x0 + Math.sin(t * s.freq + s.phase) * s.amp + (s.drift + wind * 60) * ((fall / H) * 2 - 1)
        x = area.x + ((((x - area.x) % area.w) + area.w) % area.w)
        const rot = s.spin * t + Math.sin(t * s.freq * 1.3 + s.phase) * 35
        const fx = Math.cos(t * s.flip + s.phase)
        el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${(s.size * (0.25 + 0.75 * Math.abs(fx))).toFixed(3)} ${s.size.toFixed(3)})`)
      })
    },
  }))
  return (
    <g opacity={opacity}>
      {specs.map((s, i) => (
        <g key={i} ref={(n) => void (els.current[i] = n)}>
          <Leaf kind={s.kind} color={s.color} />
        </g>
      ))}
    </g>
  )
}

export interface MotesHandle {
  update(t: number, amount?: number): void
}

/** Пилинки / світлові частинки, що повільно пливуть у промені світла. */
export function Motes({
  count,
  area,
  seed = 2,
  color = '#fff3cf',
  size = 2.2,
  ref,
}: {
  count: number
  area: { x: number; y: number; w: number; h: number }
  seed?: number
  color?: string
  size?: number
  ref?: Ref<MotesHandle>
}) {
  const specs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const h = (k: number) => hash(seed * 51.7 + i * 7.9 + k * 1.37)
        return { x: h(1), y: h(2), r: (0.5 + h(3)) * size, sp: 0.02 + h(4) * 0.05, ph: h(5) * 6.28, tw: 0.6 + h(6) * 1.4 }
      }),
    [count, seed, size],
  )
  const els = useRef<(SVGCircleElement | null)[]>([])
  useImperativeHandle(ref, () => ({
    update(t: number, amount = 1) {
      specs.forEach((s, i) => {
        const el = els.current[i]
        if (!el) return
        const yy = (s.y - t * s.sp + 10) % 1
        const xx = s.x + Math.sin(t * 0.3 + s.ph) * 0.03
        el.setAttribute('cx', (area.x + xx * area.w).toFixed(1))
        el.setAttribute('cy', (area.y + yy * area.h).toFixed(1))
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph))
        el.style.opacity = (tw * amount).toFixed(3)
      })
    },
  }))
  return (
    <g>
      {specs.map((s, i) => (
        <circle key={i} ref={(n) => void (els.current[i] = n)} r={s.r} fill={color} />
      ))}
    </g>
  )
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

/** М’яке радіальне сяйво (без фільтрів — лише градієнт, щоб не навантажувати телефон). */
export function Glow({ id, x, y, rx, ry, color, opacity = 1, gref }: { id: string; x: number; y: number; rx: number; ry?: number; color: string; opacity?: number; gref?: Ref<SVGEllipseElement> }) {
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={color} stopOpacity="0.9" />
          <stop offset="0.35" stopColor={color} stopOpacity="0.45" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse ref={gref} cx={x} cy={y} rx={rx} ry={ry ?? rx} fill={`url(#${id})`} opacity={opacity} />
    </>
  )
}

/** Промені світла з вікна. */
export function Rays({ id, from, to, color = '#ffe7b0', opacity = 0.5, gref }: { id: string; from: [number, number][]; to: [number, number][]; color?: string; opacity?: number; gref?: Ref<SVGGElement> }) {
  return (
    <g ref={gref} opacity={opacity} style={{ mixBlendMode: 'screen' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.75" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {from.map((f, i) => {
        const t = to[i]
        return <path key={i} d={`M${f[0]} ${f[1]} L${f[0] + 70} ${f[1] - 10} L${t[0] + 120} ${t[1]} L${t[0] - 60} ${t[1]} Z`} fill={`url(#${id})`} />
      })}
    </g>
  )
}
