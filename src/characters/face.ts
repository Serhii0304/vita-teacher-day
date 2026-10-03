import { clamp, lerp } from '../engine/math'

/**
 * Параметрична голова 2.5D.
 * Модель: обличчя лежить на «циліндрі» з радіусом R, який повертається на кут θ.
 * turn = 0 — майже анфас, turn = 1 — три чверті в бік погляду (+x).
 * Система координат голови: початок — верх шиї (точка обертання), y донизу.
 */
export interface FaceParams {
  turn: number
  smile: number
  open: number
  brow: number
  browIn: number
  eye: number
  squint: number
  lookX: number
  lookY: number
}

export interface FaceStyle {
  kind: 'woman' | 'man'
  eyeW: number
  eyeH: number
  R: number
}

export interface Pt {
  x: number
  y: number
}

const D2R = Math.PI / 180

export function faceAngle(turn: number) {
  return lerp(6, 40, clamp(turn)) * D2R
}

export const r = (v: number) => Math.round(v * 100) / 100

/** Плавний замкнений/відкритий контур через точки (Catmull–Rom → кубічні Безьє). */
export function smoothPath(pts: Pt[], closed: boolean, k = 1): string {
  const n = pts.length
  if (n < 2) return ''
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = `M${r(pts[0].x)} ${r(pts[0].y)}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    const c1x = p1.x + ((p2.x - p0.x) / 6) * k
    const c1y = p1.y + ((p2.y - p0.y) / 6) * k
    const c2x = p2.x - ((p3.x - p1.x) / 6) * k
    const c2y = p2.y - ((p3.y - p1.y) / 6) * k
    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2.x)} ${r(p2.y)}`
  }
  if (closed) d += 'Z'
  return d
}

export interface HeadGeo {
  th: number
  s: number
  c: number
  eyeY: number
  eyeN: Pt
  eyeF: Pt
  wN: number
  wF: number
  nose: Pt
  mouth: Pt
  mN: Pt
  mF: Pt
  chin: Pt
  ear: Pt
  cranium: Pt
  cheekN: Pt
  cheekF: Pt
}

export function headGeo(turn: number, st: FaceStyle): HeadGeo {
  const th = faceAngle(turn)
  const s = Math.sin(th)
  const c = Math.cos(th)
  const R = st.R
  const ax = 1
  const man = st.kind === 'man'
  const eyeY = man ? -19.5 : -19
  const beta = 29 * D2R
  const eyeN = { x: ax + R * Math.sin(th - beta), y: eyeY }
  const eyeF = { x: ax + R * Math.sin(th + beta), y: eyeY - 0.2 }
  const wN = st.eyeW * (0.52 + 0.48 * Math.cos(th - beta))
  const wF = st.eyeW * (0.52 + 0.48 * Math.cos(th + beta))
  const nose = { x: ax + (R + 3.6) * s, y: man ? -7.6 : -8.3 }
  const mR = R * 0.86
  const gamma = (man ? 22 : 20) * D2R
  const my = man ? -2.4 : -3
  const mouth = { x: ax + mR * s, y: my }
  const mN = { x: ax + mR * Math.sin(th - gamma), y: my }
  const mF = { x: ax + mR * Math.sin(th + gamma), y: my }
  const chin = { x: ax + R * 0.74 * s, y: man ? 6.4 : 5.2 }
  const ear = { x: ax - R * c - 4.8, y: -14.5 }
  const cranium = { x: ax - 4.5 * s, y: -22 }
  const cheekN = { x: ax + R * 0.8 * Math.sin(th - 38 * D2R), y: -10.2 }
  const cheekF = { x: ax + R * 0.82 * Math.sin(th + 48 * D2R), y: -10.2 }
  return { th, s, c, eyeY, eyeN, eyeF, wN, wF, nose, mouth, mN, mF, chin, ear, cranium, cheekN, cheekF }
}

/** Контур «маски» обличчя (лоб, вилиці, щоки, підборіддя). Череп малюється окремим еліпсом. */
export function faceOutline(g: HeadGeo, st: FaceStyle): string {
  const { s, c, chin } = g
  const R = st.R
  const ax = 1
  const man = st.kind === 'man'
  const jw = man ? 1.1 : 1
  const pts: Pt[] = [
    { x: ax + 6 * s, y: -38 },
    { x: ax + R * 0.96 + 0.4 * s, y: -30 },
    { x: ax + R * 1.0 + 1.1 * s, y: -18 },
    { x: ax + R * (man ? 0.95 : 0.9) + 1.0 * s, y: -9 },
    { x: ax + R * (man ? 0.8 : 0.72) * jw + 2.2 * s, y: man ? -1 : -1.6 },
    { x: chin.x + (3.4 * c + 0.8) * jw, y: chin.y - (man ? 1.2 : 1.6) },
    { x: chin.x + 0.4, y: chin.y + 0.2 },
    { x: chin.x - 3.8 * c * jw, y: chin.y - 1.2 },
    { x: ax + R * 0.92 * jw * Math.sin(g.th - 78 * D2R), y: man ? -3 : -4.4 },
    { x: ax + R * Math.sin(g.th - 92 * D2R), y: -15 },
    { x: ax + R * 0.98 * Math.sin(g.th - 95 * D2R), y: -30 },
  ]
  return smoothPath(pts, true)
}

export interface EyeShapes {
  outline: string
  lash: string
  lid: string
  crease: string
  lower: string
  flicks: string
  iris: Pt
  irisR: number
}

/** Око. near=true — ближче до глядача (зліва на зображенні при погляді вправо). */
export function eyeShapes(center: Pt, w: number, st: FaceStyle, p: FaceParams, near: boolean): EyeShapes {
  const dir = near ? 1 : -1 // напрям до перенісся
  const woman = st.kind === 'woman'
  const open = clamp(p.eye, 0, 1.25)
  const squint = clamp(p.squint + Math.max(0, p.smile) * 0.3, 0, 1)
  const h = st.eyeH
  const tiltUp = woman ? 0.55 : 0.25
  const inner = { x: center.x + dir * w * 0.5, y: center.y + 0.45 }
  const outer = { x: center.x - dir * w * 0.5, y: center.y - tiltUp }
  const upH = h * open * (1 - squint * 0.18)
  const lowSag = h * 0.5 * (1 - squint * 0.8)
  const pkx = lerp(inner.x, outer.x, 0.45)
  const upY = center.y - upH
  const c1 = { x: lerp(inner.x, pkx, 0.25), y: upY + 0.2 }
  const c2 = { x: lerp(pkx, outer.x, 0.6), y: upY + 0.1 }
  const lowY = center.y + lowSag + (1 - open) * 0.3
  const l1 = { x: lerp(outer.x, inner.x, 0.3), y: lowY + 0.1 }
  const l2 = { x: lerp(outer.x, inner.x, 0.78), y: lowY - 0.2 }
  const outline =
    `M${r(inner.x)} ${r(inner.y)}` +
    `C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(outer.x)} ${r(outer.y)}` +
    `C${r(l1.x)} ${r(l1.y)} ${r(l2.x)} ${r(l2.y)} ${r(inner.x)} ${r(inner.y)}Z`
  // лінія вій: товщає до зовнішнього кута (замкнена фігура)
  const th = woman ? 1.25 : 0.75
  const lash =
    `M${r(inner.x - dir * 0.3)} ${r(inner.y - 0.05)}` +
    `C${r(c1.x)} ${r(c1.y - 0.15)} ${r(c2.x)} ${r(c2.y - 0.25)} ${r(outer.x - dir * (woman ? 1.6 : 0.5))} ${r(outer.y - (woman ? 1.1 : 0.3))}` +
    `C${r(c2.x - dir * 0.2)} ${r(c2.y - th - 0.5)} ${r(c1.x)} ${r(c1.y - th * 0.9)} ${r(inner.x - dir * 0.3)} ${r(inner.y - 0.05)}Z`
  // верхня повіка (м’яка тінь між складкою і віями)
  const creaseY = upY - (woman ? 2.2 : 1.8) - (1 - Math.min(1, open)) * 0.7
  const lid =
    `M${r(inner.x - dir * 0.4)} ${r(inner.y - 0.4)}` +
    `C${r(c1.x)} ${r(c1.y - 0.2)} ${r(c2.x)} ${r(c2.y - 0.3)} ${r(outer.x - dir * 0.3)} ${r(outer.y - 0.3)}` +
    `Q${r(pkx - dir * 0.6)} ${r(creaseY - 1.6)} ${r(inner.x - dir * 0.4)} ${r(inner.y - 0.4)}Z`
  const crease = `M${r(lerp(inner.x, outer.x, 0.12))} ${r(creaseY + 1.2)}Q${r(pkx)} ${r(creaseY - 0.9)} ${r(outer.x + dir * 0.2)} ${r(outer.y - 1.3)}`
  const lower = `M${r(outer.x + dir * 0.9)} ${r(outer.y + 0.7)}Q${r(lerp(outer.x, inner.x, 0.5))} ${r(lowY + 0.6)} ${r(inner.x - dir * 1)} ${r(inner.y + 0.35)}`
  const fl = 0
  const ox = outer.x - dir * 1.4
  const oy = outer.y - 1
  const flicks = fl
    ? `M${r(ox)} ${r(oy)}l${r(-dir * 1.5)} ${r(-1.1)}M${r(ox + dir * 1.3)} ${r(oy - 0.5)}l${r(-dir * 1.1)} ${r(-1.4)}M${r(ox + dir * 2.6)} ${r(oy - 0.9)}l${r(-dir * 0.6)} ${r(-1.3)}`
    : ''
  const irisR = h * (woman ? 0.9 : 0.92)
  const iris = {
    x: center.x + clamp(p.lookX, -1, 1) * w * 0.2 + dir * 0.2,
    y: center.y + clamp(p.lookY, -1, 1) * 0.7 + 0.2,
  }
  return { outline, lash, lid, crease, lower, flicks, iris, irisR }
}

/** Брова — замкнена фігура, що звужується до хвостика. */
export function browPath(center: Pt, w: number, st: FaceStyle, p: FaceParams, near: boolean): string {
  const dir = near ? 1 : -1
  const raise = clamp(p.brow, -1, 1)
  const inn = clamp(p.browIn, 0, 1)
  const man = st.kind === 'man'
  const base = center.y - (man ? 5.4 : 6.2)
  const ix = center.x + dir * (w * 0.56 + 0.3)
  const ox = center.x - dir * (w * 0.66 + (man ? 0.8 : 1.3))
  const iy = base - raise * 1.5 - inn * 2 + Math.max(0, p.smile) * 0.2
  const pky = base - (man ? 1.2 : 2.1) - raise * 1.9 - inn * 0.3
  const oy = base + (man ? 0.2 : 0.6) - raise * 1.1 + inn * 0.8
  const px = lerp(ix, ox, man ? 0.55 : 0.6)
  const thick = man ? 1.75 : 1.05
  const tip = man ? 0.6 : 0.25
  return (
    `M${r(ix)} ${r(iy + thick * 0.5)}` +
    `Q${r(lerp(ix, px, 0.5))} ${r(pky + thick * 0.35)} ${r(px)} ${r(pky + thick * 0.65)}` +
    `Q${r(lerp(px, ox, 0.55))} ${r(lerp(pky, oy, 0.4) + thick * 0.4)} ${r(ox)} ${r(oy + tip)}` +
    `Q${r(lerp(px, ox, 0.5))} ${r(lerp(pky, oy, 0.35) - thick * 0.3)} ${r(px)} ${r(pky - thick * 0.45)}` +
    `Q${r(lerp(ix, px, 0.45))} ${r(pky - thick * 0.3)} ${r(ix + dir * 0.1)} ${r(iy - thick * 0.55)}Z`
  )
}

export interface MouthShapes {
  upper: string
  lower: string
  inner: string
  teeth: string
  line: string
  hi: string
  dimN: string
  showInner: boolean
}

export function mouthShapes(g: HeadGeo, st: FaceStyle, p: FaceParams, openAmt: number): MouthShapes {
  const man = st.kind === 'man'
  const smile = clamp(p.smile, -0.6, 1)
  const o = clamp(openAmt, 0, 1)
  const sp = Math.max(0, smile)
  const widen = sp * 1.1 + o * 0.25
  const nx = g.mN.x - widen * (0.65 + 0.35 * g.c)
  const fx = g.mF.x + widen * 0.5 * g.c
  const cx = g.mouth.x
  const y0 = g.mouth.y
  const cornerY = y0 - smile * 1.8 + Math.max(0, -smile) * 0.5
  const midY = y0 + sp * 0.95
  const gapTop = midY - o * 0.8
  const gapBot = midY + o * 4.4 + sp * o * 0.9
  const upT = man ? 0.9 : 1.55
  const lowT = man ? 1.6 : 2.4
  const bowL = lerp(nx, cx, 0.6)
  const bowR = lerp(cx, fx, 0.45)
  const upper =
    `M${r(nx)} ${r(cornerY)}` +
    `C${r(lerp(nx, bowL, 0.4))} ${r(midY - upT * 0.5)} ${r(lerp(nx, bowL, 0.75))} ${r(midY - upT - 0.2)} ${r(bowL)} ${r(midY - upT - 0.25)}` +
    `Q${r(cx - 0.2)} ${r(midY - upT * 0.45)} ${r(bowR)} ${r(midY - upT - 0.2)}` +
    `C${r(lerp(bowR, fx, 0.35))} ${r(midY - upT - 0.1)} ${r(lerp(bowR, fx, 0.7))} ${r(midY - upT * 0.4)} ${r(fx)} ${r(cornerY)}` +
    `Q${r(cx)} ${r(gapTop + 0.7)} ${r(nx)} ${r(cornerY)}Z`
  const lower =
    `M${r(nx + 0.4)} ${r(cornerY + 0.25)}` +
    `Q${r(cx)} ${r(gapBot + 0.5)} ${r(fx - 0.3)} ${r(cornerY + 0.2)}` +
    `C${r(lerp(cx, fx, 0.7))} ${r(gapBot + lowT * 0.7)} ${r(lerp(cx, fx, 0.25))} ${r(gapBot + lowT + 0.2)} ${r(cx - 0.4)} ${r(gapBot + lowT)}` +
    `C${r(lerp(nx, cx, 0.55))} ${r(gapBot + lowT - 0.1)} ${r(lerp(nx, cx, 0.2))} ${r(gapBot + lowT * 0.6)} ${r(nx + 0.4)} ${r(cornerY + 0.25)}Z`
  const inner =
    `M${r(nx + 0.3)} ${r(cornerY + 0.1)}` +
    `Q${r(cx)} ${r(gapTop - 0.2)} ${r(fx - 0.2)} ${r(cornerY + 0.1)}` +
    `Q${r(cx)} ${r(gapBot + 0.7)} ${r(nx + 0.3)} ${r(cornerY + 0.1)}Z`
  const tth = Math.min(1.9, o * 3.1 + Math.max(0, smile - 0.3) * 0.9)
  const teeth =
    `M${r(lerp(nx, cx, 0.22))} ${r(gapTop + 0.1)}` +
    `Q${r(cx)} ${r(gapTop - 0.25)} ${r(lerp(cx, fx, 0.78))} ${r(gapTop + 0.1)}` +
    `L${r(lerp(cx, fx, 0.72))} ${r(gapTop + tth)}` +
    `Q${r(cx)} ${r(gapTop + tth + 0.45)} ${r(lerp(nx, cx, 0.28))} ${r(gapTop + tth)}Z`
  const line = `M${r(nx - 0.5)} ${r(cornerY - 0.1)}Q${r(cx)} ${r(midY + 0.45 + o * 0.5)} ${r(fx + 0.35)} ${r(cornerY - 0.15)}`
  const hi = `M${r(lerp(nx, cx, 0.55))} ${r(gapBot + lowT * 0.45)}Q${r(cx)} ${r(gapBot + lowT * 0.25)} ${r(lerp(cx, fx, 0.3))} ${r(gapBot + lowT * 0.45)}`
  const dimN = `M${r(nx - 0.6)} ${r(cornerY - 1.1)}Q${r(nx - 1.6)} ${r(cornerY)} ${r(nx - 0.7)} ${r(cornerY + 1.2)}`
  return { upper, lower, inner, teeth, line, hi, dimN, showInner: o > 0.04 }
}

/** Ніс: м’яка тінь з ближнього боку, кінчик, крило і ніздря. */
export function noseShapes(g: HeadGeo, st: FaceStyle) {
  const { nose, s, eyeN, eyeF } = g
  const man = st.kind === 'man'
  const k = man ? 1.12 : 1
  const bridgeX = lerp(eyeN.x, eyeF.x, 0.6)
  const bridge = `M${r(bridgeX + 1.2)} ${r(g.eyeY - 1.5)}Q${r(nose.x + 1.0 * s + 0.6)} ${r(-13.5)} ${r(nose.x + 1.3)} ${r(nose.y - 1)}`
  const nostril = `M${r(nose.x - 2.9 * k)} ${r(nose.y + 0.5)}Q${r(nose.x - 1.6 * k)} ${r(nose.y + 1.7)} ${r(nose.x - 0.3)} ${r(nose.y + 0.9)}Q${r(nose.x - 1.4 * k)} ${r(nose.y + 0.4)} ${r(nose.x - 2.9 * k)} ${r(nose.y + 0.5)}Z`
  const wing = `M${r(nose.x - 4 * k)} ${r(nose.y - 2.2)}Q${r(nose.x - 5.3 * k)} ${r(nose.y - 0.2)} ${r(nose.x - 3.6 * k)} ${r(nose.y + 0.9)}`
  const tip = `M${r(nose.x - 3.4 * k)} ${r(nose.y + 0.2)}Q${r(nose.x - 0.8)} ${r(nose.y + 2.4)} ${r(nose.x + 1.4)} ${r(nose.y - 0.2)}`
  const shade =
    `M${r(bridgeX - 1.6)} ${r(g.eyeY + 0.5)}` +
    `Q${r(nose.x - 3.4)} ${r(-13)} ${r(nose.x - 4.4 * k)} ${r(nose.y - 1.4)}` +
    `Q${r(nose.x - 1.6)} ${r(nose.y + 0.6)} ${r(nose.x + 0.4)} ${r(nose.y - 0.6)}` +
    `Q${r(nose.x - 1.4)} ${r(-13.5)} ${r(bridgeX + 0.6)} ${r(g.eyeY - 0.5)}Z`
  const hl = { x: nose.x - 0.4, y: nose.y - 1.6 }
  return { bridge, nostril, wing, tip, shade, hl }
}
