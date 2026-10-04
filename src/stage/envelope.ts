import type { Screen } from './types'

/*
 * Межі растру сцени та трансформація камери (чисті функції — перевіряються тестами).
 * Камера більше не змінює viewBox щокадру: ілюстрація растризується один раз у «конверті»,
 * що покриває всі кадри камери в епізоді, а рух камери — це translate + scale ≤ 1 композитного шару.
 */
export type ViewBox = [number, number, number, number]
export type ViewFn = (t: number, scr: Screen) => ViewBox

export interface SceneEnvelope {
  /** Світовий прямокутник, який покриває всі кадри камери в цьому епізоді. */
  x: number
  y: number
  w: number
  h: number
  /** Скільки CSS-пікселів шару припадає на одиницю світу (роздільність растеризації). */
  k: number
}

/** Найбільша сторона шару в CSS-пікселях (далі знижуємо роздільність, щоб не витрачати пам’ять GPU). */
const MAX_LAYER_PX = 12000

export function computeEnvelope(view: ViewFn, from: number, to: number, scr: Screen, quality: number): SceneEnvelope {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  let smax = 0
  const step = 0.1
  for (let t = from; t <= to + 1e-6; t += step) {
    const vb = view(t, scr)
    if (vb[0] < x0) x0 = vb[0]
    if (vb[1] < y0) y0 = vb[1]
    if (vb[0] + vb[2] > x1) x1 = vb[0] + vb[2]
    if (vb[1] + vb[3] > y1) y1 = vb[1] + vb[3]
    const s = scr.w / vb[2]
    if (s > smax) smax = s
  }
  const pad = Math.max(x1 - x0, y1 - y0) * 0.02
  x0 -= pad
  y0 -= pad
  x1 += pad
  y1 += pad
  const w = x1 - x0
  const h = y1 - y0
  let k = Math.max(0.05, smax * quality)
  const longest = Math.max(w, h) * k
  if (longest > MAX_LAYER_PX) k *= MAX_LAYER_PX / longest
  return { x: x0, y: y0, w, h, k }
}

/** Трансформація шару для поточного кадру камери (viewBox → екран). */
export function cameraTransform(env: SceneEnvelope, vb: ViewBox, scr: Screen): string {
  const S = scr.w / vb[2]
  const m = S / env.k
  const tx = (env.x - vb[0]) * S
  const ty = (env.y - vb[1]) * S
  return `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${m.toFixed(5)})`
}

/** Якість растеризації: на телефонах із дуже щільним екраном достатньо ~1,75× (ілюстрація мальовнича, текст — окремо). */
export function rasterQuality(compact: boolean): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return compact ? Math.min(1, 1.75 / dpr) : 1
}
