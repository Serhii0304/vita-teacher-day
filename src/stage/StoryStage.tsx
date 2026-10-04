import { memo, startTransition, useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { sceneSchedule, sceneVisibility } from '../story/SceneTimeline'
import { sceneMounts } from './sceneMounts'
import type { FrameBus } from './frameBus'
import type { FrameCtx, Layout, RegisterScene, SceneId, SceneRuntime } from './types'

export interface SceneEntry {
  id: SceneId
  Component: ComponentType<{ layout: Layout; register: RegisterScene }>
}

/**
 * Монтує поточну сцену, обидві сторони переходу та завчасно наступну.
 * Завершені сцени звільняють DOM; перемотування відновлює їх з часу аудіо.
 *
 * Наступна сцена готується у фоні (startTransition): React будує її DOM невеликими порціями
 * між кадрами, тож анімація не завмирає. Раніше це був один блок ~200 мс (на телефоні — до секунди).
 * Сцени, які вже мають бути видимі (наприклад, після перемотування), монтуються одразу.
 */
export const StoryStage = memo(function StoryStage({ scenes, bus, layout }: { scenes: SceneEntry[]; bus: FrameBus; layout: Layout }) {
  const runtimes = useRef(new Map<SceneId, SceneRuntime>())
  const [mounted, setMounted] = useState<SceneId[]>([scenes[0].id])
  // що вже змонтовано (після коміту) і що востаннє запитано
  const committed = useRef<SceneId[]>(mounted)
  const requested = useRef(mounted.join('|'))
  const urgentKey = useRef('')
  useEffect(() => {
    committed.current = mounted
  }, [mounted])

  const prepared = useRef(new WeakSet<SceneRuntime>())
  const draw = (rt: SceneRuntime, vis: number, ctx: FrameCtx) => {
    if (!rt.el) return
    if (vis <= 0.001) {
      // сцена ще не з’явилась (або вже зникла): стоїть у розкладці невидимою; спершу один раз
      // розставляємо її на поточний час, далі щокадру вмикаємо по одному важкому шару
      if (rt.el.style.opacity !== '0') rt.el.style.opacity = '0'
      if (!prepared.current.has(rt)) {
        prepared.current.add(rt)
        if (rt.el.style.display !== '') rt.el.style.display = ''
        rt.update(ctx)
      } else rt.warm?.()
      return
    }
    rt.reveal?.()
    if (rt.el.style.display !== '') rt.el.style.display = ''
    const opacity = vis >= 0.999 ? '1' : vis.toFixed(3)
    if (rt.el.style.opacity !== opacity) rt.el.style.opacity = opacity
    rt.update(ctx)
  }
  const register: RegisterScene = useCallback((id, rt) => {
    runtimes.current.set(id, rt)
    // A seek on pause has no running RAF to initialize a newly mounted scene.
    if (bus.last) {
      const schedule = sceneSchedule(bus.last.tl)
      draw(rt, sceneVisibility(schedule, schedule.findIndex(scene => scene.id === id), bus.last.tReal), bus.last)
    }
    return () => {
      if (runtimes.current.get(id) === rt) runtimes.current.delete(id)
    }
  }, [bus])

  useEffect(() => {
    return bus.add((ctx: FrameCtx) => {
      const sched = sceneSchedule(ctx.tl)
      const needed = sceneMounts(sched, ctx.tReal)
      const key = needed.join('|')
      // видима зараз сцена, якої ще немає в DOM, — монтуємо негайно
      const missing = sched.some((w, i) => needed.includes(w.id) && !committed.current.includes(w.id) && sceneVisibility(sched, i, ctx.tReal) > 0)
      if (missing && urgentKey.current !== key) {
        urgentKey.current = key
        requested.current = key
        setMounted(needed)
      } else if (key !== requested.current) {
        requested.current = key
        startTransition(() => setMounted(needed))
      }
      sched.forEach((w, i) => {
        const rt = runtimes.current.get(w.id)
        if (rt) draw(rt, sceneVisibility(sched, i, ctx.tReal), ctx)
      })
    })
  }, [bus])

  return (
    <div className="stage" aria-hidden="true">
      {scenes.filter(scene => mounted.includes(scene.id)).map(({ id, Component }) => (
        <Component key={id} layout={layout} register={register} />
      ))}
    </div>
  )
})
