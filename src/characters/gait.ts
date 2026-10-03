import { clamp, ease, lerp, smoothstep } from '../engine/math'
import type { Params } from '../engine/moves'
import type { BodySpec } from './body'

/**
 * Хода без ковзання ступень.
 * Кожна ступня або стоїть на місці (опорна фаза), або переноситься в повітрі до нової точки.
 * Корпус рухається плавно (розгін — рівна хода — гальмування), а коліна розв’язуються через IK.
 */
export interface Walk {
  t0: number
  t1: number
  /** Світові координати кореня персонажа на початку і в кінці. */
  x0: number
  x1: number
  /** Яка нога робить перший крок. */
  lead: 'n' | 'f'
  /** Масштаб персонажа під час ходи (для перерахунку довжини кроку). */
  sc: number
}

const SWING = 0.72

/** Плавна функція переміщення корпусу (в одиницях довжини кроку). */
function bodyPhase(q: number, n: number): number {
  if (q <= 0) return 0
  if (q < 1) return 0.5 * q * q
  if (q < n) return 0.5 + (q - 1)
  const rr = clamp((q - n) / SWING)
  const h = (rr * rr * rr - 2 * rr * rr + rr) * SWING + (-2 * rr * rr * rr + 3 * rr * rr) * 0.5
  return n - 0.5 + h
}

interface FootState {
  pos: number
  lift: number
  rot: number
  swing: number
}

function footState(q: number, n: number, isLead: boolean): FootState {
  // кроки i = 1..n+1; непарні — ведуча нога
  let pos = 0
  for (let i = 1; i <= n + 1; i++) {
    const footIsLead = i % 2 === 1
    if (footIsLead !== isLead) continue
    const from = i === n + 1 ? n - 1 : Math.max(0, i - 2)
    const to = i === n + 1 ? n : i
    const s0 = i - 1
    const s1 = s0 + SWING
    if (q < s0) break
    if (q < s1) {
      const p = (q - s0) / SWING
      const e = ease.inOutSine(p)
      const arc = Math.sin(Math.PI * p)
      const rot = 30 * arc * (1 - p) - 20 * arc * p
      return { pos: lerp(from, to, e), lift: arc, rot, swing: arc }
    }
    pos = to
  }
  return { pos, lift: 0, rot: 0, swing: 0 }
}

/**
 * Накладає на параметри пози стан ходи в момент t (якщо хода активна).
 * Повертає true, якщо персонаж зараз іде.
 */
export function applyWalk(out: Params, walks: Walk[], t: number, body: BodySpec): boolean {
  for (const w of walks) {
    if (t < w.t0 || t > w.t1) continue
    const dir = Math.sign(w.x1 - w.x0) || 1
    const flip = out.flip >= 0 ? 1 : -1
    const sc = w.sc
    const D = Math.abs(w.x1 - w.x0) / sc
    const n = Math.max(2, Math.round(D / body.step))
    const s = D / n
    const T = (w.t1 - w.t0) / (n + SWING)
    const q = (t - w.t0) / T
    const f = bodyPhase(q, n)
    out.x = w.x0 + dir * f * s * sc
    // ступні у локальній системі (уперед = +x незалежно від flip, якщо персонаж іде туди, куди дивиться)
    const forward = dir === flip ? 1 : -1
    const leadIsNear = w.lead === 'n'
    const a = footState(q, n, true)
    const b = footState(q, n, false)
    const nearF = leadIsNear ? a : b
    const farF = leadIsNear ? b : a
    out.nfx = body.footN + forward * (nearF.pos - f) * s
    out.ffx = body.footF + forward * (farF.pos - f) * s
    out.nfy = -nearF.lift * body.lift
    out.ffy = -farF.lift * body.lift
    out.nfr = nearF.rot * forward
    out.ffr = farF.rot * forward
    const env = smoothstep(0, 0.6, q) * (1 - smoothstep(n + 0.15, n + SWING, q))
    const bob = Math.max(nearF.swing, farF.swing)
    out.py = (out.py ?? 0) + body.walkDrop * env - 2.4 * bob * env
    out.lean = (out.lean ?? 0) + 2.5 * env * forward
    // руки протилежно до ніг
    const sep = clamp((nearF.pos - farF.pos) * 0.9, -1, 1) * env
    out.nhx = (out.nhx ?? 0) - sep * 11 * forward * (out.nSw ?? 1)
    out.fhx = (out.fhx ?? 0) + sep * 11 * forward * (out.fSw ?? 1)
    out.nhy = (out.nhy ?? 0) - Math.abs(sep) * 2 * (out.nSw ?? 1)
    out.fhy = (out.fhy ?? 0) - Math.abs(sep) * 2 * (out.fSw ?? 1)
    return true
  }
  return false
}

/** Тривалість ходи, що виглядає природно для заданої відстані (для режисури). */
export function walkDuration(dist: number, body: BodySpec, sc = 1, pace = 0.62): number {
  const D = Math.abs(dist) / sc
  const n = Math.max(2, Math.round(D / body.step))
  return (n + SWING) * pace
}
