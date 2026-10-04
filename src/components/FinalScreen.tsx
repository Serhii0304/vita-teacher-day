import { memo, useEffect, useRef } from 'react'
import { SITE } from '../config/site'
import { clamp } from '../engine/math'
import type { FrameBus } from '../stage/frameBus'
import { finalMessageWindow } from '../story/SceneTimeline'
import { IconReplay } from './icons'

/**
 * Фінальне привітання. Напис проявляється під час інструментального завершення,
 * а після кінця запису з’являються підпис і кнопка «Послухати ще раз» (повтор не запускається сам).
 */
export const FinalScreen = memo(function FinalScreen({ bus, ended, onReplay, reduced }: { bus: FrameBus; ended: boolean; onReplay: () => void; reduced: boolean }) {
  const msg = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(
    () =>
      bus.add((ctx) => {
        if (!ctx.heavy) return
        const node = msg.current
        if (!node) return
        const w = finalMessageWindow(ctx.tl)
        const op = ended ? 1 : clamp((ctx.tReal - w.from) / w.fadeIn)
        node.style.opacity = op.toFixed(3)
        node.style.visibility = op > 0.001 ? 'visible' : 'hidden'
        node.style.transform = reduced ? 'none' : `translateY(${((1 - op) * 10).toFixed(1)}px)`
      }),
    [bus, ended, reduced],
  )
  useEffect(() => {
    if (ended) btn.current?.focus({ preventScroll: true })
  }, [ended])
  return (
    <div className={`final${ended ? ' final--ended' : ''}`}>
      <div ref={msg} className="final__message" style={{ opacity: 0, visibility: 'hidden' }}>
        <p className="final__text">{SITE.final.message}</p>
        <p className="final__sign" aria-hidden={!ended}>
          {SITE.final.signature}
        </p>
        {ended && (
          <button ref={btn} type="button" className="final__replay" onClick={onReplay}>
            <IconReplay />
            <span>{SITE.final.replay}</span>
          </button>
        )}
      </div>
    </div>
  )
})
