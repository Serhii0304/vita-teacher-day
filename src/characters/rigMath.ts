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
  const L = (body.upper * (1 - 0.62 * fs) + body.fore * (1 - 0.45 * fs)) * 0.9995
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
