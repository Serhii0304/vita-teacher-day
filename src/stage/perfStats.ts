/**
 * Лічильники для діагностичної панелі (?perf): скільки кадрів сцени й скільки часу займає їхній JS.
 * Нічого не надсилається — лише показується на самій сторінці.
 */
export const perf = {
  lightCap: 60,
  heavyCap: 30,
  light: 0,
  heavy: 0,
  jsMs: 0,
  frame(start: number, end: number, heavy: boolean) {
    if (heavy) this.heavy++
    else this.light++
    this.jsMs += end - start
  },
  take() {
    const r = { light: this.light, heavy: this.heavy, jsMs: this.jsMs }
    this.light = 0
    this.heavy = 0
    this.jsMs = 0
    return r
  },
}
