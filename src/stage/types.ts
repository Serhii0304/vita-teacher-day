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
  /**
   * Чи оновлювати в цьому кадрі «дорогі» SVG-елементи (персонажі, атрибути ілюстрації).
   * Легкі кадри рухають лише камеру, частинки й світлові шари (робота композитора),
   * тому на телефоні вони йдуть частіше за важкі.
   */
  heavy: boolean
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type SceneId = 'book' | 'classroom' | 'evening' | 'chorus1' | 'phone' | 'windows' | 'garden'

export interface SceneRuntime {
  el: HTMLElement | SVGElement | null
  update(ctx: FrameCtx): void
  /** Крок «прогріву» ще невидимої сцени (вмикає наступний шар); true — усе готово. */
  warm?(): boolean
  /** Показати всі шари одразу (сцена вже на екрані, напр. після перемотування). */
  reveal?(): void
}

export type RegisterScene = (id: SceneId, rt: SceneRuntime) => () => void
