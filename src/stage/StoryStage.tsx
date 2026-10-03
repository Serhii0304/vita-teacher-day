import { memo, useCallback, useEffect, useRef, type ComponentType } from 'react'
import { sceneSchedule, sceneVisibility } from '../story/SceneTimeline'
import type { FrameBus } from './frameBus'
import type { FrameCtx, Layout, RegisterScene, SceneId, SceneRuntime } from './types'

export interface SceneEntry {
  id: SceneId
  Component: ComponentType<{ layout: Layout; register: RegisterScene }>
}

/**
 * Оркестратор історії: тримає всі сцени змонтованими (щоб перехід не «смикався»),
 * але показує лише ті, що видимі в поточний момент аудіо, і викликає їхнє оновлення.
 */
export const StoryStage = memo(function StoryStage({ scenes, bus, layout }: { scenes: SceneEntry[]; bus: FrameBus; layout: Layout }) {
  const runtimes = useRef(new Map<SceneId, SceneRuntime>())
  const register: RegisterScene = useCallback((id, rt) => {
    runtimes.current.set(id, rt)
    return () => {
      if (runtimes.current.get(id) === rt) runtimes.current.delete(id)
    }
  }, [])

  useEffect(() => {
    return bus.add((ctx: FrameCtx) => {
      const sched = sceneSchedule(ctx.tl)
      sched.forEach((w, i) => {
        const rt = runtimes.current.get(w.id)
        if (!rt?.el) return
        const vis = sceneVisibility(sched, i, ctx.tReal)
        if (vis <= 0.001) {
          if (rt.el.style.display !== 'none') rt.el.style.display = 'none'
          return
        }
        if (rt.el.style.display !== '') rt.el.style.display = ''
        rt.el.style.opacity = vis >= 0.999 ? '1' : vis.toFixed(3)
        rt.update(ctx)
      })
    })
  }, [bus])

  return (
    <div className="stage" aria-hidden="true">
      {scenes.map(({ id, Component }) => (
        <Component key={id} layout={layout} register={register} />
      ))}
    </div>
  )
})
