// Reassigning the same SVG geometry still invalidates it in some mobile
// renderers. Reading an attribute does not trigger a style/layout measurement.
export function setSvgAttribute(el: SVGElement | null, name: string, value: string) {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value)
}

/** Прозорість елемента — тільки якщо змінилася (повторний запис теж змушує перемальовувати). */
export function setOpacity(el: SVGElement | HTMLElement | null, v: number | string) {
  if (!el) return
  const s = typeof v === 'number' ? (v >= 0.999 ? '1' : v <= 0.001 ? '0' : v.toFixed(3)) : v
  if (el.style.opacity !== s) el.style.opacity = s
}

/** display — тільки якщо змінився. */
export function setDisplay(el: SVGElement | HTMLElement | null, visible: boolean) {
  if (!el) return
  const s = visible ? '' : 'none'
  if (el.style.display !== s) el.style.display = s
}
