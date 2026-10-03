import { useEffect, useRef } from 'react'
import { MAN, WOMAN } from '../characters/body'
import { Character, type CharacterHandle } from '../characters/Character'
import { M_AUTUMN, M_HOME, M_SMART, SERHII_LOOK, VITA_LOOK, W_AUTUMN, W_HOME, W_TEACHER } from '../characters/palettes'
import { FACE, restPose } from '../characters/pose'
import type { Params } from '../engine/moves'

/**
 * Великий план для детального огляду (тільки dev):
 * ?dev=lab&view=face&who=w|m&turn=0.75&face=warm&outfit=teacher|home|autumn
 * ?dev=lab&view=body&who=w|m&outfit=...
 */
export function LabFocus() {
  const q = new URLSearchParams(location.search)
  const who = q.get('who') ?? 'w'
  const view = q.get('view') ?? 'face'
  const turn = Number(q.get('turn') ?? 0.75)
  const faceName = (q.get('face') ?? 'warm') as keyof typeof FACE
  const outfitName = q.get('outfit') ?? 'teacher'
  const t = Number(q.get('t') ?? 1.3)
  const extra: Params = {}
  for (const [k, v] of q.entries()) if (k.startsWith('p_')) extra[k.slice(2)] = Number(v)
  const ref = useRef<CharacterHandle | null>(null)
  const woman = who === 'w'
  const body = woman ? WOMAN : MAN
  const outfit = woman
    ? outfitName === 'home'
      ? W_HOME
      : outfitName === 'autumn'
        ? W_AUTUMN
        : W_TEACHER
    : outfitName === 'home'
      ? M_HOME
      : outfitName === 'autumn'
        ? M_AUTUMN
        : M_SMART
  useEffect(() => {
    ref.current?.apply({ ...restPose(body), ...FACE[faceName], turn, ...extra, x: 0, y: 0 }, t)
  })
  const hy = body.pelvisY + body.headPivot[1] - 20
  const vb = view === 'face' ? `${-40} ${hy - 40} 90 64` : view === 'bust' ? `-80 ${hy - 50} 170 120` : `-160 -390 320 400`
  return (
    <svg viewBox={vb} style={{ width: '100vw', height: '100vh', display: 'block', background: '#e2cfb4' }} preserveAspectRatio="xMidYMid meet">
      <Character ref={ref} body={body} look={woman ? VITA_LOOK : SERHII_LOOK} outfit={outfit} seed={2} />
    </svg>
  )
}
