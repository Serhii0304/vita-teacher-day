import { bitmapSize } from './rasterBudget'

interface Job {
  run(): Promise<void>
  cancelled: boolean
}

// Decode one backdrop at a time. Crossfades must not launch a burst of SVG image decoders.
const jobs: Job[] = []
let running = false
function drain() {
  if (running) return
  const job = jobs.shift()
  if (!job) return
  if (job.cancelled) { drain(); return }
  running = true
  const start = () => {
    void (job.cancelled ? Promise.resolve() : job.run()).finally(() => {
      running = false
      drain()
    })
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start, { timeout: 250 })
  else window.setTimeout(start, 0)
}

/** SVG siblings share gradients/clip paths. Embed those references in the standalone image. */
export function standaloneSvg(source: SVGSVGElement, width: number, height: number) {
  const clone = source.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.removeAttribute('class')
  clone.removeAttribute('style')
  const scope = source.closest('.scene') ?? source
  const definitions = new Map<string, Element>()
  scope.querySelectorAll('defs [id]').forEach(el => definitions.set(el.id, el))
  const present = new Set(Array.from(clone.querySelectorAll('[id]'), el => el.id))
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  clone.prepend(defs)
  let html = clone.outerHTML
  // Follow transitive gradient/href references without duplicating IDs.
  for (let pass = 0; pass < 12; pass++) {
    let added = false
    for (const match of html.matchAll(/(?:url\(['"]?#|(?:xlink:)?href=["']#)([^\s)'"<>]+)/g)) {
      const id = match[1]
      if (present.has(id)) continue
      const def = definitions.get(id)
      if (!def) continue
      const copy = def.cloneNode(true) as Element
      defs.append(copy)
      present.add(id)
      copy.querySelectorAll('[id]').forEach(el => present.add(el.id))
      added = true
    }
    if (!added) break
    html = defs.outerHTML
  }
  return new XMLSerializer().serializeToString(clone)
}

/** Prepare an explicitly bounded bitmap; return a cancellation function for resize/unmount. */
export function bakeWorld(source: SVGSVGElement, canvas: HTMLCanvasElement, cssW: number, cssH: number, ready: () => void, failed: () => void) {
  let image: HTMLImageElement | null = null
  let url = ''
  let finish: (() => void) | null = null
  const release = () => {
    if (image) { image.onload = null; image.onerror = null; image = null }
    if (url) { URL.revokeObjectURL(url); url = '' }
    finish?.()
    finish = null
  }
  const job: Job = {
    cancelled: false,
    run: () => new Promise<void>(resolve => {
      finish = resolve
      try {
        const { width, height } = bitmapSize(cssW, cssH)
        const xml = standaloneSvg(source, width, height)
        url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
        image = new Image()
        image.onload = () => {
          try {
            if (!job.cancelled && image) {
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d', { alpha: true })
              if (ctx) { ctx.drawImage(image, 0, 0, width, height); ready() }
              else failed()
            }
          } catch {
            if (!job.cancelled) failed()
          } finally { release() }
        }
        image.onerror = () => { if (!job.cancelled) failed(); release() }
        image.src = url
      } catch {
        if (!job.cancelled) failed()
        release()
      }
    }),
  }
  jobs.push(job)
  drain()
  return () => { job.cancelled = true; release() }
}
