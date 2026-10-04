/**
 * Скелети двох персонажів. Локальна система координат персонажа:
 * початок — точка на землі між ступнями, +x — напрям погляду (персонаж «дивиться вправо»),
 * y донизу (у SVG), тож висоти від’ємні. Одиниця ≈ 0,5 см (жінка ≈ 170 см = 340 од.).
 */
export interface BodySpec {
  kind: 'woman' | 'man'
  pelvisY: number
  hipN: [number, number]
  hipF: [number, number]
  thigh: number
  shin: number
  ankle: number
  foot: number
  /** Відносно таза (у системі торса). */
  neck: [number, number]
  headPivot: [number, number]
  shN: [number, number]
  shF: [number, number]
  upper: number
  fore: number
  hand: number
  /** Масштаб малюнка голови. */
  headScale: number
  /** Положення ступень у спокої (локальний x). */
  footN: number
  footF: number
  /** Відстань між послідовними постановками ступень при спокійній ході. */
  step: number
  /** Наскільки опускається таз під час ходи. */
  walkDrop: number
  /** Висота підйому стопи під час кроку. */
  lift: number
}

export const WOMAN: BodySpec = {
  kind: 'woman',
  pelvisY: -171,
  hipN: [-7, 3],
  hipF: [8, 1],
  thigh: 84,
  shin: 80,
  ankle: 7,
  foot: 30,
  neck: [4, -106],
  headPivot: [7, -122],
  shN: [-11, -97],
  shF: [10, -98],
  upper: 60,
  fore: 53,
  hand: 19,
  headScale: 1.1,
  footN: -6,
  footF: 9,
  step: 88,
  walkDrop: 6,
  lift: 11,
}

export const MAN: BodySpec = {
  kind: 'man',
  pelvisY: -184,
  hipN: [-8, 3],
  hipF: [9, 1],
  thigh: 90,
  shin: 86,
  ankle: 8,
  foot: 34,
  neck: [4, -116],
  headPivot: [7, -132],
  shN: [-15, -105],
  shF: [13, -106],
  upper: 66,
  fore: 58,
  hand: 21,
  headScale: 1.13,
  footN: -7,
  footF: 11,
  step: 96,
  walkDrop: 6,
  lift: 12,
}
