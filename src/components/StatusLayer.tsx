import { useEffect, useState } from 'react'
import type { AudioPlayer, AudioState } from '../audio/AudioPlayer'

/**
 * Стан завантаження та помилки. Індикатор з’являється лише якщо очікування триває довше за мить;
 * якщо завантаження «зависло» або сталася помилка — зрозуміла кнопка повторної спроби (без нескінченного спінера).
 */
export function StatusLayer({ engine, state, active }: { engine: AudioPlayer; state: AudioState; active: boolean }) {
  const waiting = active && state.wantsPlay && (state.buffering || state.status === 'loading') && !state.slow
  const [showWait, setShowWait] = useState(false)
  useEffect(() => {
    if (!waiting) {
      setShowWait(false)
      return
    }
    const id = window.setTimeout(() => setShowWait(true), 450)
    return () => window.clearTimeout(id)
  }, [waiting])

  let body: React.ReactNode = null
  if (active && state.error === 'blocked') {
    body = (
      <>
        <p>Браузер не дозволив запустити звук автоматично.</p>
        <button type="button" className="status__btn" onClick={() => void engine.play()}>
          Відтворити
        </button>
      </>
    )
  } else if (active && (state.status === 'error' || state.error)) {
    body = (
      <>
        <p>Не вдалося завантажити пісню. Перевірте з’єднання з інтернетом.</p>
        <button type="button" className="status__btn" onClick={() => void engine.retry()}>
          Спробувати ще раз
        </button>
      </>
    )
  } else if (active && state.slow) {
    body = (
      <>
        <p>Пісня завантажується довше, ніж зазвичай.</p>
        <button type="button" className="status__btn" onClick={() => void engine.retry()}>
          Спробувати ще раз
        </button>
      </>
    )
  } else if (showWait) {
    body = (
      <p className="status__wait">
        <span className="status__dot" aria-hidden="true" />
        Завантажую пісню…
      </p>
    )
  }

  return (
    <div className="status" role="status" aria-live="polite">
      {body && <div className="status__card">{body}</div>}
    </div>
  )
}
