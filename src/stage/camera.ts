import { ease as E, lerp, type Ease } from '../engine/math'
import { Track } from '../engine/moves'
import type { Rect, Screen } from './types'

/** Траєкторія камери як функція часу (кадр задається прямокутником-фокусом). */
export class CamTrack {
  private tr: Track
  private out: Record<string, number> = {}
  constructor(start: Rect) {
    this.tr = new Track(toP(start))
  }
  to(from: number, to: number, r: Rect, easing: Ease = E.inOutSine): this {
    this.tr.to(from, to, toP(r), easing)
    return this
  }
  set(at: number, r: Rect): this {
    this.tr.set(at, toP(r))
    return this
  }
  at(t: number): Rect {
    const p = this.tr.eval(t, this.out)
    // масштаб інтерполюємо в лог-просторі, щоб наїзд камери був рівномірним
    return { x: p.cx - Math.exp(p.lw) / 2, y: p.cy - Math.exp(p.lh) / 2, w: Math.exp(p.lw), h: Math.exp(p.lh) }
  }
}
const toP = (r: Rect) => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2, lw: Math.log(r.w), lh: Math.log(r.h) })

/**
 * Камера: вписує «фокус» (обличчя, руки, предмети) у вільну частину екрана над субтитрами,
 * а решту екрана заповнює середовищем сцени. Повертає viewBox з тим самим співвідношенням сторін, що й екран.
 */
export function cameraViewBox(focus: Rect, scr: Screen): [number, number, number, number] {
  const availH = Math.max(80, scr.h - scr.reservedBottom - scr.reservedTop)
  const s = Math.min(scr.w / focus.w, availH / focus.h)
  const vw = scr.w / s
  const vh = scr.h / s
  const x = focus.x + focus.w / 2 - vw / 2
  const y = focus.y + focus.h / 2 - (scr.reservedTop + availH / 2) / s
  return [x, y, vw, vh]
}

export const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  w: lerp(a.w, b.w, p),
  h: lerp(a.h, b.h, p),
})

/** Прямокутник за центром і розміром. */
export const rc = (cx: number, cy: number, w: number, h: number): Rect => ({ x: cx - w / 2, y: cy - h / 2, w, h })
