import type { SceneId } from '../stage/types'
import type { Timeline } from './timeline'

/**
 * Розклад сцен і загальних подій, прив’язаний до рядків пісні.
 * Якщо в редакторі змінити таймкоди рядків, сцени й дії персонажів зсунуться разом із ними.
 *
 * Сцена з’являється поверх попередньої (справжній кросфейд без «провалу» яскравості);
 * попередня ховається, щойно нова повністю проявилася.
 */
export interface SceneWindow {
  id: SceneId
  start: number
  fadeIn: number
  /** Службова назва епізоду (лише в даних і в dev-панелі). */
  label: string
}

export function sceneSchedule(tl: Timeline): SceneWindow[] {
  const s = tl.s
  const e = tl.e
  return [
    { id: 'book', start: 0, fadeIn: 0, label: 'Вступ: книга відкривається, назва історії' },
    { id: 'classroom', start: s('v1-1') - 2.2, fadeIn: 1.5, label: 'Куплет 1: шкільний день' },
    { id: 'evening', start: s('v1-5') - 0.2, fadeIn: 3.2, label: 'Куплет 1: вечірній затишок' },
    { id: 'chorus1', start: s('c1-1') - 0.75, fadeIn: 0.6, label: 'Приспів 1: букет і святковий епізод' },
    { id: 'phone', start: e('c1-4') + 1.0, fadeIn: 1.6, label: 'Куплет 2: розмова телефоном' },
    { id: 'windows', start: s('c2-1') - 1.7, fadeIn: 1.5, label: 'Приспів 2: два вікна, святкове світло' },
    { id: 'garden', start: e('c2-4') + 1.4, fadeIn: 2.4, label: 'Програш, брідж, фінальний приспів, завершення: сад і тераса' },
  ]
}

/** Видимість сцени у момент t (0…1). */
export function sceneVisibility(list: SceneWindow[], i: number, t: number): number {
  const w = list[i]
  if (t < w.start) return 0
  const next = list[i + 1]
  if (next && t >= next.start + next.fadeIn) return 0
  if (w.fadeIn <= 0) return 1
  const p = Math.min(1, (t - w.start) / w.fadeIn)
  return p * p * (3 - 2 * p)
}

/** Ключові моменти для режиму зменшеного руху: спокійні композиції, що змінюються з рядками. */
export function reducedKeys(tl: Timeline): number[] {
  const keys = new Set<number>([0, 4.2, 8.4])
  for (const l of tl.lines) keys.add(Math.round((l.start + 1.7) * 100) / 100)
  for (const w of sceneSchedule(tl)) keys.add(Math.round((w.start + w.fadeIn + 0.8) * 100) / 100)
  const inter = tl.section['interlude']
  if (inter) for (let x = inter.start + 2; x < inter.end; x += 4.5) keys.add(Math.round(x * 100) / 100)
  const end = tl.section['ending']
  if (end) for (let x = end.start + 1.5; x < end.end; x += 6) keys.add(Math.round(x * 100) / 100)
  return [...keys].sort((a, b) => a - b)
}

export function snapToKey(keys: number[], t: number): number {
  let lo = 0
  let hi = keys.length - 1
  if (t < keys[0]) return t
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (keys[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return keys[lo]
}

/** Святковий напис «З Днем Вчителя!» — у кожному приспіві в новій композиції. */
export function bannerWindows(tl: Timeline) {
  const s = tl.s
  const e = tl.e
  return [
    { id: 'c1', from: s('c1-3') - 0.2, to: e('c1-4') + 0.6, style: 'gold' as const },
    { id: 'c2', from: s('c2-1') + 0.6, to: e('c2-2') + 0.2, style: 'night' as const },
    { id: 'f', from: s('f-1') + 0.4, to: e('f-4') + 0.8, style: 'sunset' as const },
  ]
}

/** Фінальний напис з’являється під час інструментального завершення. */
export function finalMessageWindow(tl: Timeline) {
  return { from: tl.e('o-2') + 2.6, fadeIn: 2.2 }
}
