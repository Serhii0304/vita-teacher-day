import { useEffect, useRef, useState } from 'react'
import type { AudioPlayer, AudioState } from '../audio/AudioPlayer'
import { formatTime } from '../engine/math'
import { IconMuted, IconPause, IconPlay, IconReplay, IconText, IconVolume, IconWords, IconWordsOff } from './icons'

/**
 * Плеєр: відтворення/пауза, перемотування з часом і тривалістю, звук, слова, текст пісні, повтор.
 * Кнопки не менші за 44×44 CSS-пікселі, з підписами для екранних читачів і видимим фокусом.
 */
export function PlayerControls({
  engine,
  state,
  lyricsOn,
  onToggleLyrics,
  onOpenText,
}: {
  engine: AudioPlayer
  state: AudioState
  lyricsOn: boolean
  onToggleLyrics: () => void
  onOpenText: () => void
}) {
  const playing = state.wantsPlay && state.status !== 'ended'
  const dur = state.duration || 0
  const [drag, setDrag] = useState<number | null>(null)
  const pending = useRef<number | null>(null)
  const raf = useRef(0)
  const value = drag ?? state.time

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const scrub = (v: number) => {
    setDrag(v)
    pending.current = v
    if (!raf.current)
      raf.current = requestAnimationFrame(() => {
        raf.current = 0
        if (pending.current != null) engine.seek(pending.current)
      })
  }
  const endScrub = () => {
    if (pending.current != null) engine.seek(pending.current)
    pending.current = null
    setDrag(null)
  }

  return (
    <div className="controls" role="group" aria-label="Керування піснею">
      <div className="controls__row controls__row--main">
        <button
          type="button"
          className="ctl ctl--play"
          onClick={() => (playing ? engine.pause() : void engine.play())}
          aria-label={playing ? 'Пауза' : 'Відтворити'}
          title={playing ? 'Пауза (пробіл)' : 'Відтворити (пробіл)'}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <span className="time" aria-hidden="true">
          {formatTime(value)}
        </span>
        <input
          className="seek"
          type="range"
          min={0}
          max={dur || 1}
          step={0.1}
          value={Math.min(value, dur || 1)}
          disabled={!dur}
          aria-label="Перемотування"
          aria-valuetext={`${formatTime(value)} з ${formatTime(dur)}`}
          style={{ ['--p' as string]: dur ? `${(Math.min(value, dur) / dur) * 100}%` : '0%' }}
          onChange={(e) => scrub(Number(e.currentTarget.value))}
          onPointerUp={endScrub}
          onKeyUp={endScrub}
          onBlur={() => drag != null && endScrub()}
        />
        <span className="time time--dur" aria-hidden="true">
          {formatTime(dur)}
        </span>
      </div>
      <div className="controls__row controls__row--extra">
        <button
          type="button"
          className="ctl"
          onClick={() => engine.setMuted(!state.muted)}
          aria-label={state.muted ? 'Увімкнути звук' : 'Вимкнути звук'}
          aria-pressed={state.muted}
          title={state.muted ? 'Увімкнути звук (M)' : 'Вимкнути звук (M)'}
        >
          {state.muted ? <IconMuted /> : <IconVolume />}
        </button>
        <button type="button" className="ctl ctl--label" onClick={onToggleLyrics} aria-label={lyricsOn ? 'Сховати слова' : 'Показати слова'} aria-pressed={!lyricsOn} title="Слова пісні на екрані (L)">
          {lyricsOn ? <IconWords /> : <IconWordsOff />}
          <span>{lyricsOn ? 'Сховати слова' : 'Показати слова'}</span>
        </button>
        <button type="button" className="ctl ctl--label" onClick={onOpenText} aria-label="Текст пісні" aria-haspopup="dialog" title="Повний текст пісні">
          <IconText />
          <span>Текст пісні</span>
        </button>
        <button type="button" className="ctl" onClick={() => engine.restart()} aria-label="Послухати з початку" title="Послухати з початку">
          <IconReplay />
        </button>
      </div>
    </div>
  )
}
