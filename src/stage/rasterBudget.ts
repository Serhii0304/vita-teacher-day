import type { SceneEnvelope, ViewBox } from './envelope'
import type { Screen } from './types'

// These are backing-store pixels, not CSS pixels. DPR must never multiply them.
export const STATIC_MAX_EDGE = 2048
export const STATIC_MAX_PIXELS = 2 * 1024 * 1024

export function bitmapSize(cssW: number, cssH: number) {
  const scale = Math.min(1.75, STATIC_MAX_EDGE / cssW, STATIC_MAX_EDGE / cssH,
    Math.sqrt(STATIC_MAX_PIXELS / (cssW * cssH)))
  return { width: Math.max(1, Math.floor(cssW * scale)), height: Math.max(1, Math.floor(cssH * scale)) }
}

/** Keep moving SVG geometry in a screen-sized surface, in its original stacking order. */
export function viewportWorld(env: SceneEnvelope, vb: ViewBox, scr: Screen) {
  const screenScale = scr.w / vb[2]
  const pad = 12
  const worldPad = pad / screenScale
  const x = vb[0] - worldPad
  const y = vb[1] - worldPad
  const scale = env.k / screenScale
  return {
    width: scr.w + pad * 2,
    height: scr.h + pad * 2,
    box: [x, y, vb[2] + 2 * worldPad, vb[3] + 2 * worldPad] as ViewBox,
    viewBox: `${x.toFixed(3)} ${y.toFixed(3)} ${(vb[2] + 2 * worldPad).toFixed(3)} ${(vb[3] + 2 * worldPad).toFixed(3)}`,
    transform: `translate(${((x - env.x) * env.k).toFixed(3)}px, ${((y - env.y) * env.k).toFixed(3)}px) scale(${scale.toFixed(7)})`,
  }
}
