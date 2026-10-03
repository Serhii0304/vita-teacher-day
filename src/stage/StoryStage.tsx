import { memo, useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
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
 */
export const StoryStage = memo(function StoryStage({ scenes, bus, layout }: { scenes: SceneEntry[]; bus: FrameBus; layout: Layout }) {
  const runtimes = useRef(new Map<SceneId, SceneRuntime>())
  const [mounted, setMounted] = useState<SceneId[]>([scenes[0].id])
  const mountedKey = useRef(mounted.join('|'))
  const draw = (rt: SceneRuntime, vis: number, ctx: FrameCtx) => {
    if (!rt.el) return
    if (vis <= 0.001) {
      if (rt.el.style.display !== 'none') rt.el.style.display = 'none'
      return
    }
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
      if (key !== mountedKey.current) {
        mountedKey.current = key
        setMounted(needed)
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
