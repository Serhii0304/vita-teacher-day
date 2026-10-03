import type { SceneWindow } from '../story/SceneTimeline'

/** Keep both sides of a dissolve and prepare the next scene before it appears. */
export function sceneMounts(schedule: SceneWindow[], time: number) {
  return schedule.filter((scene, i) => {
    const next = schedule[i + 1]
    return time >= scene.start - 2 && (!next || time < next.start + next.fadeIn)
  }).map(scene => scene.id)
}
