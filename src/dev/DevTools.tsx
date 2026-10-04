import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { AudioPlayer } from '../audio/AudioPlayer'
import { formatTime } from '../engine/math'
import type { FrameBus } from '../stage/frameBus'
import { sceneSchedule, sceneVisibility } from '../story/SceneTimeline'
import { timelineStore } from '../story/timeline'
import './dev.css'

const Calibrator = lazy(() => import('./Calibrator'))

/**
 * Лише для розробки (не потрапляє в production):
 *  ?dev=hud        — індикатор часу/сцени/рядка
 *  ?dev=calibrate  — редактор таймкодів
 *  ?t=42.5         — одразу перейти до моменту (без звуку, на паузі) — для перевірки кадрів
 */
export default function DevTools({ bus, engine, onStart }: { bus: FrameBus; engine: AudioPlayer; onStart: () => void }) {
  const q = new URLSearchParams(location.search)
  const mode = q.get('dev')
  const tParam = q.get('t')
  const hud = useRef<HTMLDivElement>(null)
  const [showCal] = useState(mode === 'calibrate')

  const startRef = useRef(onStart)
  startRef.current = onStart
  useEffect(() => {
    if (tParam == null) return
    const t = Number(tParam)
    startRef.current()
    const go = () => engine.seek(t)
    if (engine.el.readyState >= 1) go()
    else engine.el.addEventListener('loadedmetadata', go, { once: true })
  }, [tParam, engine])

  useEffect(() => {
    ;(window as unknown as { __vita: unknown }).__vita = {
      engine,
      seek: (x: number) => engine.seek(x),
      /** Синхронний замір вартості оновлення кадру (JS + DOM-атрибути, без малювання). */
      bench: (t: number, n = 60) => {
        const w = innerWidth
        const h = innerHeight
        const last = bus.last ?? {
          t,
          tReal: t,
          tl: timelineStore.get(),
          screen: { w, h, layout: w / h >= 1 ? ('wide' as const) : ('tall' as const), reservedBottom: h * 0.24, reservedTop: 24 },
          reduced: false,
          heavy: true,
        }
        const t0 = performance.now()
        for (let i = 0; i < n; i++) bus.run({ ...last, t: t + i / 60, tReal: t + i / 60, heavy: true })
        return +((performance.now() - t0) / n).toFixed(2)
      },
    }
    if (mode !== 'hud' && mode !== 'calibrate') return
    return bus.add((ctx) => {
      const el = hud.current
      if (!el) return
      const sched = sceneSchedule(ctx.tl)
      const vis = sched.map((w, i) => ({ id: w.id, v: sceneVisibility(sched, i, ctx.tReal) })).filter((x) => x.v > 0)
      const line = ctx.tl.lines.find((l) => ctx.tReal >= l.start && ctx.tReal <= l.end)
      el.textContent = `${formatTime(ctx.tReal)} (${ctx.tReal.toFixed(2)}) · ${vis.map((x) => `${x.id}${x.v < 1 ? ` ${x.v.toFixed(2)}` : ''}`).join(' + ')} · ${line ? line.id : '—'}${ctx.reduced ? ' · reduced' : ''}`
    })
  }, [bus, engine, mode])

  return (
    <>
      {(mode === 'hud' || mode === 'calibrate') && <div ref={hud} className="dev-hud" />}
      {showCal && (
        <Suspense fallback={null}>
          <Calibrator engine={engine} />
        </Suspense>
      )}
    </>
  )
}
