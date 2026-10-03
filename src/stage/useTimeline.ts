import { useSyncExternalStore } from 'react'
import { timelineStore } from '../story/timeline'

/** Поточний таймлайн; у dev-режимі оновлюється, коли змінюють розмітку в редакторі. */
export function useTimeline() {
  return useSyncExternalStore(timelineStore.subscribe, timelineStore.get, timelineStore.get)
}
