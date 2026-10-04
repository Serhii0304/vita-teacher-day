import { solveIK, type IKResult } from '../engine/ik'
import { clamp, smoothstep } from '../engine/math'
import type { Params } from '../engine/moves'
import type { BodySpec } from './body'

/**
 * Геометрія ригу для режисури: де у світі опиниться кисть/предмет, і яку ціль задати руці,
 * щоб предмет опинився в потрібній точці (наприклад, передача букета з рук у руки).
 * Формули повторюють Character.apply (без дрібних «живих» коливань).
 */
const D = Math.PI / 180

const rot = (x: number, y: number, deg: number): [number, number] => {
  const c = Math.cos(deg * D)
  const s = Math.sin(deg * D)
  return [x * c - y * s, x * s + y * c]
}

export function charToWorld(p: Params, cx: number, cy: number): [number, number] {
  const flip = p.flip >= 0 ? 1 : -1
  return [p.x + flip * p.sc * cx, p.y + p.sc * cy]
}

export function worldToChar(p: Params, wx: number, wy: number): [number, number] {
  const flip = p.flip >= 0 ? 1 : -1
  return [(wx - p.x) / (flip * p.sc), (wy - p.y) / p.sc]
}

export function torsoToChar(p: Params, body: BodySpec, tx: number, ty: number): [number, number] {
  const [rx, ry] = rot(tx, ty, p.lean)
  return [p.px + rx, body.pelvisY + p.py + ry]
}

export function charToTorso(p: Params, body: BodySpec, cx: number, cy: number): [number, number] {
  return rot(cx - p.px, cy - (body.pelvisY + p.py), -p.lean)
}

/** Наскільки лікоть може відійти за лінію плеча (од.), коли рука тримає предмет перед собою. */
const ELBOW_BACK = 6

export interface ArmChain {
  /** Масштаби довжини плеча й передпліччя (перспективне скорочення). */
  k1: number
  k2: number
  ik: IKResult
}

/**
 * Ланцюг руки (плече → лікоть → зап’ястя) у системі торса, відносно плечового суглоба.
 * fs — скорочення всієї руки, спрямованої до глядача (телефон біля вуха).
 *
 * Коли кисть попереду на рівні грудей чи живота (тримає книгу, букет, чашку, рука на серці),
 * передпліччя насправді спрямоване вперед-до глядача. Якщо малювати його на повну довжину,
 * лікоть «стирчить» далеко за спину — саме це виглядало неприродно. Тож передпліччя скорочується
 * рівно настільки, щоб лікоть лишився біля тулуба; кисть при цьому стоїть у тій самій точці.
 * Для опущених рук (стоїть, іде) обмеження плавно вимикається.
 */
export function armChain(body: BodySpec, hx: number, hy: number, fs: number): ArmChain {
  const k1 = 1 - 0.62 * clamp(fs)
  const k2 = 1 - 0.45 * clamp(fs)
  const L1 = body.upper * k1
  const ik = solveIK(0, 0, hx, hy, L1, body.fore * k2, 1)
  const reach = body.upper + body.fore
  // вага обмеження: передпліччя спрямоване вперед (кисть попереду ліктя), а кисть піднята
  // вище за звичне «опущене» положення (у ході й у спокої рука висить вільно)
  const w = smoothstep(4, 16, hx - ik.jx) * (1 - smoothstep(0.8 * reach, 0.93 * reach, hy))
  const limit = -ELBOW_BACK - (1 - w) * 80
  if (w <= 0 || ik.jx >= limit) return { k1, k2, ik }
  // найкоротше передпліччя, з яким кисть ще дістає до цілі
  const d = Math.hypot(hx, hy)
  let lo = Math.max(0.3, Math.min(k2, (d - L1 * 0.9995) / body.fore + 0.01))
  let hi = k2
  let best = solveIK(0, 0, hx, hy, L1, body.fore * lo, 1)
  if (best.jx < limit) return { k1, k2: lo, ik: best }
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    const r = solveIK(0, 0, hx, hy, L1, body.fore * mid, 1)
    if (r.jx >= limit) {
      lo = mid
      best = r
    } else hi = mid
  }
  return { k1, k2: lo, ik: best }
}

const handScale = (body: BodySpec) => (body.kind === 'woman' ? 1 : 1.12)
const GRIP: [number, number] = [1.5, 13.5]

/** Точка хвату (де тримається предмет) у світових координатах; кисть в абсолютному режимі (nA=1). */
export function gripWorld(p: Params, body: BodySpec, side: 'n' | 'f'): [number, number] {
  const sh = side === 'n' ? body.shN : body.shF
  const hx = side === 'n' ? p.nhx : p.fhx
  const hy = side === 'n' ? p.nhy : p.fhy
  const w = side === 'n' ? p.nw : p.fw
  // зап’ястя (з урахуванням досяжності руки)
  const fs = (side === 'n' ? p.nFS : p.fFS) ?? 0
  const { k1, k2 } = armChain(body, hx, hy, fs)
  const L = (body.upper * k1 + body.fore * k2) * 0.9995
  const d = Math.hypot(hx, hy) || 1
  const k = Math.min(1, L / d)
  const [wx, wy] = torsoToChar(p, body, sh[0] + hx * k, sh[1] + hy * k)
  const hs = handScale(body)
  const [gx, gy] = rot(GRIP[0] * hs, GRIP[1] * hs, w)
  return charToWorld(p, wx + gx, wy + gy)
}

/** Ціль руки (відносно плеча), за якої точка хвату опиниться у світовій точці (wx, wy). */
export function targetForGrip(p: Params, body: BodySpec, side: 'n' | 'f', wx: number, wy: number, handAbs: number): { hx: number; hy: number } {
  const [cx, cy] = worldToChar(p, wx, wy)
  const hs = handScale(body)
  const [gx, gy] = rot(GRIP[0] * hs, GRIP[1] * hs, handAbs)
  const [tx, ty] = charToTorso(p, body, cx - gx, cy - gy)
  const sh = side === 'n' ? body.shN : body.shF
  return { hx: tx - sh[0], hy: ty - sh[1] }
}

/** Ціль руки, щоб тримати телефон біля ближнього вуха. */
export function phoneAtEarTarget(body: BodySpec): { hx: number; hy: number; w: number } {
  const hs = body.headScale
  const earX = body.headPivot[0] + -12.5 * hs
  const earY = body.headPivot[1] + -14 * hs
  // кисть «дивиться» вгору (180°), телефон у долоні на ~11 од. від зап’ястя
  const wristX = earX + 1.5
  const wristY = earY + 12.5 * (body.kind === 'woman' ? 1 : 1.12)
  return { hx: wristX - body.shN[0], hy: wristY - body.shN[1], w: 172 }
}
