import rawTiming from '../data/timing.json'
import { LYRIC_BLOCKS, LYRIC_BY_ID, type SectionId } from '../data/lyrics'

/** Дані розмітки (src/data/timing.json). Єдине джерело таймкодів рядків і секцій. */
export interface TimingData {
  version: number
  audio: string
  duration: number
  status: 'draft' | 'verified' | string
  note?: string
  sections: { id: SectionId; kind: string; start: number; end: number; status?: string }[]
  lines: { id: string; start: number; end: number; status?: string }[]
}

export interface TimedLine {
  id: string
  text: string
  section: SectionId
  start: number
  end: number
  status: string
}

/** Блок субтитрів: 1–2 рядки, що показуються разом. */
export interface LyricBlock {
  id: string
  lines: TimedLine[]
  start: number
  end: number
  /** Початок появи (прозорість росте з 0). */
  showAt: number
  fadeIn: number
  /** Початок згасання. */
  hideAt: number
  fadeOut: number
}

export interface Timeline {
  duration: number
  status: string
  lines: TimedLine[]
  line: Record<string, TimedLine>
  sections: TimingData['sections']
  section: Record<string, TimingData['sections'][number]>
  blocks: LyricBlock[]
  /** Короткі звертання для режисури. */
  s(id: string): number
  e(id: string): number
}

const LEAD = 0.85 // блок повністю читабельний щонайменше за стільки секунд до співу
const FADE_IN = 0.42
const FADE_OUT = 0.5
const TAIL = 0.7 // скільки рядок лишається після завершення (протяжна нота, видих)

export function buildTimeline(data: TimingData): Timeline {
  const lines: TimedLine[] = data.lines.map((l) => {
    const lyric = LYRIC_BY_ID[l.id]
    if (!lyric) throw new Error(`Невідомий рядок у timing.json: ${l.id}`)
    return { id: l.id, text: lyric.text, section: lyric.section, start: l.start, end: Math.max(l.end, l.start + 0.2), status: l.status ?? 'auto' }
  })
  const line = Object.fromEntries(lines.map((l) => [l.id, l]))
  const blocks: LyricBlock[] = LYRIC_BLOCKS.map((ids) => {
    const ls = ids.map((id) => line[id]).filter(Boolean)
    const start = ls[0].start
    const end = ls[ls.length - 1].end
    return { id: ids.join('+'), lines: ls, start, end, showAt: start - LEAD - FADE_IN, fadeIn: FADE_IN, hideAt: end + TAIL, fadeOut: FADE_OUT }
  })
  blocks.sort((a, b) => a.start - b.start)
  // розводимо сусідні блоки, щоб старий і новий текст не накладалися
  for (let i = 0; i + 1 < blocks.length; i++) {
    const A = blocks[i]
    const B = blocks[i + 1]
    if (A.hideAt + A.fadeOut <= B.showAt) continue
    const gap = B.start - A.end
    const f = Math.min(0.34, Math.max(0.12, (gap - 0.1) / 2))
    const mid = (A.end + B.start) / 2
    A.fadeOut = f
    B.fadeIn = f
    A.hideAt = Math.max(A.end + 0.04, Math.min(A.hideAt, mid - f))
    B.showAt = A.hideAt + A.fadeOut
  }
  if (blocks.length) blocks[0].showAt = Math.max(0, blocks[0].showAt)
  const section = Object.fromEntries(data.sections.map((s) => [s.id, s]))
  return {
    duration: data.duration,
    status: data.status,
    lines,
    line,
    sections: data.sections,
    section,
    blocks,
    s: (id) => {
      const l = line[id]
      if (l) return l.start
      const sec = section[id]
      if (sec) return sec.start
      throw new Error(`Немає рядка/секції ${id}`)
    },
    e: (id) => {
      const l = line[id]
      if (l) return l.end
      const sec = section[id]
      if (sec) return sec.end
      throw new Error(`Немає рядка/секції ${id}`)
    },
  }
}

/** Стан субтитрів у момент t — обчислюється з нуля (детерміновано). */
export interface LyricFrame {
  block: LyricBlock | null
  opacity: number
  /** 0…1 — наскільки «піднявся» блок під час появи (для легкого руху вгору). */
  rise: number
  /** Підсвічування кожного рядка блоку 0…1. */
  active: number[]
}

export function lyricFrame(tl: Timeline, t: number): LyricFrame {
  for (const b of tl.blocks) {
    const hideEnd = b.hideAt + b.fadeOut
    if (t < b.showAt || t >= hideEnd) continue
    const inP = b.fadeIn > 0 ? Math.min(1, (t - b.showAt) / b.fadeIn) : 1
    const outP = t > b.hideAt ? 1 - (t - b.hideAt) / b.fadeOut : 1
    const opacity = Math.max(0, Math.min(inP, outP))
    // активний — останній рядок, що вже почався
    let idx = -1
    for (let i = 0; i < b.lines.length; i++) if (t >= b.lines[i].start - 0.12) idx = i
    const active = b.lines.map((l, i) => {
      if (i !== idx) return 0
      return Math.min(1, (t - (l.start - 0.12)) / 0.3)
    })
    return { block: b, opacity, rise: inP, active }
  }
  return { block: null, opacity: 0, rise: 1, active: [] }
}

/* ---------- сховище таймлайну (у dev-режимі редактор може оновлювати розмітку «наживо») ---------- */

type Listener = () => void
let current: Timeline = buildTimeline(rawTiming as TimingData)
let currentData: TimingData = rawTiming as TimingData
const listeners = new Set<Listener>()

export const timelineStore = {
  get: () => current,
  getData: () => currentData,
  set(data: TimingData) {
    currentData = data
    current = buildTimeline(data)
    listeners.forEach((l) => l())
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}
