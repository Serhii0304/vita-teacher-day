import { useEffect, useRef } from 'react'
import { perf } from '../stage/perfStats'

/**
 * Діагностична панель продуктивності: вмикається лише адресою з «?perf»
 * (наприклад, …/vita-teacher-day/?perf). Показує частоту кадрів на самому пристрої,
 * щоб можна було зробити знімок екрана. Нічого не збирає і не надсилає.
 */
export function PerfHud({ compact }: { compact: boolean }) {
  const box = useRef<HTMLPreElement>(null)
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let frames = 0
    let worst = 0
    let over50 = 0
    let shownAt = last
    const worstRecent: number[] = []
    const loop = (now: number) => {
      const dt = now - last
      last = now
      frames++
      if (dt > worst) worst = dt
      if (dt > 50) over50++
      if (now - shownAt >= 1000) {
        const span = (now - shownAt) / 1000
        const scene = perf.take()
        worstRecent.push(worst)
        if (worstRecent.length > 5) worstRecent.shift()
        const el = box.current
        if (el) {
          const n = scene.light + scene.heavy
          el.textContent = [
            `екран: ${(frames / span).toFixed(0)} к/с`,
            `сцена: ${(n / span).toFixed(0)} к/с (важких ${(scene.heavy / span).toFixed(0)})`,
            `JS кадру: ${n ? (scene.jsMs / n).toFixed(1) : '0'} мс`,
            `найдовший (5 с): ${Math.max(...worstRecent).toFixed(0)} мс`,
            `кадрів > 50 мс: ${over50}`,
            `${compact ? 'телефон' : 'ПК'} · ліміт ${perf.lightCap}/${perf.heavyCap}`,
            `${innerWidth}×${innerHeight} · DPR ${devicePixelRatio.toFixed(2)}`,
          ].join('\n')
        }
        frames = 0
        worst = 0
        shownAt = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [compact])
  return <pre ref={box} className="perf-hud" aria-hidden="true" />
}

export const perfHudEnabled = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('perf')
