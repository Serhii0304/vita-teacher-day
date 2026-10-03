import test from 'node:test'
import assert from 'node:assert/strict'
import { FramePacer } from '../src/stage/framePacer.ts'
import { sceneMounts } from '../src/stage/sceneMounts.ts'
import { setSvgAttribute } from '../src/stage/svgAttributes.ts'

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
