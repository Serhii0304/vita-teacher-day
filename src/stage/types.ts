import type { Timeline } from '../story/timeline'

export type Layout = 'wide' | 'tall'

export interface Screen {
  w: number
  h: number
  layout: Layout
  /** Висота нижньої зони (субтитри + плеєр) у CSS-пікселях — туди не ставимо обличчя й жести. */
  reservedBottom: number
  reservedTop: number
}

export interface FrameCtx {
  /** Час для візуалу (у режимі зменшеного руху — «ключові» моменти). */
  t: number
  /** Справжній час аудіо. */
  tReal: number
  tl: Timeline
  screen: Screen
  reduced: boolean
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type SceneId = 'book' | 'classroom' | 'evening' | 'chorus1' | 'phone' | 'windows' | 'garden'

export interface SceneRuntime {
  el: SVGSVGElement | null
  update(ctx: FrameCtx): void
}

export type RegisterScene = (id: SceneId, rt: SceneRuntime) => () => void
