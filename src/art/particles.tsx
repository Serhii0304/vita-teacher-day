import { useContext, useImperativeHandle, useLayoutEffect, useMemo, useRef, type Ref } from 'react'
import { hash } from '../engine/math'
import { CompactRendering } from '../stage/renderingProfile'
import { useSceneRegistry, type SceneEnvelope } from '../stage/layers'
import { LEAF_COLORS, LEAF_PATHS, type LeafFieldHandle, type MotesHandle } from './common'

/*
 * Частинки як окремі композитні шари.
 * Кожен листок і кожна пилинка растеризуються один раз, а падіння, обертання й мерехтіння —
 * це лише CSS-трансформація/прозорість (робота GPU-композитора). Раніше кожна рухома частинка
 * змушувала перемальовувати ділянки великого шару разом з усім, що під нею.
 * Положення — та сама детермінована функція від часу аудіо, що й раніше.
 */
type Box = { x: number; y: number; w: number; h: number }

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

const LEAF_BOX = 28 // розмір рамки листка в одиницях (шлях −14…14)

/** Контейнер частинок у світових координатах сцени (позиціонується за межами шару сцени). */
function useBox(box: Box, clip: boolean) {
  const div = useRef<HTMLDivElement>(null)
  const env = useRef<SceneEnvelope | null>(null)
  const reg = useSceneRegistry()
  const onEnv = useRef<(e: SceneEnvelope) => void>(() => {})
  useLayoutEffect(() => {
    if (!reg) return
    return reg.addFx({
      apply(e) {
        env.current = e
        const d = div.current
        if (d) {
          d.style.left = `${((box.x - e.x) * e.k).toFixed(2)}px`
          d.style.top = `${((box.y - e.y) * e.k).toFixed(2)}px`
          d.style.width = `${(box.w * e.k).toFixed(2)}px`
          d.style.height = `${(box.h * e.k).toFixed(2)}px`
          d.style.overflow = clip ? 'hidden' : 'visible'
        }
        onEnv.current(e)
      },
    })
  }, [reg, box.x, box.y, box.w, box.h, clip])
  return { div, env, onEnv }
}

/**
 * Листопад. area — де падає листя; clip — прямокутник, за межами якого листя не видно
 * (наприклад, шибки вікна).
 */
export function LeafLayer({
  count,
  area,
  clip,
  seed = 1,
  scale = 1,
  speed = 1,
  colors = LEAF_COLORS,
  opacity = 1,
  unit = 1,
  ref,
}: {
  count: number
  area: Box
  clip?: Box
  seed?: number
  scale?: number
  speed?: number
  colors?: string[]
  opacity?: number
  /** Масштаб «одиниці руху» (для листя в мініатюрі, напр. на сторінці альбому). */
  unit?: number
  ref?: Ref<LeafFieldHandle>
}) {
  const compact = useContext(CompactRendering)
  const visibleCount = compact ? Math.min(count, 8) : count
  const specs = useMemo<LeafSpec[]>(() => {
    const out: LeafSpec[] = []
    for (let i = 0; i < visibleCount; i++) {
      const h = (k: number) => hash(seed * 97.13 + i * 13.7 + k * 3.31)
      out.push({
        x0: area.x + h(1) * area.w,
        speed: (34 + h(2) * 40) * speed,
        amp: (18 + h(3) * 46) * unit,
        freq: 0.6 + h(4) * 0.9,
        phase: h(5) * 6.28,
        spin: (h(6) - 0.5) * 140,
        flip: 0.8 + h(7) * 1.8,
        size: (0.75 + h(8) * 0.8) * scale,
        kind: Math.floor(h(9) * 4),
        color: colors[Math.floor(h(10) * colors.length)],
        drift: (h(11) - 0.3) * 30 * unit,
        off: h(12) * (area.h + 80 * unit),
      })
    }
    return out
  }, [visibleCount, area.x, area.y, area.w, area.h, seed, scale, speed, colors, unit])
  const box = clip ?? { x: area.x - 60 * unit, y: area.y - 60 * unit, w: area.w + 120 * unit, h: area.h + 160 * unit }
  const { div, env, onEnv } = useBox(box, !!clip)
  const els = useRef<(SVGSVGElement | null)[]>([])
  const last = useRef<string[]>([])
  const shown = useRef<boolean[]>([])
  onEnv.current = (e) => {
    specs.forEach((s, i) => {
      const el = els.current[i]
      if (!el) return
      const px = LEAF_BOX * s.size * e.k
      el.style.width = `${px.toFixed(2)}px`
      el.style.height = `${px.toFixed(2)}px`
    })
    last.current = []
  }
  useImperativeHandle(ref, () => ({
    update(t: number, amount = 1, wind = 0) {
      const e = env.current
      if (!e) return
      const H = area.h + 80 * unit
      const n = Math.round(visibleCount * amount)
      specs.forEach((s, i) => {
        const el = els.current[i]
        if (!el) return
        const visible = i < n
        if (shown.current[i] !== visible) {
          el.style.display = visible ? '' : 'none'
          shown.current[i] = visible
        }
        if (!visible) return
        const fall = (t * s.speed + s.off) % H
        const y = area.y - 40 * unit + fall
        let x = s.x0 + Math.sin(t * s.freq + s.phase) * s.amp + (s.drift + wind * 60 * unit) * ((fall / H) * 2 - 1)
        x = area.x + ((((x - area.x) % area.w) + area.w) % area.w)
        const rot = s.spin * t + Math.sin(t * s.freq * 1.3 + s.phase) * 35
        const fx = 0.25 + 0.75 * Math.abs(Math.cos(t * s.flip + s.phase))
        const half = (LEAF_BOX * s.size * e.k) / 2
        const tr = `translate3d(${((x - box.x) * e.k - half).toFixed(1)}px, ${((y - box.y) * e.k - half).toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${fx.toFixed(3)}, 1)`
        if (last.current[i] !== tr) {
          el.style.transform = tr
          last.current[i] = tr
        }
      })
    },
  }))
  return (
    <div ref={div} className="particles" style={{ opacity }} aria-hidden="true">
      {specs.map((s, i) => (
        <svg key={i} ref={(n) => void (els.current[i] = n)} className="particle" viewBox="-14 -14 28 28">
          <path d={LEAF_PATHS[s.kind % LEAF_PATHS.length]} fill={s.color} />
          <path d="M0 10 L0 -7" stroke="#6b3b1f" strokeWidth={0.7} opacity={0.35} fill="none" />
        </svg>
      ))}
    </div>
  )
}

export interface MoteLayerHandle extends MotesHandle {
  /** Зсунути всю групу (наприклад, іскорки, що супроводжують героїню). */
  follow(dx: number, dy: number): void
}

/** Пилинки / теплі іскорки в промені світла. */
export function MoteLayer({
  count,
  area,
  seed = 2,
  color = '#fff3cf',
  size = 2.2,
  ref,
}: {
  count: number
  area: Box
  seed?: number
  color?: string
  size?: number
  ref?: Ref<MoteLayerHandle>
}) {
  const compact = useContext(CompactRendering)
  const visibleCount = compact ? Math.min(count, 8) : count
  const specs = useMemo(
    () =>
      Array.from({ length: visibleCount }, (_, i) => {
        const h = (k: number) => hash(seed * 51.7 + i * 7.9 + k * 1.37)
        return { x: h(1), y: h(2), r: (0.5 + h(3)) * size, sp: 0.02 + h(4) * 0.05, ph: h(5) * 6.28, tw: 0.6 + h(6) * 1.4 }
      }),
    [visibleCount, seed, size],
  )
  const box = area
  const { div, env, onEnv } = useBox(box, false)
  const els = useRef<(HTMLDivElement | null)[]>([])
  const last = useRef<string[]>([])
  const lastO = useRef<string[]>([])
  const shift = useRef({ dx: 0, dy: 0, last: '' })
  const groupOn = useRef<boolean | null>(null)
  onEnv.current = (e) => {
    specs.forEach((s, i) => {
      const el = els.current[i]
      if (!el) return
      const px = s.r * 4 * e.k
      el.style.width = `${px.toFixed(2)}px`
      el.style.height = `${px.toFixed(2)}px`
    })
    last.current = []
    shift.current.last = ''
    writeShift()
  }
  const writeShift = () => {
    const e = env.current
    const d = div.current
    if (!e || !d) return
    const tr = `translate3d(${(shift.current.dx * e.k).toFixed(1)}px, ${(shift.current.dy * e.k).toFixed(1)}px, 0)`
    if (tr !== shift.current.last) {
      d.style.transform = tr
      shift.current.last = tr
    }
  }
  useImperativeHandle(ref, () => ({
    update(t: number, amount = 1) {
      const e = env.current
      const d = div.current
      if (!e || !d) return
      const on = amount > 0.001
      if (groupOn.current !== on) {
        d.style.display = on ? '' : 'none'
        groupOn.current = on
      }
      if (!on) return
      specs.forEach((s, i) => {
        const el = els.current[i]
        if (!el) return
        const yy = (s.y - t * s.sp + 10) % 1
        const xx = s.x + Math.sin(t * 0.3 + s.ph) * 0.03
        const half = s.r * 2 * e.k
        const tr = `translate3d(${(xx * box.w * e.k - half).toFixed(1)}px, ${(yy * box.h * e.k - half).toFixed(1)}px, 0)`
        if (last.current[i] !== tr) {
          el.style.transform = tr
          last.current[i] = tr
        }
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph))
        const o = (tw * amount).toFixed(2)
        if (lastO.current[i] !== o) {
          el.style.opacity = o
          lastO.current[i] = o
        }
      })
    },
    follow(dx: number, dy: number) {
      shift.current.dx = dx
      shift.current.dy = dy
      writeShift()
    },
  }))
  return (
    <div ref={div} className="particles" aria-hidden="true">
      {specs.map((_, i) => (
        <div key={i} ref={(n) => void (els.current[i] = n)} className="particle particle--mote" style={{ ['--c' as string]: color }} />
      ))}
    </div>
  )
}

export interface DotLayerHandle {
  /** Поставити іскорку i у світову точку (x, y) з прозорістю opacity. */
  set(i: number, x: number, y: number, opacity: number): void
}

/** Іскорки, що біжать уздовж нерухомої лінії: кожна — окремий композитний шар. */
export function DotLayer({ count, box, r, color, ref }: { count: number; box: Box; r: number; color: string; ref?: Ref<DotLayerHandle> }) {
  const { div, env, onEnv } = useBox(box, false)
  const els = useRef<(HTMLDivElement | null)[]>([])
  const last = useRef<string[]>([])
  const lastO = useRef<string[]>([])
  onEnv.current = (e) => {
    const px = `${(r * 2 * e.k).toFixed(2)}px`
    els.current.forEach((el) => {
      if (!el) return
      el.style.width = px
      el.style.height = px
    })
    last.current = []
  }
  useImperativeHandle(ref, () => ({
    set(i, x, y, opacity) {
      const e = env.current
      const el = els.current[i]
      if (!e || !el) return
      const tr = `translate3d(${((x - box.x - r) * e.k).toFixed(1)}px, ${((y - box.y - r) * e.k).toFixed(1)}px, 0)`
      if (last.current[i] !== tr) {
        el.style.transform = tr
        last.current[i] = tr
      }
      const o = opacity <= 0.005 ? '0' : opacity.toFixed(2)
      if (lastO.current[i] !== o) {
        el.style.opacity = o
        lastO.current[i] = o
      }
    },
  }))
  return (
    <div ref={div} className="particles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} ref={(n) => void (els.current[i] = n)} className="particle particle--dot" style={{ background: color, opacity: 0 }} />
      ))}
    </div>
  )
}
