import { useEffect, useRef } from 'react'
import type { AudioPlayer } from '../audio/AudioPlayer'
import { reducedKeys, snapToKey } from '../story/SceneTimeline'
import { timelineStore, type Timeline } from '../story/timeline'
import type { FrameBus } from './frameBus'
import type { Screen } from './types'
import { FramePacer } from './framePacer'
import { perf } from './perfStats'

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
    // Запобіжник для слабших телефонів: якщо пристрій двічі поспіль (по 2 с) не встигає за легкими кадрами,
    // їх частота знижується до 30 (як було раніше), а згодом пробуємо 60 знову; за потреби важкі кадри — до 20.
    let lightCap = 60
    let heavyCap = 30
    let winStart = 0
    let winFrames = 0
    let strikes = 0
    let retryAt = 0
    let retryGap = 15000
    const adapt = (now: number, playing: boolean) => {
      if (!playing || !compactRef.current || reducedRef.current) {
        winStart = 0
        return
      }
      if (!winStart) {
        winStart = now
        winFrames = 0
        return
      }
      winFrames++
      const span = now - winStart
      if (span < 2000) return
      const fps = (winFrames * 1000) / span
      winStart = now
      winFrames = 0
      const slow = lightCap > 30 ? fps < 45 : heavyCap > 20 && fps < 24
      strikes = slow ? strikes + 1 : 0
      if (strikes >= 2) {
        strikes = 0
        if (lightCap > 30) {
          lightCap = 30
          retryAt = now + retryGap
          retryGap = Math.min(retryGap * 2, 120000)
        } else heavyCap = 20
      } else if (lightCap === 30 && heavyCap > 20 && retryAt && now >= retryAt) {
        // спроба повернути плавні 60 кадрів (наприклад, після важкого переходу між сценами)
        lightCap = 60
        retryAt = 0
      }
      perf.lightCap = lightCap
      perf.heavyCap = heavyCap
    }
    let keysFor: Timeline | null = null
    let keys: number[] = []
    const frame = (now: number) => {
      raf = 0
      if (document.visibilityState === 'hidden') return
      const playing = !engine.el.paused || engine.getSnapshot().wantsPlay
      // 120 Hz screens must not double SVG work. User actions still draw at once.
      if (!pacer.take(now, reducedRef.current ? 12 : compactRef.current ? lightCap : 60, force)) {
        if (playing) schedule()
        return
      }
      const heavy = heavyPacer.take(now, reducedRef.current ? 12 : compactRef.current ? Math.min(heavyCap, lightCap) : 60, force)
      if (force) winStart = 0
      else adapt(now, playing)
      const tl = timelineStore.get()
      if (keysFor !== tl) {
        keys = reducedKeys(tl)
        keysFor = tl
      }
      const tReal = engine.time()
      const t = reducedRef.current ? snapToKey(keys, tReal) : tReal
      if (force || tReal !== lastTime) {
        const t0 = performance.now()
        bus.run({ t, tReal, tl, screen: screen.current!, reduced: reducedRef.current, heavy })
        perf.frame(t0, performance.now(), heavy)
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
