import type { FrameCtx } from './types'

/**
 * Спільна «шина кадрів»: сцени, субтитри та фінальний напис оновлюються з одного циклу
 * requestAnimationFrame, тож усе синхронно залежить від одного часу аудіо.
 */
type Fn = (ctx: FrameCtx) => void

export class FrameBus {
  private fns = new Set<Fn>()
  last: FrameCtx | null = null
  add(fn: Fn) {
    this.fns.add(fn)
    if (this.last) fn(this.last)
    return () => {
      this.fns.delete(fn)
    }
  }
  run(ctx: FrameCtx) {
    this.last = ctx
    this.fns.forEach((f) => f(ctx))
  }
}
