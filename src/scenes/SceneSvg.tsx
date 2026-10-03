import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { FrameCtx, RegisterScene, SceneId } from '../stage/types'

/**
 * Обгортка сцени: окремий повноекранний <svg>, viewBox якого щокадру задає камера сцени.
 * Сцена реєструє свою функцію оновлення в оркестраторі (StoryStage).
 */
export function SceneSvg({
  id,
  register,
  update,
  children,
  label,
}: {
  id: SceneId
  register: RegisterScene
  update: (ctx: FrameCtx, svg: SVGSVGElement) => void
  children: ReactNode
  label: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const upd = useRef(update)
  upd.current = update
  useLayoutEffect(() => {
    const el = ref.current
    return register(id, {
      el,
      update: (ctx) => {
        if (el) upd.current(ctx, el)
      },
    })
  // A changed plan/layout also needs an immediate frame while paused.
  }, [id, register, update])
  return (
    <svg ref={ref} className="scene" data-scene={id} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style={{ display: 'none' }} aria-hidden="true" focusable="false">
      <title>{label}</title>
      {children}
    </svg>
  )
}
