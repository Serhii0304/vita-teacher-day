import test from 'node:test'
import assert from 'node:assert/strict'
import { FramePacer } from '../src/stage/framePacer.ts'
import { sceneMounts } from '../src/stage/sceneMounts.ts'
import { setSvgAttribute } from '../src/stage/svgAttributes.ts'
import { cameraTransform, computeEnvelope, cropToEnvelope } from '../src/stage/envelope.ts'
import { armChain, gripWorld, targetForGrip } from '../src/characters/rigMath.ts'
import { MAN, WOMAN } from '../src/characters/body.ts'
import { restPose } from '../src/characters/pose.ts'

test('30 FPS budget stays stable on 60, 90, 120 and 144 Hz displays', () => {
  for (const hz of [60, 90, 120, 144]) {
    const pacer = new FramePacer()
    let draws = 0
    for (let i = 0; i < hz * 4; i++) if (pacer.take(i * 1000 / hz, 30)) draws++
    assert.ok(Math.abs(draws - 120) <= 1, `${hz} Hz produced ${draws} updates`)
  }
})

test('seek/pause invalidate immediately and a stall never queues catch-up frames', () => {
  const pacer = new FramePacer()
  assert.equal(pacer.take(0, 30), true)
  assert.equal(pacer.take(5, 30), false)
  assert.equal(pacer.take(6, 30, true), true)
  assert.equal(pacer.take(1000, 30), true)
  assert.equal(pacer.take(1001, 30), false)
  assert.equal(pacer.take(1010, 30), false)
  assert.equal(pacer.take(1034, 30), true)
})

test('desktop rendering is capped at 60 FPS, reduced motion at 12', () => {
  for (const fps of [60, 12]) {
    const pacer = new FramePacer()
    let draws = 0
    for (let i = 0; i < 240; i++) if (pacer.take(i * 1000 / 120, fps)) draws++
    assert.ok(Math.abs(draws - fps * 2) <= 1)
  }
})

const schedule = [
  { id: 'book', start: 0, fadeIn: 0 },
  { id: 'classroom', start: 10, fadeIn: 1.5 },
  { id: 'evening', start: 30, fadeIn: 3.2 },
  { id: 'garden', start: 50, fadeIn: 2.4 },
]

test('prewarm, crossfade, final frame and arbitrary backwards seek retain required scenes', () => {
  assert.deepEqual(sceneMounts(schedule, 0), ['book'])
  assert.deepEqual(sceneMounts(schedule, 4.99), ['book'])
  assert.deepEqual(sceneMounts(schedule, 5), ['book', 'classroom'])
  assert.deepEqual(sceneMounts(schedule, 8), ['book', 'classroom'])
  assert.deepEqual(sceneMounts(schedule, 10), ['book', 'classroom'])
  assert.deepEqual(sceneMounts(schedule, 11.49), ['book', 'classroom'])
  assert.deepEqual(sceneMounts(schedule, 11.5), ['classroom'])
  assert.deepEqual(sceneMounts(schedule, 31), ['classroom', 'evening'])
  assert.deepEqual(sceneMounts(schedule, 223.2), ['garden'])
  assert.deepEqual(sceneMounts(schedule, 15), ['classroom'])
  assert.deepEqual(sceneMounts(schedule, 0), ['book'])
})

test('unchanged geometry is not written; replacement elements still receive it', () => {
  const element = () => ({ values: new Map(), writes: 0,
    getAttribute(name) { return this.values.get(name) ?? null },
    setAttribute(name, value) { this.values.set(name, value); this.writes++ },
  })
  const a = element()
  setSvgAttribute(a, 'viewBox', '0 0 412 915')
  setSvgAttribute(a, 'viewBox', '0 0 412 915')
  assert.equal(a.writes, 1)
  setSvgAttribute(a, 'viewBox', '0 0 915 412')
  assert.equal(a.writes, 2)
  const b = element()
  setSvgAttribute(b, 'viewBox', '0 0 915 412')
  assert.equal(b.writes, 1)
})

const phone = { w: 390, h: 844, layout: 'tall', reservedBottom: 210, reservedTop: 20 }
const parse = (tr) => {
  const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px, 0\) scale\(([\d.]+)\)/.exec(tr)
  return { tx: Number(m[1]), ty: Number(m[2]), s: Number(m[3]) }
}

test('camera layer: every frame fits the raster envelope and is never upscaled at full quality', () => {
  // камера, що одночасно їде й наїжджає
  const view = (t) => {
    const w = 320 + 180 * Math.sin(t)
    return [t * 40 - w / 2, -w, w, (w * phone.h) / phone.w]
  }
  const env = computeEnvelope(view, 0, 10, phone, 1)
  for (let t = 0; t <= 10; t += 0.05) {
    const vb = view(t)
    assert.ok(vb[0] >= env.x - 0.5 && vb[1] >= env.y - 0.5, `t=${t}: frame starts outside the envelope`)
    assert.ok(vb[0] + vb[2] <= env.x + env.w + 0.5 && vb[1] + vb[3] <= env.y + env.h + 0.5, `t=${t}: frame ends outside the envelope`)
    const { s } = parse(cameraTransform(env, vb, phone))
    assert.ok(s <= 1.0002, `t=${t}: layer upscaled ${s}`)
  }
})

test('camera transform maps the view box exactly onto the screen', () => {
  const env = { x: -500, y: -400, w: 1000, h: 900, k: 1.5 }
  const vb = [-120, -200, 300, (300 * phone.h) / phone.w]
  const { tx, ty, s } = parse(cameraTransform(env, vb, phone))
  const toScreen = (wx, wy) => [tx + s * (wx - env.x) * env.k, ty + s * (wy - env.y) * env.k]
  const [x0, y0] = toScreen(vb[0], vb[1])
  const [x1, y1] = toScreen(vb[0] + vb[2], vb[1] + vb[3])
  assert.ok(Math.abs(x0) < 0.05 && Math.abs(y0) < 0.05)
  assert.ok(Math.abs(x1 - phone.w) < 0.05 && Math.abs(y1 - phone.h) < 0.05)
})

test('arms: holding something in front keeps the elbow by the torso and the wrist on target', () => {
  for (const body of [WOMAN, MAN]) {
    for (const [hx, hy] of [[26, 52], [24, 36], [16, 62], [22, 84], [14, 36]]) {
      const c = armChain(body, hx, hy, 0)
      assert.ok(c.ik.jx >= -6.05, `${body.kind}: elbow ${c.ik.jx.toFixed(1)} behind the back for ${hx},${hy}`)
      const L2 = body.fore * c.k2
      const a = ((c.ik.bAbs + 90) * Math.PI) / 180
      const wx = c.ik.jx + L2 * Math.cos(a)
      const wy = c.ik.jy + L2 * Math.sin(a)
      assert.ok(Math.hypot(wx - hx, wy - hy) < 0.5, `${body.kind}: wrist misses ${hx},${hy}`)
    }
    // вільно опущені руки й розмах рук під час ходи не змінюються
    const L = body.upper + body.fore
    for (const [hx, hy] of [[4, L - 5], [-3, L - 12], [19, L - 12], [8, L - 10]]) assert.equal(armChain(body, hx, hy, 0).k2, 1, `${body.kind}: ${hx},${hy}`)
  }
})

test('arms: a hand-over grip still lands exactly where the scene expects it', () => {
  for (const body of [WOMAN, MAN]) {
    const p = { ...restPose(body), x: 100, y: 20, flip: 1, nA: 1, nw: -90 }
    // точки передачі предмета перед грудьми (відносно плеча: вперед і трохи вниз)
    const sx = p.x + body.shN[0]
    const sy = p.y + body.pelvisY + body.shN[1]
    for (const [wx, wy] of [[sx + 62, sy + 34], [sx + 45, sy + 55], [sx + 30, sy + 62]]) {
      const t = targetForGrip(p, body, 'n', wx, wy, -90)
      const [gx, gy] = gripWorld({ ...p, nhx: t.hx, nhy: t.hy }, body, 'n')
      assert.ok(Math.hypot(gx - wx, gy - wy) < 0.6, `${body.kind}: grip ${gx.toFixed(1)},${gy.toFixed(1)} != ${wx},${wy}`)
    }
  }
})

test('light layers are cropped to what the camera can ever see, with room for motion', () => {
  const env = { x: -500, y: -800, w: 900, h: 1100 }
  // нерухоме тонування неба обрізається до конверта камери
  assert.deepEqual(cropToEnvelope({ x: -5000, y: -4000, w: 10000, h: 4000 }, env), { x: -500, y: -800, w: 900, h: 800 })
  // сонце, що опускається на 370 од., лишається покритим при будь-якому зсуві
  const sun = cropToEnvelope({ x: -1000, y: -1500, w: 3000, h: 1800 }, env, 400)
  for (let dy = 0; dy <= 370; dy += 37) assert.ok(sun.y + dy <= env.y && sun.y + sun.h + dy >= Math.min(300, env.y + env.h), `dy=${dy}`)
  // промені обертаються навколо сонця: квадрат обрізання покриває конверт за будь-якого кута
  const pivot = [860, -560]
  const rays = cropToEnvelope({ x: pivot[0] - 2200, y: pivot[1] - 2200, w: 4400, h: 4400 }, env, 0, pivot)
  const R = Math.min(rays.w, rays.h) / 2
  for (const [x, y] of [[env.x, env.y], [env.x + env.w, env.y], [env.x, env.y + env.h], [env.x + env.w, env.y + env.h]]) assert.ok(Math.hypot(x - pivot[0], y - pivot[1]) <= R + 1e-6)
  assert.ok(rays.w < 4400, 'rays layer got smaller')
})
