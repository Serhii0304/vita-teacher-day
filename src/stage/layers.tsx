import { createContext, useCallback, useContext, useImperativeHandle, useLayoutEffect, useMemo, useRef, type ReactNode, type Ref } from 'react'
import { sceneSchedule } from '../story/SceneTimeline'
import { CompactRendering } from './renderingProfile'
import { cameraTransform, computeEnvelope, cropToEnvelope, rasterQuality, type SceneEnvelope, type ViewFn } from './envelope'
import type { FrameCtx, RegisterScene, SceneId, Screen } from './types'
import { MobileCamLayer, MobileWorldSvg, MobileFxLayer, type MobileFxProps, type WorldProps } from './mobileLayers'

/**
 * Desktop keeps the original SVG/CSS camera layers and effects.
 * Compact mode delegates to mobileLayers: one bounded canvas per camera,
 * cached decorations, and live Canvas paths driven by the same scene poses.
 */
export type { SceneEnvelope, ViewBox, ViewFn } from './envelope'

interface FxEntry {
  apply(env: SceneEnvelope): void
}

interface WorldEntry extends FxEntry {
  frame?(env: SceneEnvelope, view: import('./envelope').ViewBox, screen: Screen): void
}

interface FrameRegistry {
  addWorld(world: WorldEntry): () => void
  addFx(fx: FxEntry): () => void
}

const Registry = createContext<FrameRegistry | null>(null)

/**
 * «Прогрів» сцени, що ось-ось з’явиться: вона вже стоїть у розкладці з нульовою прозорістю,
 * а важкі SVG-шари вмикаються по одному на кадр. Тоді в момент появи браузерові не треба
 * одним кадром розкладати й малювати всю ілюстрацію (на телефоні це було помітне «завмирання»).
 */
interface WarmupRegistry {
  add(el: HTMLElement | SVGElement): () => void
}
const Warmup = createContext<WarmupRegistry | null>(null)

function useWarmup(ref: { current: HTMLElement | SVGElement | null }) {
  const warm = useContext(Warmup)
  useLayoutEffect(() => {
    const el = ref.current
    if (!warm || !el) return
    return warm.add(el)
  }, [warm, ref])
}

/** Часове вікно епізоду, на яке розраховується растр шару (з запасом на перехід). */
const windows = new WeakMap<object, Map<SceneId, [number, number]>>()
export function sceneWindow(tl: FrameCtx['tl'], id: SceneId): [number, number] {
  let m = windows.get(tl)
  if (!m) {
    m = new Map()
    windows.set(tl, m)
  }
  let w = m.get(id)
  if (!w) {
    const sched = sceneSchedule(tl)
    const i = sched.findIndex((s) => s.id === id)
    const next = sched[i + 1]
    w = [Math.max(0, sched[i].start - 2.5), next ? next.start + next.fadeIn + 0.5 : tl.duration]
    m.set(id, w)
  }
  return w
}

export const screenKey = (scr: Screen) => `${scr.w}x${scr.h}x${Math.round(scr.reservedBottom)}x${Math.round(scr.reservedTop)}`

export interface CamLayerHandle {
  /**
   * Кадр камери. scr — «екран» цього шару (для панелей — розмір панелі). key — коли змінюється,
   * межі растру перераховуються (розмір екрана, новий план); у звичайних кадрах рухається лише GPU-трансформація.
   */
  frame(t: number, scr: Screen, key: string, view: ViewFn, from: number, to: number): void
}

/** Шар камери: ілюстрація растризується один раз, рух камери — трансформація композитного шару. */
export function CamLayer({ children, ref }: { children: ReactNode; ref?: Ref<CamLayerHandle> }) {
  const compact = useContext(CompactRendering)
  return compact ? <MobileCamLayer ref={ref}>{children}</MobileCamLayer> : <DesktopCamLayer ref={ref}>{children}</DesktopCamLayer>
}

function DesktopCamLayer({ children, ref }: { children: ReactNode; ref?: Ref<CamLayerHandle> }) {
  const compact = useContext(CompactRendering)
  const cam = useRef<HTMLDivElement>(null)
  const worlds = useRef(new Set<WorldEntry>())
  const fxs = useRef(new Set<FxEntry>())
  const env = useRef<SceneEnvelope | null>(null)
  const envKey = useRef('')
  const lastTransform = useRef('')
  const lastFrame = useRef<{ view: import('./envelope').ViewBox; screen: Screen } | null>(null)

  const registry = useMemo<FrameRegistry>(
    () => ({
      addWorld(world) {
        worlds.current.add(world)
        if (env.current) {
          world.apply(env.current)
          if (lastFrame.current) world.frame?.(env.current, lastFrame.current.view, lastFrame.current.screen)
        }
        return () => void worlds.current.delete(world)
      },
      addFx(fx) {
        fxs.current.add(fx)
        if (env.current) fx.apply(env.current)
        return () => void fxs.current.delete(fx)
      },
    }),
    [],
  )

  useImperativeHandle(
    ref,
    () => ({
      frame(t, scr, key, view, from, to) {
        const k = `${key}|${compact ? 1 : 0}`
        if (k !== envKey.current || !env.current) {
          env.current = computeEnvelope(view, from, to, scr, rasterQuality(compact))
          envKey.current = k
          applyEnvelope(cam.current, worlds.current, fxs.current, env.current)
          lastTransform.current = ''
        }
        const vb = view(t, scr)
        lastFrame.current = { view: vb, screen: scr }
        worlds.current.forEach(world => world.frame?.(env.current!, vb, scr))
        const tr = cameraTransform(env.current, vb, scr)
        if (tr !== lastTransform.current && cam.current) {
          cam.current.style.transform = tr
          lastTransform.current = tr
        }
      },
    }),
    [compact],
  )

  return (
    <div ref={cam} className="scene__cam">
      <Registry.Provider value={registry}>{children}</Registry.Provider>
    </div>
  )
}

/** Корінь сцени: реєстрація в оркестраторі; вміст (шари камери, накладки) компонує сама сцена. */
export function SceneRoot({
  id,
  label,
  register,
  update,
  children,
}: {
  id: SceneId
  label: string
  register: RegisterScene
  update: (ctx: FrameCtx) => void
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const pending = useRef<(HTMLElement | SVGElement)[]>([])
  // сцену вже показано — шари більше не ховаємо
  const live = useRef(false)
  const warmup = useMemo<WarmupRegistry>(
    () => ({
      add(el) {
        if (!live.current) {
          el.style.display = 'none'
          pending.current.push(el)
        }
        return () => void (pending.current = pending.current.filter((x) => x !== el))
      },
    }),
    [],
  )
  useLayoutEffect(() => {
    const el = root.current
    return register(id, {
      el,
      update,
      warm() {
        const next = pending.current.shift()
        if (next) next.style.display = ''
        return pending.current.length === 0
      },
      reveal() {
        if (live.current) return
        live.current = true
        for (const layer of pending.current) layer.style.display = ''
        pending.current = []
      },
    })
  }, [id, register, update])
  return (
    <div ref={root} className="scene" data-scene={id} role="img" aria-label={label} style={{ display: 'none' }}>
      <Warmup.Provider value={warmup}>{children}</Warmup.Provider>
    </div>
  )
}

let planSerial = 0

/** Звичайна сцена з однією камерою на весь екран. */
export function SceneFrame({
  id,
  label,
  register,
  view,
  update,
  children,
}: {
  id: SceneId
  label: string
  register: RegisterScene
  /** Кадр камери (viewBox у світових координатах) як функція часу. */
  view: ViewFn
  /** Оновлення динамічних елементів (без камери). */
  update: (ctx: FrameCtx) => void
  children: ReactNode
}) {
  const cam = useRef<CamLayerHandle>(null)
  // новий план (таймлайн/компоновка) — перерахувати межі шару
  const plan = useMemo(() => ++planSerial, [view])
  const frame = useCallback(
    (ctx: FrameCtx) => {
      const [from, to] = sceneWindow(ctx.tl, id)
      cam.current?.frame(ctx.t, ctx.screen, `${screenKey(ctx.screen)}|${plan}`, view, from, to)
      update(ctx)
    },
    [id, plan, view, update],
  )
  return (
    <SceneRoot id={id} label={label} register={register} update={frame}>
      <CamLayer ref={cam}>{children}</CamLayer>
    </SceneRoot>
  )
}

function applyWorld(el: SVGSVGElement, e: SceneEnvelope) {
  const vb = `${e.x.toFixed(2)} ${e.y.toFixed(2)} ${e.w.toFixed(2)} ${e.h.toFixed(2)}`
  if (el.getAttribute('viewBox') !== vb) el.setAttribute('viewBox', vb)
}

function applyEnvelope(cam: HTMLDivElement | null, worlds: Set<WorldEntry>, fxs: Set<FxEntry>, e: SceneEnvelope) {
  if (cam) {
    cam.style.width = `${(e.w * e.k).toFixed(1)}px`
    cam.style.height = `${(e.h * e.k).toFixed(1)}px`
  }
  worlds.forEach((world) => world.apply(e))
  fxs.forEach((fx) => fx.apply(e))
}

/** Частина ілюстрації у світових координатах сцени (усі WorldSvg однієї сцени точно накладаються). */
export function WorldSvg(props: WorldProps) {
  const compact = useContext(CompactRendering)
  return compact ? <MobileWorldSvg {...props} /> : <DesktopWorldSvg {...props} />
}

function DesktopWorldSvg({ children, className, layer = false }: WorldProps) {
  const ref = useRef<SVGSVGElement>(null)
  const reg = useContext(Registry)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !reg) return
    return reg.addWorld({ apply(e) { applyWorld(el, e) } })
  }, [reg])
  useWarmup(ref)
  const cls = `scene__world${layer ? ' scene__world--layer' : ''}${className ? ` ${className}` : ''}`
  return <svg ref={ref} className={cls} preserveAspectRatio="none" aria-hidden="true" focusable="false">{children}</svg>
}

export interface FxHandle {
  /** Прозорість шару (композитор, без растеризації). */
  opacity(v: number): void
  /** Зсув у світових одиницях, поворот (°) і масштаб навколо точки pivot. */
  move(dx: number, dy: number, rotate?: number, scale?: number): void
}

/**
 * Окремий композитний шар для світла й ефектів: змінюється лише CSS-прозорість/трансформація.
 * bounds — світовий прямокутник вмісту (щоб шар не був більшим, ніж треба).
 * clip — вміст обрізається межами bounds, а move() зсуває вміст усередині цих меж
 * (напр. хмаринки, що пливуть за шибкою).
 */
export function FxLayer(props: MobileFxProps) {
  const compact = useContext(CompactRendering)
  return compact ? <MobileFxLayer {...props} /> : <DesktopFxLayer {...props} />
}

function DesktopFxLayer({
  bounds,
  pivot,
  travel = 0,
  initialOpacity = 1,
  fill,
  clip = false,
  children,
  ref,
}: {
  bounds: { x: number; y: number; w: number; h: number }
  pivot?: [number, number]
  /** Наскільки (у світових одиницях) шар зсувається через move() — щоб обрізання не відкрило край. */
  travel?: number
  /**
   * М’яке світло (градієнти, сяйва, промені): на телефоні шар один раз малюється в маленьке полотно,
   * яке розтягує відеокарта, — для плавних градієнтів різниці не видно, а пам’яті й растеризації в десятки разів менше.
   * false — для шарів із дрібними деталями (меблі, тонкі лінії).
   */
  soft?: boolean
  initialOpacity?: number
  /** Однотонна накладка (тонування сцени): шар без SVG, лише колір фону. */
  fill?: string
  clip?: boolean
  children?: ReactNode
  ref?: Ref<FxHandle>
}) {
  const div = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const reg = useContext(Registry)
  useWarmup(div)
  const state = useRef({ op: initialOpacity, dx: 0, dy: 0, rot: 0, sc: 1, k: 1, lastT: '', lastO: '' })
  const write = () => {
    const d = div.current
    if (!d) return
    const s = state.current
    const o = s.op <= 0.002 ? '0' : s.op >= 0.998 ? '1' : s.op.toFixed(3)
    if (o !== s.lastO) {
      d.style.opacity = o
      d.style.visibility = o === '0' ? 'hidden' : 'visible'
      s.lastO = o
    }
    const target = clip ? svg.current : d
    if (!target) return
    const tr = `translate3d(${(s.dx * s.k).toFixed(2)}px, ${(s.dy * s.k).toFixed(2)}px, 0) rotate(${s.rot.toFixed(3)}deg) scale(${s.sc.toFixed(4)})`
    if (tr !== s.lastT) {
      target.style.transform = tr
      s.lastT = tr
    }
  }
  useImperativeHandle(ref, () => ({
    opacity(v: number) {
      state.current.op = v
      write()
    },
    move(dx: number, dy: number, rotate = 0, scale = 1) {
      const s = state.current
      s.dx = dx
      s.dy = dy
      s.rot = rotate
      s.sc = scale
      write()
    },
  }))
  useLayoutEffect(() => {
    if (!reg) return
    const off = reg.addFx({
      apply(e: SceneEnvelope) {
        const d = div.current
        if (!d) return
        const k = e.k
        state.current.k = k
        // шар не більший, ніж будь-коли побачить камера: менше пам’яті відеокарти й растеризації
        const c = clip ? bounds : cropToEnvelope(bounds, e, travel, pivot)
        d.style.left = `${((c.x - e.x) * k).toFixed(2)}px`
        d.style.top = `${((c.y - e.y) * k).toFixed(2)}px`
        d.style.width = `${(c.w * k).toFixed(2)}px`
        d.style.height = `${(c.h * k).toFixed(2)}px`
        svg.current?.setAttribute('viewBox', `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.w.toFixed(2)} ${c.h.toFixed(2)}`)
        const px = pivot ? (pivot[0] - c.x) * k : 0
        const py = pivot ? (pivot[1] - c.y) * k : 0
        const target = clip ? svg.current : d
        if (target) target.style.transformOrigin = `${px.toFixed(2)}px ${py.toFixed(2)}px`
        state.current.lastT = ''
        write()
      },
    })
    return off
  }, [reg, bounds.x, bounds.y, bounds.w, bounds.h, pivot?.[0], pivot?.[1], clip, travel])
  const hidden = initialOpacity <= 0.002
  return (
    <div
      ref={div}
      className={`scene__fx${clip ? ' scene__fx--clip' : ''}`}
      style={{ opacity: initialOpacity, visibility: hidden ? 'hidden' : undefined, background: fill }}
    >
      {fill == null && (
        <svg ref={svg} viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {children}
        </svg>
      )}
    </div>
  )
}

/** Доступ до реєстру сцени (для шарів частинок, що позиціонуються у світових координатах). */
export function useSceneRegistry() {
  return useContext(Registry)
}
