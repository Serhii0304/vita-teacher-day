import { useEffect, useRef, useState } from 'react'
import { MAN, WOMAN, type BodySpec } from '../characters/body'
import { Character, type CharacterHandle } from '../characters/Character'
import { applyWalk, type Walk } from '../characters/gait'
import { M_AUTUMN, M_HOME, M_SMART, SERHII_LOOK, VITA_LOOK, W_AUTUMN, W_HOME, W_TEACHER, type Outfit, type SkinHair } from '../characters/palettes'
import { FACE, HAND, PROP, restPose } from '../characters/pose'
import type { Params } from '../engine/moves'

/** Лабораторія персонажів (тільки для розробки): пози, міміка, хода. */
interface Spec {
  body: BodySpec
  look: SkinHair
  outfit: Outfit
  pose: Params
  walk?: Walk
  light?: 'front' | 'back'
}

const W = WOMAN
const M = MAN

function specs(): Spec[] {
  const w = (o: Params, outfit = W_TEACHER): Spec => ({ body: W, look: VITA_LOOK, outfit, pose: { ...restPose(W), ...o } })
  const m = (o: Params, outfit = M_SMART): Spec => ({ body: M, look: SERHII_LOOK, outfit, pose: { ...restPose(M), ...o } })
  return [
    w({ x: 140, y: 470, ...FACE.warm }),
    w({ x: 330, y: 470, turn: 0, ...FACE.beam, nhx: 30, nhy: 40, nHand: HAND.open, nw: -120, nA: 1, propF: PROP.book, fHand: HAND.hold, fhx: 22, fhy: 52, fw: -90, fA: 1, fFront: 1, bookOpen: 1 }),
    w({ x: 520, y: 470, py: 72, nfx: 52, ffx: 62, ...FACE.peace, propN: PROP.cup, nHand: HAND.hold, nhx: 26, nhy: 46, nw: -90, nA: 1, fHand: HAND.hold, fhx: 30, fhy: 52, fFront: 1, steam: 1, lean: -6 }, W_HOME),
    { ...w({ x: 690, y: 470, ...FACE.warm, wind: 1 }, W_AUTUMN), walk: { t0: 0, t1: 4, x0: 690, x1: 900, lead: 'n', sc: 1 } },
    m({ x: 1080, y: 470, flip: -1, ...FACE.warm, propN: PROP.bouquet, nHand: HAND.hold, nhx: 42, nhy: 46, nw: -90, nA: 1, lean: 4 }),
    m({ x: 1260, y: 470, ...FACE.listen, talk: 1, nHand: HAND.phone, nhx: -8, nhy: -6, nw: 175, nA: 1, head: 4 }, M_HOME),
    { ...m({ x: 1400, y: 470, ...FACE.calm, wind: 1 }, M_AUTUMN), walk: { t0: 0, t1: 4, x0: 1400, x1: 1560, lead: 'f', sc: 1 } },
  ]
}

const faces: [string, Params][] = [
  ['calm', FACE.calm],
  ['warm', FACE.warm],
  ['beam', FACE.beam],
  ['listen', FACE.listen],
  ['concern', FACE.concern],
  ['relief', FACE.relief],
  ['peace', FACE.peace],
]

export function Lab() {
  const [t, setT] = useState(1.3)
  const [play, setPlay] = useState(false)
  const [turn, setTurn] = useState(0.75)
  const list = useRef(specs())
  const refs = useRef<(CharacterHandle | null)[]>([])
  const faceRefs = useRef<(CharacterHandle | null)[]>([])

  useEffect(() => {
    if (!play) return
    let raf = 0
    const t0 = performance.now() - t * 1000
    const loop = (now: number) => {
      setT(((now - t0) / 1000) % 5)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play])

  useEffect(() => {
    list.current.forEach((s, i) => {
      const p = { ...s.pose }
      if (s.walk) {
        if (t > s.walk.t1) p.x = s.walk.x1
        applyWalk(p, [s.walk], t, s.body)
      }
      refs.current[i]?.apply(p, t)
    })
    faces.forEach(([, f], i) => {
      faceRefs.current[i * 2 + 1]?.apply({ ...restPose(M), ...f, turn, x: 0, y: 0, flip: -1 }, t)
    })
  }, [t, turn])

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#e9dcc8' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', gap: 16, padding: 8, background: '#2a1f1b', alignItems: 'center' }}>
        <button onClick={() => setPlay((v) => !v)}>{play ? 'Пауза' : 'Грати'}</button>
        <label>
          t <input type="range" min={0} max={5} step={0.01} value={t} onChange={(e) => setT(+e.target.value)} /> {t.toFixed(2)}
        </label>
        <label>
          turn <input type="range" min={0} max={1} step={0.01} value={turn} onChange={(e) => setTurn(+e.target.value)} /> {turn.toFixed(2)}
        </label>
      </div>
      <svg viewBox="0 0 1600 520" style={{ width: '100%', display: 'block', background: 'linear-gradient(#f3e6d2, #dcc7aa)' }}>
        <line x1={0} x2={1600} y1={470} y2={470} stroke="#b49a7c" />
        {list.current.map((s, i) => (
          <Character key={i} ref={(h) => void (refs.current[i] = h)} body={s.body} look={s.look} outfit={s.outfit} light={s.light} seed={i + 1} />
        ))}
      </svg>
      <svg viewBox="0 0 1400 330" style={{ width: '100%', display: 'block', background: '#cbb89c' }}>
        {faces.map(([name], i) => (
          <g key={name} transform={`translate(${60 + i * 195} 0)`}>
            <g transform="translate(110 1600) scale(4.4)">
              <Character ref={(h) => void (faceRefs.current[i * 2 + 1] = h)} body={M} look={SERHII_LOOK} outfit={M_SMART} seed={i + 3} shadow={0} />
            </g>
          </g>
        ))}
      </svg>
      <CloseUps turn={turn} t={t} />
    </div>
  )
}

function CloseUps({ turn, t }: { turn: number; t: number }) {
  const refs = useRef<(CharacterHandle | null)[]>([])
  useEffect(() => {
    faces.forEach(([, f], i) => {
      refs.current[i]?.apply({ ...restPose(W), ...f, turn, x: 0, y: 0 }, t)
    })
  }, [turn, t])
  return (
    <svg viewBox="0 0 1400 330" style={{ width: '100%', display: 'block', background: '#e4d3ba' }}>
      {faces.map(([name], i) => (
        <g key={name} transform={`translate(${70 + i * 195} 0)`}>
          <g transform="translate(60 1490) scale(4.4)">
            <Character ref={(h) => void (refs.current[i] = h)} body={W} look={VITA_LOOK} outfit={W_TEACHER} seed={i + 7} shadow={0} />
          </g>
        </g>
      ))}
    </svg>
  )
}
