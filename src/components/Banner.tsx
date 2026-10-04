import { memo, useEffect, useRef } from 'react'
import { SITE } from '../config/site'
import { windowEnv } from '../engine/math'
import type { FrameBus } from '../stage/frameBus'
import { bannerWindows } from '../story/SceneTimeline'

/** Святковий напис «З Днем Вчителя!» — з’являється у приспівах, щоразу в іншому настрої. */
export const Banner = memo(function Banner({ bus, reduced }: { bus: FrameBus; reduced: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(
    () =>
      bus.add((ctx) => {
        // напис плавно з’являється — досить «важких» кадрів (на телефоні 30 на секунду)
        if (!ctx.heavy) return
        const node = el.current
        if (!node) return
        let op = 0
        let style = ''
        for (const w of bannerWindows(ctx.tl)) {
          const v = windowEnv(ctx.tReal, w.from, w.to, 1.3, 1.4)
          if (v > op) {
            op = v
            style = w.style
          }
        }
        node.style.opacity = op.toFixed(3)
        node.style.visibility = op > 0.001 ? 'visible' : 'hidden'
        if (style && node.dataset.style !== style) node.dataset.style = style
        node.style.transform = reduced ? 'translateX(-50%)' : `translateX(-50%) translateY(${((1 - op) * -8).toFixed(1)}px) scale(${(0.97 + op * 0.03).toFixed(3)})`
      }),
    [bus, reduced],
  )
  return (
    <div ref={el} className="banner" aria-hidden="true" style={{ opacity: 0, visibility: 'hidden' }}>
      <span>{SITE.chorusBanner}</span>
    </div>
  )
})
