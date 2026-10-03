/** Limits painting, never the audio clock. Missed frames are skipped, not replayed. */
export class FramePacer {
  private next = 0

  take(now: number, fps: number, force = false): boolean {
    const interval = 1000 / fps
    if (!force && now + 0.5 < this.next) return false
    const late = Math.max(0, now - this.next)
    this.next = force || late >= interval ? now + interval : this.next + interval
    return true
  }
}
