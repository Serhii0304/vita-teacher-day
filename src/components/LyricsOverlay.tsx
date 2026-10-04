import { memo, useEffect, useRef } from 'react'
import type { FrameBus } from '../stage/frameBus'
import { lyricFrame } from '../story/timeline'

/**
 * Нерозривний пробіл після коротких слів (прийменники, сполучники) і перед тире,
 * щоб на вузькому екрані «з», «і», «у», «в», «й», «за», «до» не лишалися самотніми в кінці рядка.
 */
export function typo(text: string): string {
  return text.replace(/(?<=^|[\s\u00A0(«])([А-ЩЬЮЯІЇЄҐа-щьюяіїєґ’']{1,2})\s+/g, '$1\u00A0').replace(/\s+—/g, '\u00A0—')
}

/**
 * Романтичне караоке: один-два рядки пісні в нижній частині кадру, поверх анімованої сцени.
 * Видимість, підсвічування активного рядка і легке підняття — від справжнього часу аудіо.
 * Без імітації пословного караоке: підсвічується весь активний рядок.
 */
export const LyricsOverlay = memo(function LyricsOverlay({ bus, visible, reduced }: { bus: FrameBus; visible: boolean; reduced: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const l0 = useRef<HTMLParagraphElement>(null)
  const l1 = useRef<HTMLParagraphElement>(null)
  const current = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    current.current = undefined
    return bus.add((ctx) => {
      // субтитри змінюються повільно — досить «важких» кадрів (на телефоні 30 на секунду)
      if (!ctx.heavy) return
      const f = lyricFrame(ctx.tl, ctx.tReal)
      const el = box.current
      if (!el) return
      const id = f.block?.id ?? null
      const ps = [l0.current, l1.current]
      if (id !== current.current) {
        current.current = id
        const ls = f.block?.lines ?? []
        ps.forEach((p, i) => {
          if (!p) return
          p.textContent = typo(ls[i]?.text ?? '')
          p.style.display = ls[i] ? '' : 'none'
        })
      }
      el.style.opacity = f.opacity.toFixed(3)
      el.style.transform = reduced ? 'none' : `translateY(${((1 - f.rise) * 9).toFixed(2)}px)`
      ps.forEach((p, i) => p?.style.setProperty('--a', (f.active[i] ?? 0).toFixed(3)))
    })
  }, [bus, reduced])

  return (
    <div className={`lyrics-region${reduced ? ' lyrics-region--reduced' : ''}`} aria-hidden="true">
      <div ref={box} className={`lyrics${visible ? '' : ' lyrics--hidden'}`} style={{ opacity: 0 }}>
        <p ref={l0} className="lyrics__line" />
        <p ref={l1} className="lyrics__line" />
      </div>
    </div>
  )
})
