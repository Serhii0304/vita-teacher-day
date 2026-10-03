import type { BodySpec } from '../characters/body'
import { applyWalk, walkDuration, type Walk } from '../characters/gait'
import { restPose } from '../characters/pose'
import { ease, type Ease } from '../engine/math'
import { Track, type Params } from '../engine/moves'

/**
 * Актор: трек пози + перелік ходів. Поза в момент t обчислюється з нуля,
 * тому після перемотування персонаж одразу стоїть у правильній позі свого епізоду.
 */
export class Actor {
  readonly track: Track
  readonly walks: Walk[] = []
  readonly body: BodySpec
  private out: Params = {}

  constructor(body: BodySpec, base: Params) {
    this.body = body
    this.track = new Track({ ...restPose(body), ...base })
  }

  to(from: number, to: number, set: Params, easing: Ease = ease.inOutSine): this {
    this.track.to(from, to, set, easing)
    return this
  }

  set(at: number, set: Params): this {
    this.track.set(at, set)
    return this
  }

  /** Хода від x0 до x1 між t0 і t1 (ступні не ковзають). */
  walk(t0: number, t1: number, x0: number, x1: number, lead: 'n' | 'f' = 'n', sc = 1): this {
    this.walks.push({ t0, t1, x0, x1, lead, sc })
    this.track.to(t0, t1, { x: x1 }, ease.linear)
    return this
  }

  /** Хода зі звичайним темпом: повертає час завершення. */
  walkAuto(t0: number, x0: number, x1: number, lead: 'n' | 'f' = 'n', sc = 1, pace = 0.62): number {
    const d = walkDuration(x1 - x0, this.body, sc, pace)
    this.walk(t0, t0 + d, x0, x1, lead, sc)
    return t0 + d
  }

  pose(t: number): Params {
    const out = this.track.eval(t, this.out)
    applyWalk(out, this.walks, t, this.body)
    return out
  }
}
