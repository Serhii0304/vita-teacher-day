import { useEffect, useRef } from 'react'
import type { AudioPlayer } from '../audio/AudioPlayer'
import { reducedKeys, snapToKey } from '../story/SceneTimeline'
import { timelineStore, type Timeline } from '../story/timeline'
import type { FrameBus } from './frameBus'
import type { Screen } from './types'
import { FramePacer } from './framePacer'

/**
 * Єдиний цикл кадрів. Під час відтворення працює requestAnimationFrame і читає час з аудіо.
 * На паузі цикл зупиняється, а кадр перераховується лише на події (перемотування, зміна розміру,
 * повернення у вкладку) — отже сюжетна анімація на паузі завмирає.
 */
export function useStoryLoop(engine: AudioPlayer, bus: FrameBus, screen: React.RefObject<Screen>, reduced: boolean, layoutKey: string, compact = false) {
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced
  const compactRef = useRef(compact)
  compactRef.current = compact
  const kick = useRef<() => void>(() => {})

  useEffect(() => {
    let raf = 0
    let force = true
    let lastTime = -1
    // легкі кадри: камера, частинки, світло (композитор) — до 60 на секунду навіть на телефоні;
    // важкі: персонажі й зміни SVG — на телефоні 30 на секунду
    const pacer = new FramePacer()
    const heavyPacer = new FramePacer()
    let keysFor: Timeline | null = null
    let keys: number[] = []
    const frame = (now: number) => {
      raf = 0
      if (document.visibilityState === 'hidden') return
      const playing = !engine.el.paused || engine.getSnapshot().wantsPlay
      // 120 Hz screens must not double SVG work. User actions still draw at once.
      if (!pacer.take(now, reducedRef.current ? 12 : 60, force)) {
        if (playing) schedule()
        return
      }
      const heavy = heavyPacer.take(now, reducedRef.current ? 12 : compactRef.current ? 30 : 60, force)
      const tl = timelineStore.get()
      if (keysFor !== tl) {
        keys = reducedKeys(tl)
        keysFor = tl
      }
      const tReal = engine.time()
      const t = reducedRef.current ? snapToKey(keys, tReal) : tReal
      if (force || tReal !== lastTime) {
        bus.run({ t, tReal, tl, screen: screen.current!, reduced: reducedRef.current, heavy })
        lastTime = tReal
      }
      force = false
      if (playing) schedule()
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const invalidate = () => {
      force = true
      if (document.visibilityState === 'hidden') return
      // Pause and seeking are explicit actions, not animation frames. Do not
      // wait for the next throttled RAF (e.g. an occluded browser window).
      if (raf) cancelAnimationFrame(raf)
      frame(performance.now())
    }
    kick.current = invalidate
    const el = engine.el
    const evs = ['play', 'playing', 'pause', 'seeking', 'seeked', 'ended', 'loadedmetadata', 'waiting', 'canplay']
    evs.forEach((ev) => el.addEventListener(ev, invalidate))
    const offSeek = engine.onSeek(invalidate)
    const offTl = timelineStore.subscribe(invalidate)
    const onVis = () => {
      if (document.visibilityState === 'visible') invalidate()
      else {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('resize', invalidate)
    window.addEventListener('pageshow', invalidate)
    schedule()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      evs.forEach((ev) => el.removeEventListener(ev, invalidate))
      offSeek()
      offTl()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', invalidate)
      window.removeEventListener('pageshow', invalidate)
    }
  }, [engine, bus, screen])

  // зміна режиму руху або компоновки — перемалювати кадр
  useEffect(() => {
    kick.current()
  }, [reduced, layoutKey, compact])

  return kick
}
