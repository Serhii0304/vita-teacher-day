import test from 'node:test'
import assert from 'node:assert/strict'
import { createSvgPainter } from '../src/stage/paintSvg.ts'

// Deterministic Canvas/DOM doubles inspect geometry, paint order and state.
// Browser screenshots remain necessary for font/raster quality, not these rules.
class Path {
  static count = 0
  constructor(data = '') { this.data = data; this.ops = []; Path.count++ }
  moveTo(...v) { this.ops.push(['moveTo', ...v]) }
  lineTo(...v) { this.ops.push(['lineTo', ...v]) }
  rect(...v) { this.ops.push(['rect', ...v]) }
  roundRect(...v) { this.ops.push(['roundRect', ...v]) }
  ellipse(...v) { this.ops.push(['ellipse', ...v]) }
  closePath() { this.ops.push(['closePath']) }
  addPath(path, matrix) { this.ops.push(['addPath', path, matrix.values]) }
}
globalThis.Path2D = Path
globalThis.DOMMatrix = class { constructor(values) { this.values = values } }
const identity = () => [1, 0, 0, 1, 0, 0]
function multiply(a, b) {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]
}
function element(tag, attrs = {}, children = []) {
  const el = {
    localName: tag, attrs: { ...attrs }, children,
    style: { getPropertyValue(key) { return this[key] ?? '' } },
    childNodes: children,
    get id() { return this.attrs.id ?? '' },
    getAttribute(key) { return this.attrs[key] ?? null },
    hasAttribute(key) { return key in this.attrs },
    setAttribute(key, value) { this.attrs[key] = String(value) },
    closest() { let root = this; while (root.parent) root = root.parent; return root },
    querySelectorAll(selector) {
      const result = []
      const walk = node => {
        for (const child of node.children) {
          if ((selector === '[id]' && child.id) || child.localName === selector) result.push(child)
          walk(child)
        }
      }
      walk(this); return result
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null },
  }
  for (const child of children) child.parent = el
  return el
}
function context() {
  const ctx = {
    globalAlpha: 1, matrix: identity(), stack: [], draws: [], gradients: [], clips: [], dash: [],
    save() {
      this.stack.push(Object.fromEntries(Object.entries(this).filter(([k, v]) => typeof v !== 'function' && !['stack', 'draws', 'gradients', 'clips'].includes(k))))
    },
    restore() { Object.assign(this, this.stack.pop()) },
    transform(...matrix) { this.matrix = multiply(this.matrix, matrix) },
    translate(x, y) { this.transform(1, 0, 0, 1, x, y) },
    scale(x, y) { this.transform(x, 0, 0, y, 0, 0) },
    gradient(kind, args) {
      const gradient = { kind, args, matrix: [...this.matrix], stops: [], addColorStop(at, color) { this.stops.push([at, color]) } }
      this.gradients.push(gradient); return gradient
    },
    createLinearGradient(...args) { return this.gradient('linear', args) },
    createRadialGradient(...args) { return this.gradient('radial', args) },
    fill(path, rule) { this.draws.push({ kind: 'fill', path, rule, matrix: [...this.matrix], alpha: this.globalAlpha, paint: this.fillStyle }) },
    stroke(path) { this.draws.push({ kind: 'stroke', path, matrix: [...this.matrix], alpha: this.globalAlpha, paint: this.strokeStyle, width: this.lineWidth, dash: this.dash, offset: this.lineDashOffset }) },
    clip(path, rule) { this.clips.push({ path, rule, matrix: [...this.matrix] }) },
    setLineDash(values) { this.dash = values },
    measureText(text) { return { width: text.length * 10 } },
    fillText(text, x, y) { this.draws.push({ kind: 'text', text, x, y, font: this.font, align: this.textAlign, alpha: this.globalAlpha }) },
    strokeText(text, x, y) { this.draws.push({ kind: 'strokeText', text, x, y }) },
  }
  return ctx
}
const gradient = (id, attrs = {}) => element('linearGradient', { id, ...attrs }, [
  element('stop', { offset: '0', 'stop-color': '#fff' }),
  element('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': '0.5' }),
])

test('hidden SVG paints live rig attributes, retains paths, and restores caller state', () => {
  const path = element('path', { d: 'M0 0L10 0L10 10Z', fill: '#ff0000' })
  const actor = element('g', { transform: 'translate(10 20) scale(2)', opacity: '0.5' }, [path])
  const source = element('svg', { viewBox: '-999 -999 1998 1998', transform: 'scale(999)' }, [actor])
  source.style.display = 'none'; source.style.opacity = '0'
  const draw = createSvgPainter(source), ctx = context()
  ctx.translate(3, 4); draw(ctx)
  assert.equal(ctx.draws.length, 1)
  assert.deepEqual(ctx.draws[0].matrix, [2, 0, 0, 2, 13, 24])
  assert.equal(ctx.draws[0].alpha, 0.5)
  const initialPath = ctx.draws[0].path, count = Path.count
  draw(ctx)
  assert.equal(Path.count, count, 'steady frames retain their Path2D')
  assert.equal(ctx.draws[1].path, initialPath)
  path.setAttribute('d', 'M0 0L20 0L20 10Z')
  path.setAttribute('fill', '#00ff00')
  actor.style.opacity = '0.8'
  actor.setAttribute('transform', 'translate(30 40)')
  draw(ctx)
  assert.notEqual(ctx.draws[2].path, initialPath)
  assert.equal(ctx.draws[2].paint, '#00ff00')
  assert.equal(ctx.draws[2].alpha, 0.8)
  assert.deepEqual(ctx.draws[2].matrix, [1, 0, 0, 1, 33, 44])
  actor.style.display = 'none'; draw(ctx)
  assert.equal(ctx.draws.length, 3)
  assert.deepEqual(ctx.matrix, [1, 0, 0, 1, 3, 4])
  assert.equal(ctx.globalAlpha, 1)
  assert.equal(ctx.stack.length, 0)
})

test('external definitions, object-bounding gradients and Bezier extrema work without layout', () => {
  const defs = element('svg', {}, [element('defs', {}, [gradient('skin')])])
  const path = element('path', { d: 'M0 0 C0 100 100 100 100 0 Z', fill: 'url(#skin)' })
  const source = element('svg', {}, [path])
  element('div', {}, [defs, source])
  const draw = createSvgPainter(source), ctx = context()
  draw(ctx)
  assert.equal(ctx.gradients.length, 1)
  assert.deepEqual(ctx.gradients[0].matrix, [100, 0, 0, 75, 0, 0])
  assert.deepEqual(ctx.gradients[0].args, [0, 0, 1, 0])
  assert.equal(ctx.gradients[0].stops[1][1], 'rgba(0,0,0,0.5)')
  path.setAttribute('d', 'M10 20 q10 20 20 0 t20 0 h10 v20 h-50 z')
  draw(ctx)
  assert.deepEqual(ctx.gradients[1].matrix, [50, 0, 0, 30, 10, 10])
})

test('inherited strokes, dash offsets and fill rules survive nested transforms', () => {
  const shape = element('rect', { x: '1', y: '2', width: '10', height: '20', rx: '2', 'fill-rule': 'evenodd' })
  const group = element('g', { fill: '#123', stroke: '#abc', 'stroke-width': '3', 'stroke-dasharray': '2 4', 'stroke-dashoffset': '5', transform: 'rotate(90 2 3) skewX(0)' }, [shape])
  const ctx = context(); createSvgPainter(element('svg', {}, [group]))(ctx)
  assert.equal(ctx.draws[0].rule, 'evenodd')
  assert.equal(ctx.draws[0].path.ops[0][0], 'roundRect')
  assert.equal(ctx.draws[1].paint, '#abc')
  assert.equal(ctx.draws[1].width, 3)
  assert.deepEqual(ctx.draws[1].dash, [2, 4])
  assert.equal(ctx.draws[1].offset, 5)
  assert.ok(Math.abs(ctx.draws[0].matrix[4] - 5) < 1e-9)
  assert.ok(Math.abs(ctx.draws[0].matrix[5] - 1) < 1e-9)
})

test('eye clips follow changing paths while unchanged unions remain cached', () => {
  const eye = element('path', { d: 'M0 0Q5 -5 10 0Q5 5 0 0Z' })
  const clip = element('clipPath', { id: 'eye', transform: 'translate(1 2)' }, [eye])
  const iris = element('ellipse', { cx: '5', cy: '0', rx: '2', ry: '3', 'clip-path': 'url(#eye)' })
  const source = element('svg', {}, [element('defs', {}, [clip]), iris])
  const ctx = context(), draw = createSvgPainter(source)
  draw(ctx); draw(ctx)
  assert.equal(ctx.clips[0].path, ctx.clips[1].path)
  assert.deepEqual(ctx.clips[0].path.ops[0][2], [1, 0, 0, 1, 1, 2])
  eye.setAttribute('d', 'M0 0Q5 -1 10 0Q5 1 0 0Z'); draw(ctx)
  assert.notEqual(ctx.clips[2].path, ctx.clips[1].path)
  assert.equal(ctx.clips[2].path.ops[0][1].data, eye.getAttribute('d'))
})

test('radial gradients preserve elliptical bounds and user-space gradient transforms', () => {
  const radial = element('radialGradient', { id: 'cheek', cx: '45%', cy: '40%', r: '60%' }, [element('stop', { offset: '0', 'stop-color': '#f80' })])
  const linear = gradient('face', { gradientUnits: 'userSpaceOnUse', x1: '-22', y1: '-10', x2: '24', y2: '-24', gradientTransform: 'rotate(90)' })
  const source = element('svg', {}, [element('defs', {}, [radial, linear]), element('ellipse', { cx: '10', cy: '20', rx: '3', ry: '5', fill: 'url(#cheek)' }), element('path', { d: 'M0 0L10 10L10 0Z', fill: 'url(#face)' })])
  const ctx = context(); createSvgPainter(source)(ctx)
  assert.deepEqual(ctx.gradients[0].matrix, [6, 0, 0, 10, 7, 15])
  assert.deepEqual(ctx.gradients[0].args, [0.45, 0.4, 0, 0.45, 0.4, 0.6])
  assert.deepEqual(ctx.gradients[1].args, [-22, -10, 24, -24])
  assert.ok(Math.abs(ctx.gradients[1].matrix[0]) < 1e-9)
  assert.equal(ctx.gradients[1].matrix[1], 1)
})

test('song title text uses the supplied font, anchor and live visibility', () => {
  const title = element('text', { x: '120', y: '50', 'text-anchor': 'middle', 'font-family': "'Marck Script', cursive", 'font-size': '22', 'font-style': 'italic', fill: '#a64' })
  title.childNodes = [{ nodeType: 3, textContent: '  Тепло простих розмов\n' }]
  const ctx = context(), draw = createSvgPainter(element('svg', {}, [title]))
  draw(ctx)
  assert.deepEqual(ctx.draws[0], { kind: 'text', text: 'Тепло простих розмов', x: 120, y: 50, font: "italic normal 22px 'Marck Script', cursive", align: 'center', alpha: 1 })
  title.style.display = 'none'; draw(ctx)
  assert.equal(ctx.draws.length, 1)
})
