import { useEffect, useRef } from 'react'
import { SITE } from '../config/site'
import { LYRIC_BY_ID, STANZAS } from '../data/lyrics'
import { IconClose } from './icons'

/** Повний текст пісні у модальному вікні (Esc або кнопка закривають; музика й анімація не зупиняються). */
export function LyricsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="lyrics-dialog"
      aria-labelledby="lyrics-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="lyrics-dialog__inner">
        <header className="lyrics-dialog__head">
          <h2 id="lyrics-dialog-title">{SITE.storyTitle}</h2>
          <button type="button" className="ctl" onClick={onClose} aria-label="Закрити текст пісні">
            <IconClose />
          </button>
        </header>
        <div className="lyrics-dialog__body">
          {STANZAS.map((ids, i) => (
            <p key={i} className="lyrics-dialog__stanza">
              {ids.map((id, j) => (
                <span key={id}>
                  {LYRIC_BY_ID[id].text}
                  {j < ids.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </dialog>
  )
}
