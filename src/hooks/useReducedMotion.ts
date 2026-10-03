import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** У dev-режимі можна примусово ввімкнути режим зменшеного руху: ?reduced=1 (для перевірки). */
const devForce = import.meta.env.DEV && new URLSearchParams(location.search).get('reduced') === '1'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => devForce || (typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches))
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY)
    if (!mq) return
    const on = () => setReduced(devForce || mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}
