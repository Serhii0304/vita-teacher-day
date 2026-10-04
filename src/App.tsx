import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { getEngine } from './audio/engineInstance'
import { Banner } from './components/Banner'
import { FinalScreen } from './components/FinalScreen'
import { IntroScreen } from './components/IntroScreen'
import { LyricsDialog } from './components/LyricsDialog'
import { LyricsOverlay } from './components/LyricsOverlay'
import { PlayerControls } from './components/PlayerControls'
import { StatusLayer } from './components/StatusLayer'
import { useReducedMotion } from './hooks/useReducedMotion'
import { SCENES } from './scenes'
import { FrameBus } from './stage/frameBus'
import { StageHost } from './stage/StageHost'
import type { Layout, Screen } from './stage/types'
import { useStoryLoop } from './stage/useStoryLoop'
import { CompactRendering, useCompactRendering } from './stage/renderingProfile'
import './styles/app.css'

// Інструменти розробника — тільки під час `npm run dev` (у production цей код вирізається).
const DevTools = import.meta.env.DEV ? lazy(() => import('./dev/DevTools')) : null

function measureScreen(): Screen {
  const w = window.innerWidth
  const h = window.innerHeight
  const region = document.querySelector('.lyrics-region')
  const top = region ? region.getBoundingClientRect().top : h * 0.72
  return {
    w,
    h,
    layout: w / h >= 1 ? 'wide' : 'tall',
    // Враховуємо всю фактичну зону тексту й керування, зокрема на низьких екранах.
    reservedBottom: Math.max(0, Math.min(h, h - top)),
    reservedTop: Math.min(24, h * 0.03),
  }
}

export function App() {
  const engine = getEngine()
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const bus = useMemo(() => new FrameBus(), [])
  const reduced = useReducedMotion()
  const compact = useCompactRendering()
  const [started, setStarted] = useState(false)
  const [lyricsOn, setLyricsOn] = useState(true)
  const [textOpen, setTextOpen] = useState(false)
  const [initialScreen] = useState(measureScreen)
  const screen = useRef<Screen>(initialScreen)
  const [layout, setLayout] = useState<Layout>(screen.current.layout)
  const [screenKey, setScreenKey] = useState('')

  useLayoutEffect(() => {
    const update = () => {
      screen.current = measureScreen()
      setLayout(screen.current.layout)
      setScreenKey(`${screen.current.w}x${screen.current.h}x${Math.round(screen.current.reservedBottom)}`)
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    const region = document.querySelector('.lyrics-region')
    if (region) ro.observe(region)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      ro.disconnect()
    }
  }, [])

  useStoryLoop(engine, bus, screen, reduced, `${layout}|${screenKey}`, compact)

  const start = useCallback(() => {
    setStarted(true)
    void engine.play()
  }, [engine])

  const ended = state.status === 'ended'

  // клавіатура: пробіл/K — пауза, ←/→ — перемотування, M — звук, L — слова
  useEffect(() => {
    if (!started) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const tgt = e.target as HTMLElement | null
      const tag = tgt?.tagName
      const interactive = tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tgt?.isContentEditable
      if (document.querySelector('dialog[open]')) return
      // e.code не залежить від розкладки (працює і з українською)
      const c = e.code
      if ((c === 'Space' || c === 'KeyK') && !interactive) {
        e.preventDefault()
        engine.toggle()
      } else if ((c === 'ArrowLeft' || c === 'ArrowRight') && tag !== 'INPUT') {
        e.preventDefault()
        engine.seek(engine.el.currentTime + (c === 'ArrowLeft' ? -5 : 5))
      } else if (c === 'KeyM') {
        engine.setMuted(!engine.el.muted)
      } else if (c === 'KeyL') {
        setLyricsOn((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [started, engine])

  return (
    <CompactRendering.Provider value={compact}>
    <div className={`app${started ? ' app--started' : ''}${reduced ? ' app--reduced' : ''}${compact ? ' app--compact' : ''}${ended ? ' app--ended' : ''}`}>
      <StageHost scenes={SCENES} bus={bus} layout={layout} compact={compact} />
      <div className="vignette" aria-hidden="true" />
      <div className="bottom-fade" aria-hidden="true" />
      <Banner bus={bus} reduced={reduced} />
      <LyricsOverlay bus={bus} visible={lyricsOn && started} reduced={reduced} />
      <FinalScreen bus={bus} ended={ended} onReplay={() => engine.restart()} reduced={reduced} />
      <main className="ui" aria-label="Музичне привітання">
        {started && <h1 className="visually-hidden">Віта, з Днем Вчителя! Музична історія «Тепло простих розмов»</h1>}
        {started && (
          <PlayerControls engine={engine} state={state} lyricsOn={lyricsOn} onToggleLyrics={() => setLyricsOn((v) => !v)} onOpenText={() => setTextOpen(true)} />
        )}
        <StatusLayer engine={engine} state={state} active={started} />
      </main>
      <IntroScreen visible={!started} onStart={start} />
      <LyricsDialog open={textOpen} onClose={() => setTextOpen(false)} />
      {DevTools && (
        <Suspense fallback={null}>
          <DevTools bus={bus} engine={engine} onStart={() => setStarted(true)} />
        </Suspense>
      )}
    </div>
    </CompactRendering.Provider>
  )
}
