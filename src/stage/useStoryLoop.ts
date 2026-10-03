import { useEffect, useRef } from 'react'
import type { AudioPlayer } from '../audio/AudioPlayer'
import { reducedKeys, snapToKey } from '../story/SceneTimeline'
import { timelineStore, type Timeline } from '../story/timeline'
import type { FrameBus } from './frameBus'
import type { Screen } from './types'

/**
 * Єдиний цикл кадрів. Під час відтворення працює requestAnimationFrame і читає час з аудіо.
 * На паузі цикл зупиняється, а кадр перераховується лише на події (перемотування, зміна розміру,
 * повернення у вкладку) — отже сюжетна анімація на паузі завмирає.
 */
export function useStoryLoop(engine: AudioPlayer, bus: FrameBus, screen: React.RefObject<Screen>, reduced: boolean, layoutKey: string) {
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced
  const kick = useRef<() => void>(() => {})

  useEffect(() => {
    let raf = 0
    let keysFor: Timeline | null = null
    let keys: number[] = []
    const frame = () => {
      raf = 0
      const tl = timelineStore.get()
      if (keysFor !== tl) {
        keys = reducedKeys(tl)
        keysFor = tl
      }
      const tReal = engine.time()
      const t = reducedRef.current ? snapToKey(keys, tReal) : tReal
      bus.run({ t, tReal, tl, screen: screen.current!, reduced: reducedRef.current })
      const st = engine.getSnapshot()
      if (!engine.el.paused || st.wantsPlay) schedule()
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    kick.current = schedule
    const el = engine.el
    const evs = ['play', 'playing', 'pause', 'seeking', 'seeked', 'ended', 'loadedmetadata', 'waiting', 'canplay']
    evs.forEach((ev) => el.addEventListener(ev, schedule))
    const offSeek = engine.onSeek(schedule)
    const offTl = timelineStore.subscribe(schedule)
    const onVis = () => {
      if (document.visibilityState === 'visible') schedule()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('resize', schedule)
    window.addEventListener('pageshow', schedule)
    schedule()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      evs.forEach((ev) => el.removeEventListener(ev, schedule))
      offSeek()
      offTl()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pageshow', schedule)
    }
  }, [engine, bus, screen])

  // зміна режиму руху або компоновки — перемалювати кадр
  useEffect(() => {
    kick.current()
  }, [reduced, layoutKey])

  return kick
}
