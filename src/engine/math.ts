/** Базові математичні утиліти для детермінованої анімації (усе — функції від часу). */

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p
export const invLerp = (a: number, b: number, v: number) => (a === b ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a)))
export const remap = (v: number, a: number, b: number, c: number, d: number) => lerp(c, d, invLerp(a, b, v))
export const smoothstep = (a: number, b: number, v: number) => {
  const x = invLerp(a, b, v)
  return x * x * (3 - 2 * x)
}
export const smootherstep = (a: number, b: number, v: number) => {
  const x = invLerp(a, b, v)
  return x * x * x * (x * (x * 6 - 15) + 10)
}
export const DEG = Math.PI / 180

export type Ease = (p: number) => number
export const ease = {
  linear: ((p) => p) as Ease,
  inSine: ((p) => 1 - Math.cos((p * Math.PI) / 2)) as Ease,
  outSine: ((p) => Math.sin((p * Math.PI) / 2)) as Ease,
  inOutSine: ((p) => -(Math.cos(Math.PI * p) - 1) / 2) as Ease,
  inQuad: ((p) => p * p) as Ease,
  outQuad: ((p) => 1 - (1 - p) * (1 - p)) as Ease,
  inOutQuad: ((p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)) as Ease,
  inCubic: ((p) => p * p * p) as Ease,
  outCubic: ((p) => 1 - Math.pow(1 - p, 3)) as Ease,
  inOutCubic: ((p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)) as Ease,
  outQuart: ((p) => 1 - Math.pow(1 - p, 4)) as Ease,
  /** Легкий «перельот» — для м'якого жесту, не пружини. */
  outBackSoft: ((p) => {
    const c1 = 0.9
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2)
  }) as Ease,
}

/** Детермінований псевдовипадковий хеш у [0, 1). */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return s - Math.floor(s)
}

/** Гладкий одновимірний шум у [-1, 1]. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x)
  const f = x - i
  const a = hash(i + seed * 57.3) * 2 - 1
  const b = hash(i + 1 + seed * 57.3) * 2 - 1
  const u = f * f * (3 - 2 * f)
  return a + (b - a) * u
}

/** Огинаюча «вікно»: 0 до a, плавно 1 між a+fin і b-fout, 0 після b. */
export function windowEnv(t: number, a: number, b: number, fin = 0.5, fout = 0.5): number {
  if (t <= a || t >= b) return 0
  const up = fin > 0 ? smoothstep(a, a + fin, t) : 1
  const down = fout > 0 ? 1 - smoothstep(b - fout, b, t) : 1
  return Math.min(up, down)
}

/** Короткий імпульс-дзвіночок: 0→1→0 протягом dur від початку start. */
export function bump(t: number, start: number, dur: number): number {
  if (t <= start || t >= start + dur) return 0
  const p = (t - start) / dur
  return Math.sin(p * Math.PI)
}

export const fmt = (n: number, d = 2) => {
  const f = Math.pow(10, d)
  return String(Math.round(n * f) / f)
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
