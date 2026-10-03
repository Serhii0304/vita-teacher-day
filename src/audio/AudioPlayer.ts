/**
 * AudioPlayer — єдиний аудіоелемент сторінки та єдине джерело часу історії.
 *
 * Уся анімація, сцени й субтитри обчислюються з audio.currentTime (через time()).
 * Тут немає незалежного таймера: згладжування лише інтерполює між оновленнями
 * currentTime і постійно підтягується до нього.
 */
export type Status = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error'

export interface AudioState {
  status: Status
  /** Користувач хоче, щоб звучало (натиснув «відтворити»), але звук ще може буферизуватися. */
  wantsPlay: boolean
  buffering: boolean
  /** Буферизація триває підозріло довго — показати кнопку повторної спроби. */
  slow: boolean
  duration: number
  /** Грубий час для інтерфейсу (оновлюється кілька разів на секунду). */
  time: number
  muted: boolean
  started: boolean
  error: null | 'network' | 'decode' | 'unsupported' | 'blocked' | 'unknown'
  /** Лічильник перемотувань — сигнал для миттєвого перерахунку сцени. */
  seekVersion: number
}

type Listener = () => void

const SLOW_MS = 15000

export class AudioPlayer {
  readonly el: HTMLAudioElement
  private state: AudioState
  private listeners = new Set<Listener>()
  private seekListeners = new Set<Listener>()
  private watchdog = 0
  private smooth = 0
  private lastRaw = -1
  private lastAt = 0
  private disposers: (() => void)[] = []

  constructor(src: string) {
    const el = document.createElement('audio')
    el.preload = 'auto'
    el.src = src
    el.setAttribute('playsinline', '')
    this.el = el
    this.state = {
      status: 'loading',
      wantsPlay: false,
      buffering: false,
      slow: false,
      duration: 0,
      time: 0,
      muted: false,
      started: false,
      error: null,
      seekVersion: 0,
    }
    const on = (type: string, fn: (e: Event) => void) => {
      el.addEventListener(type, fn)
      this.disposers.push(() => el.removeEventListener(type, fn))
    }
    on('loadedmetadata', () => this.patch({ duration: finiteOr(el.duration, this.state.duration), status: this.state.status === 'loading' ? 'ready' : this.state.status }))
    on('durationchange', () => this.patch({ duration: finiteOr(el.duration, this.state.duration) }))
    on('canplay', () => {
      if (this.state.status === 'loading') this.patch({ status: 'ready' })
      this.patch({ buffering: false, slow: false })
      this.clearWatchdog()
    })
    on('play', () => this.patch({ wantsPlay: true, started: true, error: null }))
    on('playing', () => {
      this.clearWatchdog()
      this.patch({ status: 'playing', buffering: false, slow: false })
    })
    on('pause', () => {
      if (!el.ended) this.patch({ status: 'paused', wantsPlay: false, buffering: false })
      this.clearWatchdog()
      this.emitSeek()
    })
    on('waiting', () => {
      this.patch({ buffering: true })
      this.armWatchdog()
    })
    on('stalled', () => {
      if (this.state.wantsPlay) this.armWatchdog()
    })
    on('seeking', () => {
      this.patch({ time: el.currentTime, seekVersion: this.state.seekVersion + 1 })
      this.snap()
      this.emitSeek()
    })
    on('seeked', () => {
      this.patch({ time: el.currentTime })
      this.snap()
      this.emitSeek()
    })
    on('timeupdate', () => {
      const t = el.currentTime
      if (Math.abs(t - this.state.time) >= 0.25 || el.paused) this.patch({ time: t })
    })
    on('ended', () => {
      this.clearWatchdog()
      this.patch({ status: 'ended', wantsPlay: false, buffering: false, time: finiteOr(el.duration, el.currentTime) })
      this.emitSeek()
    })
    on('volumechange', () => this.patch({ muted: el.muted }))
    on('error', () => {
      this.clearWatchdog()
      const code = el.error?.code
      const error = code === 2 ? 'network' : code === 3 ? 'decode' : code === 4 ? 'unsupported' : 'unknown'
      this.patch({ status: 'error', error, wantsPlay: false, buffering: false })
    })
  }

  /* ---------- підписка для React (useSyncExternalStore) ---------- */
  getSnapshot = () => this.state
  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  /** Виклик при будь-якій зміні позиції без відтворення (пауза, перемотування, кінець). */
  onSeek(l: Listener) {
    this.seekListeners.add(l)
    return () => this.seekListeners.delete(l)
  }

  private patch(p: Partial<AudioState>) {
    let changed = false
    for (const k in p) {
      const key = k as keyof AudioState
      if (this.state[key] !== p[key]) {
        changed = true
        break
      }
    }
    if (!changed) return
    this.state = { ...this.state, ...p }
    this.listeners.forEach((l) => l())
  }
  private emitSeek() {
    this.seekListeners.forEach((l) => l())
  }

  private armWatchdog() {
    if (this.watchdog) return
    this.watchdog = window.setTimeout(() => {
      this.watchdog = 0
      if (this.state.wantsPlay && (this.state.buffering || this.el.readyState < 3)) this.patch({ slow: true })
    }, SLOW_MS)
  }
  private clearWatchdog() {
    if (this.watchdog) window.clearTimeout(this.watchdog)
    this.watchdog = 0
  }

  /* ---------- керування ---------- */
  async play(): Promise<boolean> {
    if (this.state.status === 'error') return this.retry()
    if (this.el.ended) this.el.currentTime = 0
    this.patch({ wantsPlay: true, error: null, status: this.state.status === 'ended' ? 'paused' : this.state.status })
    if (this.el.readyState < 3) {
      this.patch({ buffering: true })
      this.armWatchdog()
    }
    try {
      await this.el.play()
      return true
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === 'AbortError') return false // перервано новою командою — не помилка
      this.clearWatchdog()
      this.patch({ wantsPlay: false, buffering: false, error: name === 'NotAllowedError' ? 'blocked' : 'unknown', status: 'paused' })
      return false
    }
  }

  pause() {
    this.el.pause()
    this.patch({ wantsPlay: false })
  }

  toggle() {
    if (this.el.paused) void this.play()
    else this.pause()
  }

  seek(t: number) {
    const d = this.state.duration || this.el.duration || 0
    const target = Math.max(0, Math.min(Number.isFinite(d) && d > 0 ? d - 0.05 : t, t))
    if (this.state.status === 'ended') this.patch({ status: 'paused' })
    this.el.currentTime = target
    this.patch({ time: target, seekVersion: this.state.seekVersion + 1 })
    this.snap()
    this.emitSeek()
  }

  /** Повторне прослуховування з початку: історія повністю скидається, бо все обчислюється від t = 0. */
  restart() {
    this.seek(0)
    void this.play()
  }

  setMuted(m: boolean) {
    this.el.muted = m
    this.patch({ muted: m })
  }

  /** Повторна спроба після помилки або «зависання» завантаження. */
  async retry(): Promise<boolean> {
    const resumeAt = this.el.currentTime || this.state.time || 0
    this.clearWatchdog()
    this.patch({ status: 'loading', error: null, slow: false, buffering: true, wantsPlay: true })
    const src = this.el.currentSrc || this.el.src
    this.el.src = src
    this.el.load()
    await new Promise<void>((resolve) => {
      const done = () => {
        this.el.removeEventListener('loadedmetadata', done)
        this.el.removeEventListener('error', done)
        resolve()
      }
      this.el.addEventListener('loadedmetadata', done)
      this.el.addEventListener('error', done)
    })
    if (this.state.status === 'error') return false
    if (resumeAt > 0) this.el.currentTime = resumeAt
    return this.play()
  }

  /* ---------- час історії ---------- */
  private snap() {
    this.smooth = this.el.currentTime
    this.lastRaw = this.smooth
    this.lastAt = performance.now()
  }

  /** Поточний час для кадру анімації (джерело — audio.currentTime). */
  time(): number {
    const el = this.el
    const raw = el.ended ? finiteOr(el.duration, el.currentTime) : el.currentTime
    const now = performance.now()
    if (el.paused || el.seeking || this.state.buffering || el.readyState < 3) {
      this.smooth = raw
      this.lastRaw = raw
      this.lastAt = now
      return raw
    }
    const dt = Math.min(0.1, (now - this.lastAt) / 1000) * (el.playbackRate || 1)
    this.lastAt = now
    let predicted = this.smooth + dt
    if (raw !== this.lastRaw) {
      this.lastRaw = raw
      const err = raw - predicted
      if (Math.abs(err) > 0.12) predicted = raw
      else predicted += err * 0.18
    }
    this.smooth = predicted
    return predicted
  }

  dispose() {
    this.clearWatchdog()
    this.el.pause()
    this.disposers.forEach((d) => d())
    this.listeners.clear()
    this.seekListeners.clear()
  }
}

function finiteOr(v: number, fallback: number) {
  return Number.isFinite(v) && v > 0 ? v : fallback
}
