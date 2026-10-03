import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { AudioPlayer } from '../audio/AudioPlayer'
import { LYRIC_BY_ID } from '../data/lyrics'
import { formatTime } from '../engine/math'
import { timelineStore, type TimingData } from '../story/timeline'
import { sceneSchedule } from '../story/SceneTimeline'

/**
 * Локальний редактор таймкодів (тільки `npm run dev`, адреса ?dev=calibrate).
 * Слухайте пісню, позначайте початок/кінець рядків поточним часом, правте числа вручну,
 * експортуйте/імпортуйте JSON або збережіть прямо в src/data/timing.json.
 * Зміни одразу застосовуються до субтитрів і режисури (сцени прив’язані до рядків).
 *
 * Клавіші: Пробіл — пауза; S — початок вибраного рядка = зараз; E — кінець = зараз;
 * N — кінець поточного і початок наступного = зараз; ↑/↓ — вибір рядка; P — грати з початку рядка (−1 с).
 */
export default function Calibrator({ engine }: { engine: AudioPlayer }) {
  const [data, setData] = useState<TimingData>(() => structuredClone(timelineStore.getData()))
  const [sel, setSel] = useState(0)
  const [msg, setMsg] = useState('')
  const st = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const apply = (next: TimingData) => {
    setData(next)
    try {
      timelineStore.set(next)
      setMsg('')
    } catch (e) {
      setMsg(String(e))
    }
  }
  const now = () => Math.round(engine.el.currentTime * 100) / 100
  const setLine = (i: number, patch: Partial<TimingData['lines'][number]>) =>
    apply({ ...data, status: 'draft', lines: data.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'KeyS') setLine(sel, { start: now(), status: 'edited' })
      else if (e.code === 'KeyE') setLine(sel, { end: now(), status: 'edited' })
      else if (e.code === 'KeyN') {
        const t = now()
        const lines = data.lines.map((l, j) => (j === sel ? { ...l, end: t, status: 'edited' } : j === sel + 1 ? { ...l, start: t, status: 'edited' } : l))
        apply({ ...data, status: 'draft', lines })
        setSel((s) => Math.min(data.lines.length - 1, s + 1))
      } else if (e.code === 'ArrowDown') {
        e.preventDefault()
        setSel((s) => Math.min(data.lines.length - 1, s + 1))
      } else if (e.code === 'ArrowUp') {
        e.preventDefault()
        setSel((s) => Math.max(0, s - 1))
      } else if (e.code === 'KeyP') {
        engine.seek(Math.max(0, data.lines[sel].start - 1))
        void engine.play()
      } else return
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'timing.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const importJson = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as TimingData
      if (!Array.isArray(parsed.lines) || !Array.isArray(parsed.sections)) throw new Error('Невідомий формат')
      apply(parsed)
      setMsg('Імпортовано')
    } catch (e) {
      setMsg(`Помилка імпорту: ${String(e)}`)
    }
  }
  const save = async () => {
    const allVerified = data.lines.every((l) => l.status === 'verified')
    const payload = { ...data, status: allVerified ? 'verified' : 'draft' }
    const r = await fetch('/__vita/save-timing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await r.json().catch(() => ({}))
    setMsg(r.ok ? `Збережено у ${j.file ?? 'src/data/timing.json'}` : `Не вдалося зберегти: ${j.error ?? r.status}`)
  }

  const cur = st.time
  const verified = data.lines.filter((l) => l.status === 'verified').length

  return (
    <aside className="cal" aria-label="Редактор таймкодів (розробка)">
      <header className="cal__head">
        <strong>Таймкоди</strong>
        <span>
          {formatTime(cur)} · {cur.toFixed(2)} с · перевірено {verified}/{data.lines.length}
        </span>
      </header>
      <div className="cal__bar">
        <button onClick={() => engine.toggle()}>{st.wantsPlay ? 'Пауза' : 'Грати'}</button>
        <button onClick={() => engine.seek(cur - 2)}>−2 с</button>
        <button onClick={() => engine.seek(cur + 2)}>+2 с</button>
        <button onClick={exportJson}>Експорт JSON</button>
        <button onClick={() => fileRef.current?.click()}>Імпорт JSON</button>
        <button onClick={save}>Зберегти у проєкт</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
      </div>
      {msg && <p className="cal__msg">{msg}</p>}
      <p className="cal__hint">S — початок, E — кінець, N — кінець і початок наступного, P — програти рядок, ↑↓ — вибір.</p>
      <div className="cal__list" ref={listRef}>
        {data.lines.map((l, i) => {
          const active = cur >= l.start && cur <= l.end
          return (
            <div key={l.id} data-i={i} className={`cal__row${i === sel ? ' is-sel' : ''}${active ? ' is-active' : ''}`} onClick={() => setSel(i)}>
              <div className="cal__text">
                <code>{l.id}</code> {LYRIC_BY_ID[l.id]?.text}
              </div>
              <div className="cal__nums">
                <label>
                  поч.
                  <input type="number" step={0.05} value={l.start} onChange={(e) => setLine(i, { start: Number(e.target.value), status: 'edited' })} />
                </label>
                <button onClick={() => setLine(i, { start: now(), status: 'edited' })} title="Початок = поточний час">
                  ⏱
                </button>
                <label>
                  кін.
                  <input type="number" step={0.05} value={l.end} onChange={(e) => setLine(i, { end: Number(e.target.value), status: 'edited' })} />
                </label>
                <button onClick={() => setLine(i, { end: now(), status: 'edited' })} title="Кінець = поточний час">
                  ⏱
                </button>
                <button
                  onClick={() => {
                    engine.seek(Math.max(0, l.start - 1))
                    void engine.play()
                  }}
                  title="Програти з цього рядка"
                >
                  ▶
                </button>
                <label className="cal__ok">
                  <input type="checkbox" checked={l.status === 'verified'} onChange={(e) => setLine(i, { status: e.target.checked ? 'verified' : 'edited' })} />
                  на слух
                </label>
              </div>
            </div>
          )
        })}
        <details className="cal__sections">
          <summary>Секції (для довідки) і сцени</summary>
          {data.sections.map((s, i) => (
            <div key={s.id} className="cal__sec">
              <code>{s.id}</code>
              <input type="number" step={0.05} value={s.start} onChange={(e) => apply({ ...data, sections: data.sections.map((x, j) => (j === i ? { ...x, start: Number(e.target.value) } : x)) })} />
              <input type="number" step={0.05} value={s.end} onChange={(e) => apply({ ...data, sections: data.sections.map((x, j) => (j === i ? { ...x, end: Number(e.target.value) } : x)) })} />
            </div>
          ))}
          <ul className="cal__scenes">
            {sceneSchedule(timelineStore.get()).map((w) => (
              <li key={w.id}>
                <code>{w.id}</code> з {w.start.toFixed(2)} с — {w.label}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </aside>
  )
}
