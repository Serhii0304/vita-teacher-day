import type { SceneWindow } from '../story/SceneTimeline'

/**
 * За скільки секунд до появи сцени починати її фонову підготовку (DOM будується порціями
 * між кадрами, тому на повільних телефонах потрібен запас часу).
 */
export const PREWARM_S = 5

/** Keep both sides of a dissolve and prepare the next scene before it appears. */
export function sceneMounts(schedule: SceneWindow[], time: number) {
  return schedule.filter((scene, i) => {
    const next = schedule[i + 1]
    return time >= scene.start - PREWARM_S && (!next || time < next.start + next.fadeIn)
  }).map(scene => scene.id)
}
