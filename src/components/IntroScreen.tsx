import { memo, useEffect, useRef } from 'react'
import { SITE } from '../config/site'
import { LEAF_COLORS, LEAF_PATHS } from '../art/common'

/**
 * Перший екран: завершена композиція (книга на столі біля вікна — це вже кадр першої сцени),
 * делікатне листя, назва, підзаголовок, кнопка і підпис.
 * Натискання одразу запускає пісню: без довгого декоративного вступу.
 */
export const IntroScreen = memo(function IntroScreen({ visible, onStart }: { visible: boolean; onStart: () => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (visible) btn.current?.focus({ preventScroll: true })
  }, [visible])
  return (
    <div className={`intro${visible ? '' : ' intro--leaving'}`} aria-hidden={!visible}>
      <div className="intro__leaves" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <svg key={i} className="intro__leaf" viewBox="-14 -14 28 28" style={{ ['--i' as string]: i }}>
            <path d={LEAF_PATHS[i % LEAF_PATHS.length]} fill={LEAF_COLORS[i % LEAF_COLORS.length]} />
          </svg>
        ))}
      </div>
      <div className="intro__content">
        <h1 className="intro__title">{SITE.intro.title}</h1>
        <p className="intro__subtitle">{SITE.intro.subtitle}</p>
        <button ref={btn} type="button" className="intro__button" onClick={onStart} tabIndex={visible ? 0 : -1}>
          <span className="intro__button-glow" aria-hidden="true" />
          {SITE.intro.button}
        </button>
        <p className="intro__sign">{SITE.intro.signature}</p>
      </div>
    </div>
  )
})
