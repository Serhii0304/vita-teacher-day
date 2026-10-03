import { rc } from '../stage/camera'
import type { Layout, Rect } from '../stage/types'

/**
 * Спільні координати для «збіжного» переходу клас → вечірня кімната:
 * вікно стоїть на тому самому місці, героїня — в тій самій позі, камера — в тому самому кадрі.
 */
export const ROOM_WINDOW = { x: -720, y: -800, w: 480, h: 570 }
export const ROOM_WOMAN = { x: -90, y: 26 }

export const ROOM_MATCH: Record<Layout, Rect> = {
  wide: rc(-260, -330, 880, 620),
  tall: rc(-230, -330, 540, 790),
}

export const pick = <T,>(layout: Layout, wide: T, tall: T): T => (layout === 'wide' ? wide : tall)
