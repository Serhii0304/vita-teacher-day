// Reassigning the same SVG geometry still invalidates it in some mobile
// renderers. Reading an attribute does not trigger a style/layout measurement.
export function setSvgAttribute(el: SVGElement | null, name: string, value: string) {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value)
}
