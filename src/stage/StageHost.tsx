import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { FrameBus } from './frameBus'
import { CompactRendering } from './renderingProfile'
import { StoryStage, type SceneEntry } from './StoryStage'
import type { Layout } from './types'

/**
 * Сцена живе в окремому React-корені. Оновлення інтерфейсу (час у плеєрі, кнопки) не переривають
 * фонову підготовку наступної сцени, тому вона будується порціями між кадрами й не блокує анімацію.
 */
export function StageHost({ scenes, bus, layout, compact }: { scenes: SceneEntry[]; bus: FrameBus; layout: Layout; compact: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const root = useRef<Root | null>(null)
  const tree: ReactNode = (
    <CompactRendering.Provider value={compact}>
      <StoryStage scenes={scenes} bus={bus} layout={layout} />
    </CompactRendering.Provider>
  )
  const latest = useRef(tree)
  latest.current = tree

  useLayoutEffect(() => {
    // окремий вузол для кожного кореня: так подвійний запуск ефектів у StrictMode нічого не ламає
    const el = document.createElement('div')
    el.className = 'stage-root'
    host.current!.appendChild(el)
    const r = createRoot(el)
    root.current = r
    r.render(latest.current)
    return () => {
      root.current = null
      // демонтаж іншого кореня не можна робити синхронно під час коміту цього
      queueMicrotask(() => {
        r.unmount()
        el.remove()
      })
    }
  }, [])
  useLayoutEffect(() => {
    root.current?.render(latest.current)
  }, [scenes, bus, layout, compact])
  return <div ref={host} className="stage-host" />
}
