import { createContext, useContext, useImperativeHandle, useLayoutEffect, useMemo, useRef, type ReactNode, type Ref } from 'react'
import { bakeWorld } from './bakeWorld'
import { computeEnvelope, cropToEnvelope, type SceneEnvelope, type ViewBox } from './envelope'
import type { CamLayerHandle, FxHandle } from './layers'
import { createSvgPainter } from './paintSvg'
import { mobileFrameSize } from './rasterBudget'
import type { Screen } from './types'

type Box = { x: number; y: number; w: number; h: number }
type Layer = { el: SVGSVGElement; prepare(e: SceneEnvelope): void; draw(ctx: CanvasRenderingContext2D): void }
type Registry = { add(layer: Layer): () => void; invalidate(): void }
const MobileRegistry = createContext<Registry | null>(null)

/** One bounded display surface per camera. Hidden SVG is pose data, never a paint layer. */
export function MobileCamLayer({ children, ref }: { children: ReactNode; ref?: Ref<CamLayerHandle> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({ layers: [] as Layer[], env: null as SceneEnvelope | null, key: '',
    view: null as ViewBox | null, screen: null as Screen | null, queued: false, disposed: false })
  const registry = useMemo<Registry>(() => {
    const s = state.current
    const invalidate = () => {
      if (s.queued || s.disposed) return
      s.queued = true
      // Scenes apply character/prop poses AFTER frame(). Flush their latest values together.
      queueMicrotask(() => {
        s.queued = false
        const cv = canvas.current
        if (s.disposed || !cv || !s.view || !s.screen || document.hidden) return
        // Prewarmed scenes only prepare caches; they do not submit invisible frames.
        if (cv.closest<HTMLElement>('.scene')?.style.opacity === '0') return
        const size = mobileFrameSize(s.screen.w, s.screen.h)
        if (cv.width !== size.width) cv.width = size.width
        if (cv.height !== size.height) cv.height = size.height
        cv.style.width = `${s.screen.w}px`; cv.style.height = `${s.screen.h}px`
        const ctx = cv.getContext('2d', { alpha: true })
        if (!ctx) return
        ctx.resetTransform()
        ctx.clearRect(0, 0, cv.width, cv.height)
        const [x, y, w, h] = s.view
        ctx.setTransform(cv.width / w, 0, 0, cv.height / h, -x * cv.width / w, -y * cv.height / h)
        for (const layer of s.layers) {
          ctx.save()
          layer.draw(ctx)
          ctx.restore()
        }
      })
    }
    return {
      invalidate,
      add(layer) {
        s.layers.push(layer)
        // Effects and actors must keep their original occlusion, including late registration.
        s.layers.sort((a, b) => a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
        if (s.env) layer.prepare(s.env)
        invalidate()
        return () => { s.layers = s.layers.filter(x => x !== layer); invalidate() }
      },
    }
  }, [])
  useLayoutEffect(() => {
    const s = state.current
    s.disposed = false
    // SVG text and Canvas text share the same locally hosted fonts.
    void document.fonts.ready.then(() => registry.invalidate())
    return () => { s.disposed = true; if (canvas.current) { canvas.current.width = 1; canvas.current.height = 1 } }
  }, [registry])
  useImperativeHandle(ref, () => ({ frame(t, screen, key, view, from, to) {
    const s = state.current
    s.view = view(t, screen); s.screen = screen
    if (!s.env || key !== s.key) {
      s.key = key
      s.env = computeEnvelope(view, from, to, screen, 1)
      s.layers.forEach(layer => layer.prepare(s.env!))
    }
    registry.invalidate()
  } }), [registry])
  return <div className="scene__mobile-camera">
    <canvas ref={canvas} className="scene__mobile-canvas" aria-hidden="true" />
    <div style={{ display: 'none' }} aria-hidden="true">
      <MobileRegistry.Provider value={registry}>{children}</MobileRegistry.Provider>
    </div>
  </div>
}

export type WorldProps = { children: ReactNode; className?: string; layer?: boolean; dynamic?: boolean }
export function MobileWorldSvg({ children, layer = false, dynamic = false }: WorldProps) {
  const svg = useRef<SVGSVGElement>(null)
  const registry = useContext(MobileRegistry)
  useLayoutEffect(() => {
    if (!registry || !svg.current) return
    const el = svg.current
    let paint = layer || dynamic ? createSvgPainter(el) : null
    let cancel = () => {}
    let bitmap: HTMLCanvasElement | null = null
    let box: SceneEnvelope | null = null
    let failed = false
    const off = registry.add({ el,
      prepare(e) {
        if (layer || dynamic) return
        cancel(); failed = false
        el.setAttribute('viewBox', `${e.x} ${e.y} ${e.w} ${e.h}`)
        const next = document.createElement('canvas')
        cancel = bakeWorld(el, next, e.w * e.k, e.h * e.k, () => {
          if (bitmap) { bitmap.width = 1; bitmap.height = 1 }
          bitmap = next; box = e; registry.invalidate()
        }, () => { failed = true; registry.invalidate() })
      },
      draw(ctx) {
        if (layer || dynamic || failed) (paint ??= createSvgPainter(el))(ctx)
        else if (bitmap && box) ctx.drawImage(bitmap, box.x, box.y, box.w, box.h)
      },
    })
    return () => { cancel(); off(); if (bitmap) { bitmap.width = 1; bitmap.height = 1 } }
  }, [registry, layer, dynamic])
  return <svg ref={svg} preserveAspectRatio="none" aria-hidden="true">{children}</svg>
}

export type MobileFxProps = {
  bounds: Box; pivot?: [number, number]; travel?: number; initialOpacity?: number; fill?: string
  clip?: boolean; soft?: boolean; children?: ReactNode; ref?: Ref<FxHandle>
}
export function MobileFxLayer({ bounds, pivot, travel = 0, initialOpacity = 1, fill, clip = false, soft = true, children, ref }: MobileFxProps) {
  const svg = useRef<SVGSVGElement>(null)
  const registry = useContext(MobileRegistry)
  const state = useRef({ opacity: initialOpacity, dx: 0, dy: 0, rotate: 0, scale: 1 })
  useImperativeHandle(ref, () => ({
    opacity(v) { state.current.opacity = v },
    move(dx, dy, rotate = 0, scale = 1) { Object.assign(state.current, { dx, dy, rotate, scale }) },
  }), [])
  useLayoutEffect(() => {
    if (!registry || !svg.current) return
    const el = svg.current
    let cancel = () => {}
    let bitmap: HTMLCanvasElement | null = null
    let box = bounds
    let failed = false
    let paint: ReturnType<typeof createSvgPainter> | null = null
    const off = registry.add({ el,
      prepare(e) {
        if (fill) return
        cancel(); failed = false
        const crop = clip ? bounds : cropToEnvelope(bounds, e, travel, pivot)
        el.setAttribute('viewBox', `${crop.x} ${crop.y} ${crop.w} ${crop.h}`)
        const next = document.createElement('canvas')
        const quality = soft && !clip ? 0.25 : 1
        cancel = bakeWorld(el, next, crop.w * e.k * quality, crop.h * e.k * quality, () => {
          if (bitmap) { bitmap.width = 1; bitmap.height = 1 }
          bitmap = next; box = crop; registry.invalidate()
        }, () => { failed = true; registry.invalidate() }, 1)
      },
      draw(ctx) {
        const s = state.current
        if (s.opacity <= 0.002) return
        ctx.globalAlpha *= Math.min(1, s.opacity)
        if (clip) { ctx.beginPath(); ctx.rect(bounds.x, bounds.y, bounds.w, bounds.h); ctx.clip() }
        const px = pivot?.[0] ?? box.x, py = pivot?.[1] ?? box.y
        ctx.translate(s.dx + px, s.dy + py)
        ctx.rotate(s.rotate * Math.PI / 180); ctx.scale(s.scale, s.scale); ctx.translate(-px, -py)
        if (fill) { ctx.fillStyle = fill; ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h) }
        else if (failed) (paint ??= createSvgPainter(el))(ctx)
        else if (bitmap) ctx.drawImage(bitmap, box.x, box.y, box.w, box.h)
      },
    })
    return () => { cancel(); off(); if (bitmap) { bitmap.width = 1; bitmap.height = 1 } }
  }, [registry, bounds.x, bounds.y, bounds.w, bounds.h, pivot?.[0], pivot?.[1], travel, fill, clip, soft])
  return <svg ref={svg} preserveAspectRatio="none" aria-hidden="true">{children}</svg>
}
