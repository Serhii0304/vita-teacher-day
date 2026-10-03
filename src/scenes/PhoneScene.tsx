import { useMemo, useRef } from 'react'
import { ArmchairFront } from '../art/furniture'
import { HER, HerRoom, type HerRoomHandle } from '../art/HerRoom'
import { HIS, HisRoom, type HisRoomHandle } from '../art/HisRoom'
import { MAN, WOMAN } from '../characters/body'
import { Character, type CharacterHandle } from '../characters/Character'
import { M_HOME, SERHII_LOOK, VITA_LOOK, W_HOME } from '../characters/palettes'
import { FACE, HAND } from '../characters/pose'
import { gripWorld, phoneAtEarTarget } from '../characters/rigMath'
import { clamp, ease, lerp, smoothstep, windowEnv } from '../engine/math'
import type { Params } from '../engine/moves'
import { Actor } from '../stage/actor'
import { CamTrack, cameraViewBox, rc } from '../stage/camera'
import type { Layout, RegisterScene, Screen } from '../stage/types'
import { useTimeline } from '../stage/useTimeline'
import type { Timeline } from '../story/timeline'
import { SceneSvg } from './SceneSvg'

/**
 * КУПЛЕТ 2 — людина, яка чує. Дві затишні кімнати, розмова телефоном.
 * Хто говорить — жестикулює, хто слухає — киває; ролі змінюються (взаємність).
 * «успіх» — радісний жест; «невдача» — коротка стримана зміна настрою, після якої стає легше.
 * «Ми говоримо — й години непомітно» — стрілки годинників біжать, за вікнами пливуть хмаринки, темніє.
 * «І звичайний вечір повниться теплом» — обидві кімнати набувають спорідненого теплого світла, межа між ними тоншає.
 */
type Who = 'w' | 'm'

function plan(tl: Timeline, layout: Layout) {
  const s = tl.s
  const e = tl.e
  const t0 = e('c1-4') + 1.0
  const pW = phoneAtEarTarget(WOMAN)
  const pM = phoneAtEarTarget(MAN)
  const wx = HER.chairX + 42
  const mx = HIS.chairX - 42
  const seatW = { px: -40, py: 59 }
  const seatM = { px: -40, py: 67 }
  const W = new Actor(WOMAN, {
    x: wx,
    y: HER.chairY,
    flip: 1,
    ...seatW,
    lean: -6,
    nfx: 46,
    ffx: 58,
    turn: 0.6,
    ...FACE.warm,
    lookX: 0.5,
    propN: 0,
    nHand: HAND.phone,
    nFS: 1,
    nhx: pW.hx,
    nhy: pW.hy,
    nw: pW.w,
    nA: 1,
    fFront: 1,
    fHand: HAND.relaxed,
    fhx: 30,
    fhy: 70,
  })
  const M = new Actor(MAN, {
    x: mx,
    y: HIS.chairY,
    flip: -1,
    ...seatM,
    lean: -5,
    nfx: 52,
    ffx: 64,
    turn: 0.6,
    ...FACE.warm,
    lookX: 0.5,
    nHand: HAND.phone,
    nFS: 1,
    nhx: pM.hx,
    nhy: pM.hy,
    nw: pM.w,
    nA: 1,
    fFront: 1,
    fHand: HAND.relaxed,
    fhx: 32,
    fhy: 76,
  })
  // діалог: інтервали «хто говорить»
  const talk: [number, number, Who][] = [
    [t0 + 1.4, s('v2-1') + 2.1, 'w'],
    [s('v2-1') + 2.1, e('v2-1') + 0.6, 'm'],
    [s('v2-2'), e('v2-2'), 'w'],
    [s('v2-3'), s('v2-3') + 1.7, 'w'],
    [s('v2-3') + 1.8, e('v2-3') - 0.2, 'm'],
    [e('v2-3') - 0.2, e('v2-3') + 0.6, 'w'],
    [s('v2-4'), s('v2-4') + 1.9, 'w'],
    [s('v2-4') + 1.9, e('v2-4'), 'm'],
    [s('v2-5'), s('v2-5') + 1.8, 'w'],
    [s('v2-5') + 1.8, e('v2-5'), 'm'],
    [s('v2-6'), e('v2-6'), 'm'],
    [s('v2-7'), e('v2-7') - 0.6, 'w'],
  ]
  const speak = (A: Actor, B: Actor, a: number, b: number) => {
    A.to(a, a + 0.35, { talk: 0.6, nod: 0 })
    A.to(b - 0.3, b, { talk: 0 })
    B.to(a + 0.3, a + 0.8, { ...FACE.listen, nod: 0.3 })
    B.to(b - 0.4, b, { nod: 0 })
  }
  for (const [a, b, who] of talk) {
    if (who === 'w') speak(W, M, a, b)
    else speak(M, W, a, b)
  }
  // підняли слухавки, привіталися
  W.to(t0 + 0.6, t0 + 1.4, { ...FACE.beam, lookX: 0.6, head: -2 })
  M.to(t0 + 0.6, t0 + 1.4, { ...FACE.beam, lookX: 0.6, head: -1 })
  // «успіх» — вона радісно розповідає, жест вільною рукою
  const v3 = s('v2-3')
  W.to(v3 + 0.1, v3 + 0.7, { ...FACE.beam, brow: 0.45, fHand: HAND.open, fhx: 52, fhy: 10, fw: -150, fA: 1, lean: 2 }, ease.inOutCubic)
  M.to(v3 + 0.3, v3 + 0.9, { ...FACE.beam })
  W.to(v3 + 1.4, v3 + 2.0, { fHand: HAND.relaxed, fhx: 30, fhy: 70, fA: 0, fw: 0, lean: -4 })
  // «невдача» — у нього складний день: стримано, погляд униз; вона слухає, підтримує
  M.to(v3 + 1.8, v3 + 2.5, { ...FACE.concern, head: 9, lookY: 0.6, lean: 6, fhx: 26, fhy: 64 })
  W.to(v3 + 2.0, v3 + 2.6, { ...FACE.listen, browIn: 0.45, smile: 0.25, head: 4 })
  W.to(e('v2-3') - 0.3, e('v2-3') + 0.3, { ...FACE.warm, fHand: HAND.open, fhx: 34, fhy: 26, fw: -120, fA: 1 })
  M.to(e('v2-3') + 0.1, e('v2-3') + 0.9, { ...FACE.relief, eye: 1, head: 1, lookY: 0, lean: -3 })
  W.to(e('v2-3') + 0.6, s('v2-4') - 0.1, { fHand: HAND.relaxed, fhx: 30, fhy: 70, fA: 0, fw: 0 })
  // взаємність: тепер їй непросто, він підтримує
  const v4 = s('v2-4')
  W.to(v4 + 0.1, v4 + 0.7, { ...FACE.concern, head: 7, lookY: 0.5, fhx: 22, fhy: 56 })
  M.to(v4 + 0.4, v4 + 1.0, { ...FACE.listen, browIn: 0.4, smile: 0.3, head: 3 })
  M.to(v4 + 1.9, v4 + 2.5, { ...FACE.warm, fHand: HAND.open, fhx: 36, fhy: 24, fw: -120, fA: 1 })
  W.to(v4 + 2.2, v4 + 3.0, { ...FACE.relief, eye: 1, head: 0, lookY: 0 })
  W.to(v4 + 3.0, e('v2-4') + 0.4, { ...FACE.beam, fhx: 30, fhy: 70 })
  M.to(e('v2-4') - 0.6, e('v2-4') + 0.2, { fHand: HAND.relaxed, fhx: 32, fhy: 76, fA: 0, fw: 0, ...FACE.beam })
  // «Ми говоримо — й години непомітно» — легко, із сміхом, відкинулися в кріслах
  const v5 = s('v2-5')
  W.to(v5 - 0.2, v5 + 1.2, { lean: -10, ...FACE.beam, open: 0.2, head: -3 })
  M.to(v5 + 1.6, v5 + 2.6, { lean: -9, ...FACE.beam, open: 0.2, head: -3 })
  W.to(e('v2-5'), s('v2-6') + 0.8, { open: 0, smile: 0.75, head: 0, lookX: 0.3, lookY: -0.2 })
  // «пропливають, мов хмаринки» — обоє на мить дивляться у вікно, усміхаються
  M.to(s('v2-6') + 1.4, s('v2-6') + 2.2, { lookX: -0.5, lookY: -0.3, turn: 0.45 })
  M.to(e('v2-6') - 0.4, e('v2-6') + 0.4, { lookX: 0.5, lookY: 0, turn: 0.6 })
  // «Від простих розмов стає на серці світло» — її рука до серця
  const v7 = s('v2-7')
  W.to(v7 + 0.2, v7 + 1.2, { fHand: HAND.rest, fhx: 22, fhy: 34, fw: -160, fA: 1, ...FACE.warm, blush: 0.3 })
  M.to(v7 + 0.6, v7 + 1.6, { ...FACE.warm, blush: 0.2, head: 3 })
  // «І звичайний вечір повниться теплом» — тиша, спокійні усмішки
  const v8 = s('v2-8')
  W.to(v8, v8 + 1.4, { ...FACE.relief, eye: 0.7, smile: 0.7, lean: -8, fhx: 26, fhy: 66, fHand: HAND.relaxed, fA: 0, fw: 0 })
  M.to(v8 + 0.2, v8 + 1.6, { ...FACE.relief, eye: 0.7, smile: 0.7, lean: -8 })

  const camW = new CamTrack(layout === 'wide' ? rc(70, -270, 700, 520) : rc(120, -232, 420, 330))
  const camM = new CamTrack(layout === 'wide' ? rc(-70, -280, 700, 520) : rc(-120, -240, 420, 330))
  if (layout === 'wide') {
    camW.to(s('v2-1'), e('v2-2'), rc(110, -250, 560, 420))
    camM.to(s('v2-1'), e('v2-2'), rc(-110, -262, 560, 420))
    camW.to(s('v2-5') - 0.5, s('v2-6'), rc(40, -300, 760, 580))
    camM.to(s('v2-5') - 0.5, s('v2-6'), rc(-20, -310, 760, 580))
    camW.to(v8 - 0.5, v8 + 2.5, rc(150, -250, 560, 420))
    camM.to(v8 - 0.5, v8 + 2.5, rc(-150, -262, 560, 420))
  } else {
    camW.to(s('v2-5') - 0.5, s('v2-6'), rc(80, -250, 480, 380))
    camM.to(s('v2-5') - 0.5, s('v2-6'), rc(-80, -258, 480, 380))
    camW.to(v8 - 0.5, v8 + 2.5, rc(130, -232, 400, 320))
    camM.to(v8 - 0.5, v8 + 2.5, rc(-130, -240, 400, 320))
  }

  const speaker = (t: number): number => {
    for (const [a, b, who] of talk) if (t >= a && t <= b) return who === 'w' ? 1 : -1
    return 0
  }
  return {
    W,
    M,
    camW,
    camM,
    t0,
    open: (t: number) => ease.inOutCubic(clamp((t - t0) / 1.6)),
    clock: (t: number) => 160 * ease.inOutSine(clamp((t - s('v2-5') + 0.4) / (e('v2-8') - s('v2-5')))),
    night: (t: number) => 0.3 + 0.7 * smoothstep(s('v2-6') - 0.5, e('v2-7'), t),
    cloud: (t: number) => clamp((t - s('v2-5')) / (e('v2-7') - s('v2-5'))),
    kin: (t: number) => smoothstep(v8 - 0.3, v8 + 2.6, t),
    heart: (t: number) => windowEnv(t, v7, e('v2-8') + 2, 1.2, 1),
    speaker,
    gap: (t: number) => lerp(14, 4, smoothstep(v8, v8 + 3, t)),
  }
}

interface PanelRect {
  x: number
  y: number
  w: number
  h: number
}

function panels(scr: Screen, gap: number): [PanelRect, PanelRect] {
  if (scr.layout === 'wide') {
    const w = (scr.w - gap) / 2
    return [
      { x: 0, y: 0, w, h: scr.h },
      { x: w + gap, y: 0, w, h: scr.h },
    ]
  }
  const usable = scr.h - scr.reservedBottom
  const ha = Math.round(usable * 0.5 - gap / 2)
  return [
    { x: 0, y: 0, w: scr.w, h: ha },
    { x: 0, y: ha + gap, w: scr.w, h: scr.h - ha - gap },
  ]
}

export function PhoneScene({ layout, register }: { layout: Layout; register: RegisterScene }) {
  const tl = useTimeline()
  const p = useMemo(() => plan(tl, layout), [tl, layout])
  const woman = useRef<CharacterHandle>(null)
  const man = useRef<CharacterHandle>(null)
  const herRoom = useRef<HerRoomHandle>(null)
  const hisRoom = useRef<HisRoomHandle>(null)
  const panelA = useRef<SVGSVGElement>(null)
  const panelB = useRef<SVGSVGElement>(null)
  const clipA = useRef<SVGRectElement>(null)
  const clipB = useRef<SVGRectElement>(null)
  const divider = useRef<SVGRectElement>(null)
  const dividerGlow = useRef<SVGEllipseElement>(null)
  const thread = useRef<SVGPathElement>(null)
  const threadGlow = useRef<SVGPathElement>(null)
  const dots = useRef<(SVGCircleElement | null)[]>([])
  const kinA = useRef<SVGRectElement>(null)
  const kinB = useRef<SVGRectElement>(null)
  const mirrorB = layout === 'tall'

  return (
    <SceneSvg
      id="phone"
      label="Розмова телефоном: дві кімнати, тепла лінія світла"
      register={register}
      update={(ctx, svg) => {
        const t = ctx.t
        const scr = ctx.screen
        svg.setAttribute('viewBox', `0 0 ${scr.w} ${scr.h}`)
        const gap = p.gap(t)
        const [A, B] = panels(scr, gap)
        const open = p.open(ctx.tReal)
        // панелі розкриваються від лінії світла
        for (const [el, clip, R, side] of [
          [panelA.current, clipA.current, A, 0],
          [panelB.current, clipB.current, B, 1],
        ] as const) {
          if (!el || !clip) continue
          el.setAttribute('x', String(R.x))
          el.setAttribute('y', String(R.y))
          el.setAttribute('width', String(R.w))
          el.setAttribute('height', String(R.h))
          if (scr.layout === 'wide') {
            const w = R.w * open
            clip.setAttribute('x', String(side === 0 ? R.x + R.w - w : R.x))
            clip.setAttribute('y', '0')
            clip.setAttribute('width', String(w))
            clip.setAttribute('height', String(scr.h))
          } else {
            const h = R.h * open
            clip.setAttribute('x', '0')
            clip.setAttribute('y', String(side === 0 ? R.y + R.h - h : R.y))
            clip.setAttribute('width', String(scr.w))
            clip.setAttribute('height', String(h))
          }
        }
        const subA: Screen = { ...scr, w: A.w, h: A.h, reservedBottom: scr.layout === 'wide' ? scr.reservedBottom : 0, reservedTop: scr.reservedTop }
        const subB: Screen = { ...scr, w: B.w, h: B.h, reservedBottom: scr.reservedBottom, reservedTop: scr.layout === 'wide' ? scr.reservedTop : 0 }
        const fa = p.camW.at(t)
        let fb = p.camM.at(t)
        if (mirrorB) fb = { ...fb, x: -fb.x - fb.w }
        const vbA = cameraViewBox(fa, subA)
        const vbB = cameraViewBox(fb, subB)
        panelA.current?.setAttribute('viewBox', vbA.map((v) => v.toFixed(1)).join(' '))
        panelB.current?.setAttribute('viewBox', vbB.map((v) => v.toFixed(1)).join(' '))

        const kin = p.kin(t)
        herRoom.current?.update({ lamp: 1, night: p.night(t), clock: p.clock(t), cup: true, notebooks: true, cards: 0.3 + kin * 0.5, vase: true, bloom: 1 })
        hisRoom.current?.update({ lamp: 1, night: p.night(t), clock: p.clock(t), cup: true, cloud: p.cloud(t) })
        const wp = p.W.pose(t)
        const mp = p.M.pose(t)
        woman.current?.apply(wp, t)
        man.current?.apply(mp, t)
        if (kinA.current) kinA.current.style.opacity = (kin * 0.22).toFixed(3)
        if (kinB.current) kinB.current.style.opacity = (kin * 0.22).toFixed(3)

        // лінія-межа
        const glow = 0.55 + 0.45 * kin + 0.15 * Math.sin(t * 1.3)
        if (divider.current) {
          if (scr.layout === 'wide') {
            divider.current.setAttribute('x', String(A.w))
            divider.current.setAttribute('y', '0')
            divider.current.setAttribute('width', String(gap))
            divider.current.setAttribute('height', String(scr.h))
          } else {
            divider.current.setAttribute('x', '0')
            divider.current.setAttribute('y', String(A.h))
            divider.current.setAttribute('width', String(scr.w))
            divider.current.setAttribute('height', String(gap))
          }
          divider.current.style.opacity = glow.toFixed(3)
        }
        if (dividerGlow.current) {
          const cx = scr.layout === 'wide' ? A.w + gap / 2 : scr.w / 2
          const cy = scr.layout === 'wide' ? scr.h * 0.42 : A.h + gap / 2
          dividerGlow.current.setAttribute('cx', cx.toFixed(1))
          dividerGlow.current.setAttribute('cy', cy.toFixed(1))
          dividerGlow.current.setAttribute('rx', (scr.layout === 'wide' ? 60 + kin * 50 : scr.w * 0.6).toFixed(1))
          dividerGlow.current.setAttribute('ry', (scr.layout === 'wide' ? scr.h * 0.5 : 40 + kin * 30).toFixed(1))
          dividerGlow.current.style.opacity = (0.35 + kin * 0.45).toFixed(3)
        }

        // нитка світла між телефонами (екранні координати)
        const toScreen = (R: PanelRect, vb: number[], wpt: [number, number], mirror = false): [number, number] => {
          const x = mirror ? -wpt[0] : wpt[0]
          return [R.x + ((x - vb[0]) / vb[2]) * R.w, R.y + ((wpt[1] - vb[1]) / vb[3]) * R.h]
        }
        const a = toScreen(A, vbA, phonePoint(wp, WOMAN))
        const b = toScreen(B, vbB, phonePoint(mp, MAN), mirrorB)
        const lift = scr.layout === 'wide' ? Math.min(scr.h * 0.3, 240) : 0
        const side = scr.layout === 'wide' ? 0 : -Math.min(scr.w * 0.35, 150)
        const c1: [number, number] = [a[0] + side, a[1] - lift]
        const c2: [number, number] = [b[0] + side, b[1] - lift]
        const d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)}C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`
        const thr = open * (0.55 + 0.45 * kin)
        thread.current?.setAttribute('d', d)
        threadGlow.current?.setAttribute('d', d)
        if (thread.current) thread.current.style.opacity = (thr * 0.85).toFixed(3)
        if (threadGlow.current) threadGlow.current.style.opacity = (thr * 0.35).toFixed(3)
        // іскорки біжать від того, хто говорить, до того, хто слухає
        const dir = p.speaker(ctx.tReal)
        dots.current.forEach((el, i) => {
          if (!el) return
          const n = dots.current.length
          const base = (i / n + t * 0.16) % 1
          const u = dir >= 0 ? base : 1 - base
          const pt = bez(a, c1, c2, b, u)
          el.setAttribute('cx', pt[0].toFixed(1))
          el.setAttribute('cy', pt[1].toFixed(1))
          const fade = Math.sin(base * Math.PI)
          el.style.opacity = (thr * fade * (dir === 0 ? 0.35 : 0.9)).toFixed(3)
        })
      }}
    >
      <defs>
        <clipPath id="ph-clipA">
          <rect ref={clipA} x={0} y={0} width={0} height={0} />
        </clipPath>
        <clipPath id="ph-clipB">
          <rect ref={clipB} x={0} y={0} width={0} height={0} />
        </clipPath>
        <radialGradient id="ph-glow">
          <stop offset="0" stopColor="#ffe2a4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd07a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ph-thread" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffe6b0" />
          <stop offset="0.5" stopColor="#fff4da" />
          <stop offset="1" stopColor="#ffe6b0" />
        </linearGradient>
      </defs>
      <rect x={-10} y={-10} width={10000} height={10000} fill="#2a1d18" />
      <g clipPath="url(#ph-clipA)">
        <svg ref={panelA} overflow="hidden" preserveAspectRatio="xMidYMid slice">
          <HerRoom id="ph" ref={herRoom} />
          <Character ref={woman} body={WOMAN} look={VITA_LOOK} outfit={W_HOME} seed={5} shadow={0.22} />
          <ArmchairFront x={HER.chairX} y={HER.chairY} s={HER.chairS} />
          <rect ref={kinA} x={-3000} y={-3000} width={6000} height={6000} fill="#ffb866" opacity={0} />
        </svg>
      </g>
      <g clipPath="url(#ph-clipB)">
        <svg ref={panelB} overflow="hidden" preserveAspectRatio="xMidYMid slice">
          <g transform={mirrorB ? 'scale(-1 1)' : undefined}>
            <HisRoom ref={hisRoom} />
            <Character ref={man} body={MAN} look={SERHII_LOOK} outfit={M_HOME} seed={6} shadow={0.22} />
            <ArmchairFront x={HIS.chairX} y={HIS.chairY} s={HIS.chairS} flip={-1} c="#7a4a32" d="#5e3524" l="#94603f" />
          </g>
          <rect ref={kinB} x={-3000} y={-3000} width={6000} height={6000} fill="#ffb866" opacity={0} />
        </svg>
      </g>
      <ellipse ref={dividerGlow} cx={0} cy={0} rx={0} ry={0} fill="url(#ph-glow)" />
      <rect ref={divider} x={0} y={0} width={0} height={0} fill="#ffe7b4" />
      <path ref={threadGlow} d="" fill="none" stroke="#ffd98f" strokeWidth={10} strokeLinecap="round" />
      <path ref={thread} d="" fill="none" stroke="url(#ph-thread)" strokeWidth={2.4} strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} ref={(n) => void (dots.current[i] = n)} r={3.2} fill="#fff4d6" />
      ))}
    </SceneSvg>
  )
}

/** Точка телефона (біля вуха) у світових координатах сцени. */
function phonePoint(pose: Params, body: typeof WOMAN): [number, number] {
  return gripWorld(pose, body, 'n')
}

function bez(a: number[], b: number[], c: number[], d: number[], u: number): [number, number] {
  const v = 1 - u
  return [
    v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0],
    v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1],
  ]
}

