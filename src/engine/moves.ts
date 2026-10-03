import { clamp, ease as E, lerp, type Ease } from './math'

/**
 * Простий детермінований таймлайн параметрів.
 *
 * Стан у будь-який момент обчислюється з нуля: base → послідовно застосовані «рухи».
 * Рух — це перехід частини параметрів до нових значень на відрізку [from, to].
 * Тому після перемотування не залишається «хвостів» від попередніх епізодів:
 * результат залежить тільки від t, а не від того, які кадри вже були показані.
 */
export type Params = Record<string, number>

export interface Move {
  from: number
  to: number
  set: Params
  ease: Ease
}

export class Track {
  readonly base: Params
  private moves: Move[] = []
  private sorted = true

  constructor(base: Params) {
    this.base = { ...base }
  }

  /** Плавний перехід до значень `set` між from і to. */
  to(from: number, to: number, set: Params, easing: Ease = E.inOutSine): this {
    if (to < from) [from, to] = [to, from]
    this.moves.push({ from, to, set, ease: easing })
    this.sorted = false
    return this
  }

  /** Миттєва зміна (для дискретних станів: який предмет у руці тощо). */
  set(at: number, set: Params): this {
    this.moves.push({ from: at, to: at, set, ease: E.linear })
    this.sorted = false
    return this
  }

  private ensureSorted() {
    if (this.sorted) return
    // стабільне сортування за початком
    this.moves = this.moves
      .map((m, i) => ({ m, i }))
      .sort((a, b) => a.m.from - b.m.from || a.i - b.i)
      .map((x) => x.m)
    this.sorted = true
  }

  eval(t: number, out: Params = {}): Params {
    this.ensureSorted()
    for (const k in this.base) out[k] = this.base[k]
    for (const m of this.moves) {
      if (t < m.from) break
      if (t >= m.to) {
        for (const k in m.set) out[k] = m.set[k]
      } else {
        const p = m.ease(clamp((t - m.from) / (m.to - m.from)))
        for (const k in m.set) {
          const a = out[k] ?? m.set[k]
          out[k] = lerp(a, m.set[k], p)
        }
      }
    }
    return out
  }

  /** Моменти, коли пози «встановилися» — для режиму зменшеного руху. */
  keyTimes(): number[] {
    this.ensureSorted()
    return this.moves.map((m) => m.to)
  }
}

/** Плавна зміна дискретного числового стану без проміжних значень (для пропсів). */
export const isOn = (v: number | undefined) => (v ?? 0) > 0.5
