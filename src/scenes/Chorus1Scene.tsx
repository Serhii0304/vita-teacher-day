import { useMemo, useRef } from 'react'
import { AutumnTree, LeafField, Motes, type LeafFieldHandle, type MotesHandle } from '../art/common'
import { Fence, FlowerBush, KalynaBush, SchoolFacade } from '../art/outdoor'
import { MAN, WOMAN } from '../characters/body'
import { Character, type CharacterHandle } from '../characters/Character'
import { M_SMART, SERHII_LOOK, VITA_LOOK, W_TEACHER } from '../characters/palettes'
import { FACE, HAND, PROP } from '../characters/pose'
import { gripWorld, targetForGrip } from '../characters/rigMath'
import { clamp, ease, smoothstep, windowEnv } from '../engine/math'
import { Actor } from '../stage/actor'
import { CamTrack, cameraViewBox, rc, setViewBox } from '../stage/camera'
import type { Layout, RegisterScene } from '../stage/types'
import { useTimeline } from '../stage/useTimeline'
import type { Timeline } from '../story/timeline'
import { SceneSvg } from './SceneSvg'
import { pick } from './shared'

/**
 * ПРИСПІВ 1 — святковий епізод у золотому світлі біля школи (символічна сцена).
 * «З Днем Вчителя, Віта, я тебе вітаю!» — він підходить із невеликим букетом і простягає його.
 * «Миру, радості й здоров’я щиро побажаю» — вона приймає букет, вдихає аромат, тепло усміхається.
 * «Хай тобі вертається все віддане тепло» — світло яскравішає, квіти розкриваються, піднімаються теплі іскорки.
 * «Щоб і в серці, і у домі сонячно було» — святковий напис; вони поруч, усміхаються (без обіймів).
 */
function plan(tl: Timeline, layout: Layout) {
  const s = tl.s
  const e = tl.e
  const c1 = s('c1-1')
  const c2 = s('c1-2')
  const c3 = s('c1-3')
  const c4 = s('c1-4')
  const wx = pick(layout, -130, -95)
  const mStop = pick(layout, 95, 75)
  const W = new Actor(WOMAN, { x: wx, y: 30, flip: 1, turn: 0.55, ...FACE.calm, lookX: 0.4, nhx: 12, nhy: 98, fhx: 8, fhy: 100 })
  const M = new Actor(MAN, {
    x: 700,
    y: 34,
    flip: -1,
    turn: 0.7,
    ...FACE.warm,
    lookX: 0.4,
    propN: PROP.bouquet,
    nHand: HAND.hold,
    nhx: 34,
    nhy: 56,
    nw: -90,
    nA: 1,
    nSw: 0,
    bloom: 0.55,
  })
  // він підходить
  const arrive = M.walkAuto(c1 - 0.9, 700, mStop, 'n', 1, 0.5)
  // вона помічає, тепло дивується
  W.to(c1 - 0.2, c1 + 0.7, { ...FACE.surprise, turn: 0.75, lookX: 0.6, head: -2 })
  W.to(c1 + 1.1, c1 + 1.9, { ...FACE.warm, head: 2, nhx: 18, nhy: 84, fhx: 16, fhy: 86, nHand: HAND.relaxed })
  // простягає букет, легкий уклін
  M.to(arrive + 0.1, arrive + 1.1, { nhx: 70, nhy: 22, lean: 6, head: 6, ...FACE.beam, lookY: 0.2 }, ease.inOutCubic)
  M.to(arrive + 1.3, e('c1-1') + 0.3, { head: 2, lean: 3, open: 0.12 })
  // передача з рук у руки (точка хвату — спільна)
  const step = c2 - 0.5
  const wx2 = wx + 34
  W.walk(step, step + 0.95, wx, wx2, 'n')
  const hand = c2 + 1.0
  const mAt = { ...M.track.base, x: mStop, flip: -1, sc: 1, nhx: 70, nhy: 22, lean: 3, nw: -90 }
  const G = gripWorld(mAt, MAN, 'n')
  const wAt = { ...W.track.base, x: wx2, flip: 1, sc: 1, lean: 3, nw: -90 }
  const T = targetForGrip(wAt, WOMAN, 'n', G[0], G[1], -90)
  W.to(hand - 0.9, hand, { nHand: HAND.hold, nhx: T.hx, nhy: T.hy, nw: -90, nA: 1, lean: 3, lookY: 0.4, lookX: 0.5, head: 5 }, ease.inOutCubic)
  W.set(hand, { propN: PROP.bouquet, bloom: 0.55 })
  M.set(hand, { propN: 0, nHand: HAND.open })
  M.to(hand + 0.2, hand + 1.0, { nhx: 10, nhy: 96, nA: 0, nw: 0, nHand: HAND.relaxed, lean: 0, head: 0, ...FACE.warm, lookY: 0 }, ease.inOutCubic)
  // притискає букет, вдихає аромат, дивиться на нього
  W.to(hand + 0.15, hand + 1.05, { nhx: 26, nhy: 48, lean: 0, fFront: 1, fHand: HAND.hold, fhx: 20, fhy: 60, fw: -80, fA: 1, lookY: 0.7, head: 9, ...FACE.warm }, ease.inOutCubic)
  W.to(hand + 1.3, hand + 2.0, { ...FACE.peace, head: 12, nhx: 24, nhy: 36 })
  W.to(hand + 2.4, e('c1-2'), { ...FACE.beam, eye: 1, head: -2, lookY: -0.1, lookX: 0.6, nhy: 46, blush: 0.25 })
  M.to(hand + 2.6, e('c1-2') + 0.2, { nod: 0.3, ...FACE.beam })
  // тепло повертається: квіти розкриваються
  W.to(c3 - 0.2, c3 + 2.6, { bloom: 1 }, ease.outCubic)
  M.to(c3, c3 + 0.6, { nod: 0 })
  W.to(c3 + 0.4, c3 + 1.4, { lookX: 0.4, lookY: 0.2, smile: 0.9 })
  // святковий фінал приспіву: обидва трохи повертаються до глядача, усміхаються
  W.to(c4 - 0.2, c4 + 1.2, { turn: 0.4, lookX: 0.1, head: -2, smile: 0.95 })
  M.to(c4 - 0.2, c4 + 1.2, { turn: 0.45, lookX: -0.1, smile: 0.85, head: -1 })
  W.to(c4 + 2.2, e('c1-4'), { turn: 0.7, lookX: 0.6, head: 2 })
  M.to(c4 + 2.4, e('c1-4'), { turn: 0.72, lookX: 0.5 })

  const cx = (wx + mStop) / 2
  const cam = new CamTrack(pick(layout, rc(160, -330, 1180, 760), rc(140, -330, 700, 1020)))
  cam.to(arrive - 0.6, arrive + 0.8, pick(layout, rc(cx, -292, 760, 530), rc(cx, -290, 470, 690)), ease.inOutCubic)
  cam.to(c2 - 0.4, hand + 0.4, pick(layout, rc(cx - 10, -278, 600, 420), rc(cx - 10, -276, 400, 590)), ease.inOutCubic)
  cam.to(c3 - 0.2, c3 + 2.4, pick(layout, rc(cx, -310, 760, 560), rc(cx, -308, 470, 700)), ease.inOutSine)
  cam.to(c4 - 0.4, e('c1-4') + 1.0, pick(layout, rc(cx, -360, 1120, 800), rc(cx, -340, 640, 960)), ease.inOutSine)

  return {
    W,
    M,
    cam,
    // світло яскравішає на «вертається тепло»
    light: (t: number) => 0.45 + 0.55 * smoothstep(c3 - 0.4, c3 + 2.4, t),
    sparks: (t: number) => windowEnv(t, c3 + 0.3, e('c1-4') + 1.4, 1.2, 1.2),
    flash: (t: number) => 1 - smoothstep(c1 - 0.75, c1 + 0.8, t),
    line: (t: number) => smoothstep(e('c1-4') + 0.2, e('c1-4') + 1.4, t),
  }
}

export function Chorus1Scene({ layout, register }: { layout: Layout; register: RegisterScene }) {
  const tl = useTimeline()
  const p = useMemo(() => plan(tl, layout), [tl, layout])
  const woman = useRef<CharacterHandle>(null)
  const man = useRef<CharacterHandle>(null)
  const leaves = useRef<LeafFieldHandle>(null)
  const leavesFront = useRef<LeafFieldHandle>(null)
  const sparks = useRef<MotesHandle>(null)
  const sparksG = useRef<SVGGElement>(null)
  const sunG = useRef<SVGGElement>(null)
  const wrap = useRef<SVGGElement>(null)
  const raysR = useRef<SVGGElement>(null)
  const flash = useRef<SVGRectElement>(null)
  const line = useRef<SVGGElement>(null)

  return (
    <SceneSvg
      id="chorus1"
      label="Приспів: він дарує їй букет у золотому світлі"
      register={register}
      update={(ctx, svg) => {
        const t = ctx.t
        const wp = p.W.pose(t)
        woman.current?.apply(wp, t)
        man.current?.apply(p.M.pose(t), t)
        leaves.current?.update(t, 1, 0.4)
        leavesFront.current?.update(t * 0.8, 1, 0.5)
        const L = p.light(t)
        if (sunG.current) sunG.current.style.opacity = L.toFixed(3)
        if (wrap.current) wrap.current.style.opacity = (0.15 + 0.6 * (L - 0.45) / 0.55).toFixed(3)
        if (raysR.current) raysR.current.setAttribute('transform', `translate(-820 -760) rotate(${(t * 1.1).toFixed(2)})`)
        const sp = p.sparks(t)
        if (sparksG.current) {
          sparksG.current.style.opacity = sp.toFixed(3)
          sparksG.current.setAttribute('transform', `translate(${(wp.x + 40).toFixed(1)} ${(wp.y - 320).toFixed(1)})`)
        }
        sparks.current?.update(t * 1.3, sp)
        if (flash.current) flash.current.style.opacity = clamp(p.flash(t)).toFixed(3)
        if (line.current) line.current.style.opacity = p.line(t).toFixed(3)
        setViewBox(svg, cameraViewBox(p.cam.at(t), ctx.screen))
      }}
    >
      <defs>
        <linearGradient id="c1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3c98a" />
          <stop offset="0.55" stopColor="#f6dcaa" />
          <stop offset="1" stopColor="#f3c58f" />
        </linearGradient>
        <radialGradient id="c1-rayR" cx="0" cy="0" r="2400" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff3d2" stopOpacity="0.3" />
          <stop offset="0.6" stopColor="#fff3d2" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff3d2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="c1-wrap">
          <stop offset="0" stopColor="#ffe0a6" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#ffd08a" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffd08a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="c1-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="1" />
          <stop offset="0.25" stopColor="#ffe3a3" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="c1-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9c3a0" />
          <stop offset="1" stopColor="#b99a74" />
        </linearGradient>
        <linearGradient id="c1-ray" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3cf" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff3cf" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="c1-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd98f" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff4d6" stopOpacity="1" />
          <stop offset="1" stopColor="#ffd98f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={-3000} y={-2600} width={6000} height={2600} fill="url(#c1-sky)" />
      {/* далекі дерева в серпанку */}
      <g opacity={0.55}>
        <AutumnTree x={-1300} y={-60} s={1.4} seed={11} palette={['#e8c27e', '#e2b06a', '#f0d39a']} trunk="#a88a6a" />
        <AutumnTree x={1250} y={-60} s={1.5} seed={12} palette={['#e8c27e', '#e2b06a', '#f0d39a']} trunk="#a88a6a" />
      </g>
      <SchoolFacade x={-760} y={-720} w={1240} h={660} />
      <Fence x0={-1800} x1={1800} y={-40} h={64} />
      <rect x={-3000} y={-46} width={6000} height={2400} fill="url(#c1-ground)" />
      <g stroke="#b39770" strokeWidth={2} opacity={0.4}>
        {[-20, 20, 70, 140, 240].map((yy) => (
          <line key={yy} x1={-3000} x2={3000} y1={yy} y2={yy} />
        ))}
      </g>
      {/* дерева, що обрамлюють */}
      <AutumnTree x={-1020} y={-30} s={2.1} seed={5} />
      <AutumnTree x={880} y={-30} s={2.2} seed={6} palette={['#e8a63c', '#d9822b', '#efc35e', '#c86a2e']} />
      <FlowerBush x={-560} y={-10} s={1.1} seed={2} palette={0} />
      <FlowerBush x={-420} y={-6} s={0.9} seed={3} palette={2} />
      <FlowerBush x={420} y={-8} s={1.05} seed={4} palette={1} />
      <KalynaBush x={590} y={-20} s={1.1} />
      <FlowerBush x={330} y={-2} s={0.8} seed={8} palette={3} />
      {/* сонце і промені */}
      <g ref={sunG}>
        <circle cx={-820} cy={-760} r={900} fill="url(#c1-sun)" />
        <path d="M-900 -900 L-760 -940 L300 120 L-120 120 Z" fill="url(#c1-ray)" opacity={0.6} />
        <path d="M-700 -980 L-600 -990 L700 80 L420 100 Z" fill="url(#c1-ray)" opacity={0.45} />
        <g ref={raysR}>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2
            const b = a + 0.06
            const d = `M0 0 L${(Math.cos(a) * 2400).toFixed(0)} ${(Math.sin(a) * 2400).toFixed(0)} L${(Math.cos(b) * 2400).toFixed(0)} ${(Math.sin(b) * 2400).toFixed(0)} Z`
            return <path key={i} d={d} fill="url(#c1-rayR)" />
          })}
        </g>
      </g>
      <LeafField ref={leaves} count={22} area={{ x: -900, y: -900, w: 1800, h: 960 }} seed={13} scale={1.6} speed={0.75} />
      <Character ref={woman} body={WOMAN} look={VITA_LOOK} outfit={W_TEACHER} seed={3} shadow={0.28} />
      <Character ref={man} body={MAN} look={SERHII_LOOK} outfit={M_SMART} seed={4} shadow={0.28} />
      <g ref={sparksG} opacity={0}>
        <Motes ref={sparks} count={22} area={{ x: -150, y: -140, w: 300, h: 260 }} seed={17} color="#ffe6a8" size={3} />
      </g>
      {/* тепле світло, що огортає героїв і посилюється на «вертається тепло» */}
      <g ref={wrap} opacity={0}>
        <ellipse cx={-40} cy={-280} rx={700} ry={520} fill="url(#c1-wrap)" />
      </g>
      <LeafField ref={leavesFront} count={5} area={{ x: -900, y: -900, w: 1800, h: 1300 }} seed={31} scale={2.2} speed={0.6} colors={['#e2a640', '#e8c46a', '#d9822b']} opacity={0.9} />
      {/* тепла лінія світла — перехід до розмови телефоном */}
      <g ref={line} opacity={0}>
        <rect x={-2000} y={-2400} width={4000} height={4800} fill="#ffe7b4" opacity={0.55} />
        <rect x={-60} y={-2400} width={120} height={4800} fill="url(#c1-line)" />
      </g>
      {/* спалах тепла на вході (продовження світла лампи) */}
      <rect ref={flash} x={-4000} y={-4000} width={8000} height={8000} fill="#fff1cf" opacity={1} />
    </SceneSvg>
  )
}
