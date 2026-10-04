/**
 * The phone renderer paints the existing rig into a bounded Canvas2D surface.
 * The hidden SVG remains the scene's animation data, not a browser paint layer.
 * No layout APIs are used: paths, transforms and clip unions retain one cache
 * entry each, replacing it when the corresponding animation attribute changes.
 */
type Matrix = [number, number, number, number, number, number]
type Bounds = [number, number, number, number]
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]
const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g
const numeric = (s: string | null, fallback = 0) => s === null || s === '' ? fallback : Number.parseFloat(s)
const nums = (s: string) => (s.match(NUMBER) ?? []).map(Number)
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

function multiply(a: Matrix, b: Matrix): Matrix {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]
}

function parseTransform(value: string): Matrix {
  let matrix = IDENTITY
  for (const match of value.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)) {
    const v = nums(match[2])
    let next: Matrix = IDENTITY
    const angle = (v[0] ?? 0) * Math.PI / 180
    switch (match[1]) {
      case 'matrix': if (v.length === 6) next = v as Matrix; break
      case 'translate': next = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0]; break
      case 'scale': next = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0]; break
      case 'rotate': {
        const c = Math.cos(angle), s = Math.sin(angle), x = v[1] ?? 0, y = v[2] ?? 0
        next = [c, s, -s, c, x - c * x + s * y, y - s * x - c * y]
        break
      }
      case 'skewX': next = [1, 0, Math.tan(angle), 1, 0, 0]; break
      case 'skewY': next = [1, Math.tan(angle), 0, 1, 0, 0]; break
    }
    matrix = multiply(matrix, next)
  }
  return matrix
}

function transformReader(el: Element, attribute = 'transform') {
  let key = '', matrix = IDENTITY
  return () => {
    const value = el.getAttribute(attribute) ?? ''
    if (value !== key) { key = value; matrix = parseTransform(value) }
    return matrix
  }
}

/** Exact Bezier extrema, and conservative arc bounds, without SVG getBBox(). */
function pathBounds(data: string): Bounds {
  const tokens = data.match(/[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? []
  let loX = Infinity, loY = Infinity, hiX = -Infinity, hiY = -Infinity
  const add = (x: number, y: number) => { loX = Math.min(loX, x); loY = Math.min(loY, y); hiX = Math.max(hiX, x); hiY = Math.max(hiY, y) }
  const quadratic = (p0: number, p1: number, p2: number, t: number) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2
  const cubic = (p0: number, p1: number, p2: number, p3: number, t: number) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3
  const roots = (p0: number, p1: number, p2: number, p3: number) => {
    const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0
    if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b]
    const d = b * b - 4 * a * c
    return d < 0 ? [] : [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)]
  }
  let i = 0, command = '', previous = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0
  const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++]
    const upper = command.toUpperCase(), relative = upper !== command
    if (upper === 'Z') { x = sx; y = sy; add(x, y); previous = upper; command = ''; continue }
    const count = arity[upper]
    if (!count || i + count > tokens.length || /^[a-z]$/i.test(tokens[i])) break
    const v = tokens.slice(i, i + count).map(Number)
    i += count
    const px = x, py = y, ox = relative ? x : 0, oy = relative ? y : 0
    if (upper === 'M' || upper === 'L' || upper === 'T') {
      x = v[0] + ox; y = v[1] + oy
      if (upper === 'M') { sx = x; sy = y; command = relative ? 'l' : 'L' }
    } else if (upper === 'H') x = v[0] + ox
    else if (upper === 'V') y = v[0] + oy
    else { x = v[count - 2] + ox; y = v[count - 1] + oy }
    add(x, y)
    if (upper === 'Q' || upper === 'T') {
      const qx = upper === 'Q' ? v[0] + ox : previous === 'Q' || previous === 'T' ? 2 * px - cx : px
      const qy = upper === 'Q' ? v[1] + oy : previous === 'Q' || previous === 'T' ? 2 * py - cy : py
      for (const t of [(px - qx) / (px - 2 * qx + x), (py - qy) / (py - 2 * qy + y)]) {
        if (t > 0 && t < 1) add(quadratic(px, qx, x, t), quadratic(py, qy, y, t))
      }
      cx = qx; cy = qy
    } else if (upper === 'C' || upper === 'S') {
      const a = upper === 'C' ? v[0] + ox : previous === 'C' || previous === 'S' ? 2 * px - cx : px
      const b = upper === 'C' ? v[1] + oy : previous === 'C' || previous === 'S' ? 2 * py - cy : py
      const c = v[count - 4] + ox, d = v[count - 3] + oy
      for (const t of [...roots(px, a, c, x), ...roots(py, b, d, y)]) {
        if (t > 0 && t < 1) add(cubic(px, a, c, x, t), cubic(py, b, d, y, t))
      }
      cx = c; cy = d
    } else if (upper === 'A') {
      // A full ellipse encloses the arc. Arc-bearing decorative paths are tiny;
      // the conservative bounds only affect their object-bounding gradients.
      const rx = Math.abs(v[0]), ry = Math.abs(v[1]), angle = v[2] * Math.PI / 180
      const dx = (px - x) / 2, dy = (py - y) / 2, c = Math.cos(angle), s = Math.sin(angle)
      const xp = c * dx + s * dy, yp = -s * dx + c * dy
      if (rx > 0 && ry > 0 && (xp !== 0 || yp !== 0)) {
        const scale = Math.max(1, Math.sqrt(xp * xp / (rx * rx) + yp * yp / (ry * ry)))
        const a = rx * scale, b = ry * scale
        const sign = v[3] === v[4] ? -1 : 1
        const k = sign * Math.sqrt(Math.max(0, (a * a * b * b - a * a * yp * yp - b * b * xp * xp) / (a * a * yp * yp + b * b * xp * xp)))
        const ex = k * a * yp / b, ey = -k * b * xp / a
        const mx = c * ex - s * ey + (px + x) / 2, my = s * ex + c * ey + (py + y) / 2
        const ew = Math.hypot(a * c, b * s), eh = Math.hypot(a * s, b * c)
        add(mx - ew, my - eh); add(mx + ew, my + eh)
      }
    }
    previous = upper
  }
  return loX === Infinity ? [0, 0, 0, 0] : [loX, loY, hiX - loX, hiY - loY]
}

interface Geometry { path: Path2D; bounds: Bounds; version: number }
function geometryReader(el: Element): () => Geometry {
  const tag = el.localName.toLowerCase()
  const attributes: Record<string, string[]> = {
    path: ['d'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], circle: ['cx', 'cy', 'r'],
    ellipse: ['cx', 'cy', 'rx', 'ry'], line: ['x1', 'y1', 'x2', 'y2'], polygon: ['points'], polyline: ['points'],
  }
  let key: string | null = null, version = 0, geometry: Geometry
  return () => {
    const raw = (attributes[tag] ?? []).map(name => el.getAttribute(name) ?? '')
    const next = raw.join('|')
    if (key === next) return geometry
    key = next
    const v = raw.map(s => numeric(s)), path = tag === 'path' ? new Path2D(raw[0]) : new Path2D()
    let bounds: Bounds = [0, 0, 0, 0]
    if (tag === 'path') bounds = pathBounds(raw[0])
    else if (tag === 'rect') {
      const [x, y, w, h] = v, rx = Math.min(w / 2, Math.max(0, numeric(raw[4], numeric(raw[5])))), ry = Math.min(h / 2, Math.max(0, numeric(raw[5], rx)))
      bounds = [x, y, Math.max(0, w), Math.max(0, h)]
      if (w > 0 && h > 0) {
        if (rx > 0 && ry > 0) path.roundRect(x, y, w, h, [{ x: rx, y: ry }])
        else path.rect(x, y, w, h)
      }
    } else if (tag === 'circle' || tag === 'ellipse') {
      const [x, y] = v, rx = Math.max(0, v[2]), ry = Math.max(0, tag === 'circle' ? v[2] : v[3])
      bounds = [x - rx, y - ry, rx * 2, ry * 2]
      if (rx > 0 && ry > 0) path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    } else if (tag === 'line') {
      path.moveTo(v[0], v[1]); path.lineTo(v[2], v[3])
      bounds = [Math.min(v[0], v[2]), Math.min(v[1], v[3]), Math.abs(v[2] - v[0]), Math.abs(v[3] - v[1])]
    } else if (tag === 'polygon' || tag === 'polyline') {
      const points = nums(raw[0]), xs: number[] = [], ys: number[] = []
      for (let i = 0; i + 1 < points.length; i += 2) {
        if (i === 0) path.moveTo(points[i], points[i + 1]); else path.lineTo(points[i], points[i + 1])
        xs.push(points[i]); ys.push(points[i + 1])
      }
      if (tag === 'polygon') path.closePath()
      if (xs.length) bounds = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
    }
    geometry = { path, bounds, version: ++version }
    return geometry
  }
}

type Style = Record<string, string>
const DEFAULT_STYLE: Style = {
  fill: '#000', stroke: 'none', color: '#000', 'fill-opacity': '1', 'stroke-opacity': '1',
  'stroke-width': '1', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-miterlimit': '4',
  'stroke-dasharray': 'none', 'stroke-dashoffset': '0', 'fill-rule': 'nonzero', 'clip-rule': 'nonzero',
  'font-family': 'serif', 'font-size': '16', 'font-style': 'normal', 'font-weight': 'normal',
  'text-anchor': 'start', 'dominant-baseline': 'auto', visibility: 'visible',
}
const STYLE_KEYS = Object.keys(DEFAULT_STYLE)
function styleReader(el: SVGElement, ignoreInline = false) {
  // The rig changes geometry, transform, opacity and display. Existing paint
  // attributes are also read live; inherited attributes do not require CSS/layout.
  const own = STYLE_KEYS.filter(key => el.hasAttribute(key) || (!ignoreInline && el.style.getPropertyValue(key)))
  return (parent: Style): Style => {
    if (!own.length) return parent
    const result = { ...parent }
    for (const key of own) {
      const value = (!ignoreInline && el.style.getPropertyValue(key)) || el.getAttribute(key)
      if (value && value !== 'inherit') result[key] = value
    }
    return result
  }
}

interface CompiledNode {
  el: SVGElement
  children: CompiledNode[]
  geometry?: () => Geometry
  transform: () => Matrix
  style: (parent: Style) => Style
  text: boolean
}
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'])
const SKIP = new Set(['defs', 'lineargradient', 'radialgradient', 'clippath', 'filter', 'mask', 'title', 'desc', 'style', 'metadata'])
function compile(el: SVGElement): CompiledNode {
  const tag = el.localName.toLowerCase()
  return {
    el, text: tag === 'text' || tag === 'tspan', transform: transformReader(el), style: styleReader(el),
    geometry: SHAPES.has(tag) ? geometryReader(el) : undefined,
    children: Array.from(el.children).filter(e => !SKIP.has(e.localName.toLowerCase())).map(e => compile(e as SVGElement)),
  }
}

function transformedBounds(bounds: Bounds, matrix: Matrix): Bounds {
  const [x, y, w, h] = bounds, [a, b, c, d, e, f] = matrix
  const xs = [a * x + c * y + e, a * (x + w) + c * y + e, a * x + c * (y + h) + e, a * (x + w) + c * (y + h) + e]
  const ys = [b * x + d * y + f, b * (x + w) + d * y + f, b * x + d * (y + h) + f, b * (x + w) + d * (y + h) + f]
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
}

function nodeBounds(node: CompiledNode): Bounds {
  if (node.geometry) return node.geometry().bounds
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity
  for (const child of node.children) {
    const b = transformedBounds(nodeBounds(child), child.transform())
    x = Math.min(x, b[0]); y = Math.min(y, b[1]); right = Math.max(right, b[0] + b[2]); bottom = Math.max(bottom, b[1] + b[3])
  }
  return x === Infinity ? [0, 0, 0, 0] : [x, y, right - x, bottom - y]
}

function reference(value: string) { return value.match(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/)?.[1] }

interface Gradient { el: Element; chain: Element[]; stops: { offset: number; color: string }[]; transform: () => Matrix }
function withOpacity(color: string, alpha: number): string {
  if (alpha >= 1) return color
  if (color === 'transparent') return color
  const hex = color.match(/^#([0-9a-f]{3,8})$/i)?.[1]
  if (hex) {
    const s = hex.length <= 4 ? [...hex].map(c => c + c).join('') : hex
    return `rgba(${parseInt(s.slice(0, 2), 16)},${parseInt(s.slice(2, 4), 16)},${parseInt(s.slice(4, 6), 16)},${alpha * (s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1)})`
  }
  const rgb = color.match(/^rgba?\(\s*([^)]*)\)$/i)
  if (rgb) {
    const v = rgb[1].split(/[ ,/]+/)
    return `rgba(${v[0]},${v[1]},${v[2]},${alpha * (v[3] === undefined ? 1 : numeric(v[3]))})`
  }
  // Modern Chrome resolves named colors and the remaining CSS color formats.
  return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`
}

/**
 * Compile once after mounting a WorldSvg. Call after its existing pose updates.
 * The caller establishes the world-to-canvas transform and clears/composites.
 * Filters/masks and isolated group opacity are intentionally not simulated;
 * soft effects are baked separately, and rig group alpha multiplies child alpha.
 */
export function createSvgPainter(source: SVGSVGElement): (ctx: CanvasRenderingContext2D) => void {
  const nodes = Array.from(source.children).filter(e => !SKIP.has(e.localName.toLowerCase())).map(e => compile(e as SVGElement))
  const rootStyle = styleReader(source, true)
  const scope = source.closest('.scene') ?? source
  const definitions = new Map<string, Element>()
  scope.querySelectorAll('[id]').forEach(el => definitions.set(el.id, el))
  const gradients = new Map<string, Gradient | null>()
  const clips = new Map<string, { el: Element; path: () => Path2D } | null>()
  const getGradient = (id: string): Gradient | null => {
    if (gradients.has(id)) return gradients.get(id)!
    const el = definitions.get(id)
    if (!el || !['lineargradient', 'radialgradient'].includes(el.localName.toLowerCase())) { gradients.set(id, null); return null }
    const chain = [el], seen = new Set([id])
    let current = el
    for (;;) {
      const href = (current.getAttribute('href') ?? current.getAttribute('xlink:href') ?? '').replace(/^#/, '')
      const next = definitions.get(href)
      if (!next || seen.has(href)) break
      seen.add(href); chain.push(next); current = next
    }
    const stopParent = chain.find(e => e.querySelector('stop'))
    const stops = Array.from(stopParent?.querySelectorAll('stop') ?? []).map(stop => {
      const style = (stop as SVGElement).style, offset = stop.getAttribute('offset') ?? '0'
      return {
        offset: clamp01(numeric(offset) / (offset.includes('%') ? 100 : 1)),
        color: withOpacity(style.getPropertyValue('stop-color') || stop.getAttribute('stop-color') || '#000', clamp01(numeric(style.getPropertyValue('stop-opacity') || stop.getAttribute('stop-opacity'), 1))),
      }
    })
    const transformEl = chain.find(e => e.hasAttribute('gradientTransform')) ?? el
    const gradient = { el, chain, stops, transform: transformReader(transformEl, 'gradientTransform') }
    gradients.set(id, gradient)
    return gradient
  }

  const paint = (ctx: CanvasRenderingContext2D, value: string, bounds: Bounds, style: Style): string | CanvasGradient | null => {
    if (value === 'none') return null
    if (value === 'currentColor') return style.color
    const id = reference(value)
    if (!id) return value
    const gradient = getGradient(id)
    if (!gradient?.stops.length) return null
    const attr = (name: string, fallback: string) => gradient.chain.find(e => e.hasAttribute(name))?.getAttribute(name) ?? fallback
    const object = attr('gradientUnits', 'objectBoundingBox') !== 'userSpaceOnUse'
    if (object && (bounds[2] <= 0 || bounds[3] <= 0)) return null
    const coord = (name: string, fallback: string) => {
      const text = attr(name, fallback)
      return numeric(text) / (text.includes('%') ? 100 : 1)
    }
    ctx.save()
    if (object) { ctx.translate(bounds[0], bounds[1]); ctx.scale(bounds[2], bounds[3]) }
    ctx.transform(...gradient.transform())
    let result: CanvasGradient
    if (gradient.el.localName.toLowerCase() === 'radialgradient') {
      const cx = coord('cx', '0.5'), cy = coord('cy', '0.5'), r = Math.max(0, coord('r', '0.5'))
      result = ctx.createRadialGradient(coord('fx', String(cx)), coord('fy', String(cy)), Math.max(0, coord('fr', '0')), cx, cy, r)
    } else result = ctx.createLinearGradient(coord('x1', '0'), coord('y1', '0'), coord('x2', '1'), coord('y2', '0'))
    for (const stop of gradient.stops) result.addColorStop(stop.offset, stop.color)
    ctx.restore()
    return result
  }

  const clipFor = (id: string) => {
    if (clips.has(id)) return clips.get(id)!
    const el = definitions.get(id)
    if (!el || el.localName.toLowerCase() !== 'clippath') { clips.set(id, null); return null }
    const root = compile(el as SVGElement)
    let key = '', cached = new Path2D()
    const path = () => {
      const parts: { geometry: Geometry; matrix: Matrix }[] = []
      const collect = (node: CompiledNode, matrix: Matrix) => {
        const own = multiply(matrix, node.transform())
        if (node.geometry) parts.push({ geometry: node.geometry(), matrix: own })
        for (const child of node.children) collect(child, own)
      }
      collect(root, IDENTITY)
      const next = parts.map(part => `${part.geometry.version}:${part.matrix.join(',')}`).join('|')
      if (next !== key) {
        key = next; cached = new Path2D()
        for (const part of parts) cached.addPath(part.geometry.path, new DOMMatrix(part.matrix))
      }
      return cached
    }
    const clip = { el, path }
    clips.set(id, clip)
    return clip
  }

  const draw = (ctx: CanvasRenderingContext2D, node: CompiledNode, inherited: Style) => {
    const el = node.el
    if (el.style.display === 'none' || el.getAttribute('display') === 'none') return
    const opacity = clamp01(numeric(el.style.opacity || el.getAttribute('opacity'), 1))
    if (opacity <= 0) return
    const style = node.style(inherited)
    ctx.save()
    ctx.transform(...node.transform())
    ctx.globalAlpha *= opacity
    const clipId = reference(el.style.clipPath || el.getAttribute('clip-path') || '')
    if (clipId) {
      const clip = clipFor(clipId)
      if (clip) {
        const path = clip.path(), rule = (clip.el.getAttribute('clip-rule') || style['clip-rule']) as CanvasFillRule
        if (clip.el.getAttribute('clipPathUnits') === 'objectBoundingBox') {
          const b = nodeBounds(node), transformed = new Path2D()
          transformed.addPath(path, new DOMMatrix([b[2], 0, 0, b[3], b[0], b[1]]))
          ctx.clip(transformed, rule)
        } else ctx.clip(path, rule)
      }
    }
    const geometry = node.geometry?.()
    if ((geometry || node.text) && style.visibility !== 'hidden' && style.visibility !== 'collapse') {
      const bounds = geometry?.bounds ?? [0, 0, 0, 0] as Bounds
      let text = '', tx = 0, ty = 0
      if (node.text) {
        text = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim()
        tx = numeric(el.getAttribute('x')) + numeric(el.getAttribute('dx'))
        ty = numeric(el.getAttribute('y')) + numeric(el.getAttribute('dy'))
        const size = numeric(style['font-size'], 16)
        ctx.font = `${style['font-style']} ${style['font-weight']} ${size}px ${style['font-family']}`
        ctx.textAlign = style['text-anchor'] === 'middle' ? 'center' : style['text-anchor'] === 'end' ? 'right' : 'left'
        ctx.textBaseline = style['dominant-baseline'] === 'middle' || style['dominant-baseline'] === 'central' ? 'middle' : style['dominant-baseline'] === 'hanging' ? 'hanging' : 'alphabetic'
        // Canvas text measurement does not trigger DOM layout.
        const width = ctx.measureText(text).width
        bounds[0] = tx - (ctx.textAlign === 'center' ? width / 2 : ctx.textAlign === 'right' ? width : 0)
        bounds[1] = ty - size; bounds[2] = width; bounds[3] = size
      }
      const fill = paint(ctx, style.fill, bounds, style), stroke = paint(ctx, style.stroke, bounds, style)
      const alpha = ctx.globalAlpha
      if (fill) {
        ctx.fillStyle = fill
        ctx.globalAlpha = alpha * clamp01(numeric(style['fill-opacity'], 1))
        if (geometry) ctx.fill(geometry.path, style['fill-rule'] as CanvasFillRule)
        else ctx.fillText(text, tx, ty)
      }
      if (stroke && numeric(style['stroke-width'], 1) > 0) {
        ctx.strokeStyle = stroke
        ctx.globalAlpha = alpha * clamp01(numeric(style['stroke-opacity'], 1))
        ctx.lineWidth = numeric(style['stroke-width'], 1)
        ctx.lineCap = style['stroke-linecap'] as CanvasLineCap
        ctx.lineJoin = style['stroke-linejoin'] as CanvasLineJoin
        ctx.miterLimit = numeric(style['stroke-miterlimit'], 4)
        ctx.setLineDash(style['stroke-dasharray'] === 'none' ? [] : nums(style['stroke-dasharray']))
        ctx.lineDashOffset = numeric(style['stroke-dashoffset'])
        if (geometry) ctx.stroke(geometry.path)
        else ctx.strokeText(text, tx, ty)
      }
      ctx.globalAlpha = alpha
    }
    for (const child of node.children) draw(ctx, child, style)
    ctx.restore()
  }

  return ctx => {
    const style = rootStyle(DEFAULT_STYLE)
    for (const node of nodes) draw(ctx, node, style)
  }
}
