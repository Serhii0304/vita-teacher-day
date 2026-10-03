/**
 * Двокісткова інверсна кінематика у 2D (SVG-координати: y донизу).
 *
 * Повертає кути (у градусах) для сегментів, намальованих «вниз» (+y) у своїй локальній системі:
 * rot = 0 — кістка вертикально вниз; додатне значення — обертання за годинниковою стрілкою (SVG rotate).
 */
export interface IKResult {
  /** Абсолютний поворот першої кістки (стегно / плече). */
  a: number
  /** Поворот другої кістки відносно першої (коліно / лікоть). */
  b: number
  /** Абсолютний поворот другої кістки. */
  bAbs: number
  /** Положення середнього суглоба. */
  jx: number
  jy: number
}

const R2D = 180 / Math.PI

/**
 * @param ax,ay  корінь ланцюга (кульшовий / плечовий суглоб)
 * @param tx,ty  ціль (кісточка / зап'ястя)
 * @param l1,l2  довжини кісток
 * @param bend   напрям згину: -1 — суглоб вперед (коліно при погляді вправо), +1 — назад/вниз (лікоть)
 */
export function solveIK(ax: number, ay: number, tx: number, ty: number, l1: number, l2: number, bend: number): IKResult {
  let dx = tx - ax
  let dy = ty - ay
  let d = Math.hypot(dx, dy)
  const maxD = (l1 + l2) * 0.9995
  const minD = Math.abs(l1 - l2) + 0.5
  if (d < 1e-6) {
    dx = 0
    dy = 1
    d = minD
  }
  const dc = Math.min(maxD, Math.max(minD, d))
  const phi = Math.atan2(dy, dx)
  const cosA = (l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc)
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)))
  const th1 = phi + bend * alpha
  const jx = ax + l1 * Math.cos(th1)
  const jy = ay + l1 * Math.sin(th1)
  // друга кістка дивиться на ціль (якщо ціль поза досяжністю — на неї ж, але кінець не дотягнеться)
  const ex = ax + (dx / d) * dc
  const ey = ay + (dy / d) * dc
  const th2 = Math.atan2(ey - jy, ex - jx)
  const a = th1 * R2D - 90
  const bAbs = th2 * R2D - 90
  let b = bAbs - a
  while (b > 180) b -= 360
  while (b < -180) b += 360
  return { a, b, bAbs, jx, jy }
}

/** Обертання точки (x, y) навколо (cx, cy) на кут deg (SVG: за годинниковою стрілкою). */
export function rotatePoint(x: number, y: number, cx: number, cy: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const dx = x - cx
  const dy = y - cy
  return [cx + dx * c - dy * s, cy + dx * s + dy * c]
}
