import { createContext, useSyncExternalStore } from 'react'

// Touch devices and small viewports use the same complete story with fewer
// decorative particles. A landscape rotation must keep the mobile budget.
const QUERY = '(pointer: coarse), (max-width: 719px), (max-height: 520px)'
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
const snapshot = () => window.matchMedia(QUERY).matches

export function useCompactRendering() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}

export const CompactRendering = createContext(false)
