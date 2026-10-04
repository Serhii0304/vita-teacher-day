import { useCallback, useMemo, useRef } from 'react'
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
import { CamLayer, SceneRoot, WorldSvg, sceneWindow, screenKey, type CamLayerHandle, type ViewBox } from '../stage/layers'
import { setOpacity, setSvgAttribute as attr } from '../stage/svgAttributes'
import type { FrameCtx, Layout, RegisterScene, Screen } from '../stage/types'
import { useTimeline } from '../stage/useTimeline'
import type { Timeline } from '../story/timeline'

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
    fhx: 16,
    fhy: 88,
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
    fhx: 18,
    fhy: 95,
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
  W.to(v3 + 1.4, v3 + 2.0, { fHand: HAND.relaxed, fhx: 16, fhy: 88, fA: 0, fw: 0, lean: -4 })
  // «невдача» — у нього складний день: стримано, погляд униз; вона слухає, підтримує
  M.to(v3 + 1.8, v3 + 2.5, { ...FACE.concern, head: 9, lookY: 0.6, lean: 6, fhx: 22, fhy: 82 })
  W.to(v3 + 2.0, v3 + 2.6, { ...FACE.listen, browIn: 0.45, smile: 0.25, head: 4 })
  W.to(e('v2-3') - 0.3, e('v2-3') + 0.3, { ...FACE.warm, fHand: HAND.open, fhx: 34, fhy: 26, fw: -120, fA: 1 })
  M.to(e('v2-3') + 0.1, e('v2-3') + 0.9, { ...FACE.relief, eye: 1, head: 1, lookY: 0, lean: -3 })
  W.to(e('v2-3') + 0.6, s('v2-4') - 0.1, { fHand: HAND.relaxed, fhx: 16, fhy: 88, fA: 0, fw: 0 })
  // взаємність: тепер їй непросто, він підтримує
  const v4 = s('v2-4')
  W.to(v4 + 0.1, v4 + 0.7, { ...FACE.concern, head: 7, lookY: 0.5, fhx: 22, fhy: 56 })
  M.to(v4 + 0.4, v4 + 1.0, { ...FACE.listen, browIn: 0.4, smile: 0.3, head: 3 })
  M.to(v4 + 1.9, v4 + 2.5, { ...FACE.warm, fHand: HAND.open, fhx: 36, fhy: 24, fw: -120, fA: 1 })
  W.to(v4 + 2.2, v4 + 3.0, { ...FACE.relief, eye: 1, head: 0, lookY: 0 })
  W.to(v4 + 3.0, e('v2-4') + 0.4, { ...FACE.beam, fhx: 16, fhy: 88 })
  M.to(e('v2-4') - 0.6, e('v2-4') + 0.2, { fHand: HAND.relaxed, fhx: 18, fhy: 95, fA: 0, fw: 0, ...FACE.beam })
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
  W.to(v7 + 0.2, v7 + 1.2, { fHand: HAND.rest, fhx: 14, fhy: 36, fw: -160, fA: 1, ...FACE.warm, blush: 0.3 })
  M.to(v7 + 0.6, v7 + 1.6, { ...FACE.warm, blush: 0.2, head: 3 })
  // «І звичайний вечір повниться теплом» — тиша, спокійні усмішки
  const v8 = s('v2-8')
  W.to(v8, v8 + 1.4, { ...FACE.relief, eye: 0.7, smile: 0.7, lean: -8, fhx: 16, fhy: 88, fHand: HAND.relaxed, fA: 0, fw: 0 })
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

/** Видима (розкрита) частина панелі: панелі розкриваються від лінії світла. */
function reveal(R: PanelRect, side: 0 | 1, open: number, scr: Screen): PanelRect {
  if (scr.layout === 'wide') {
    const w = R.w * open
    return { x: side === 0 ? R.x + R.w - w : R.x, y: 0, w, h: scr.h }
  }
  const h = R.h * open
  return { x: 0, y: side === 0 ? R.y + R.h - h : R.y, w: scr.w, h }
}

/** Запис inline-стилю лише за зміни (кеш, бо браузер нормалізує значення на кшталт «12.0px»). */
const styleCache = new WeakMap<HTMLElement, Record<string, string>>()
function setStyle(el: HTMLElement | null, prop: 'left' | 'top' | 'width' | 'height' | 'transform', v: string) {
  if (!el) return
  let c = styleCache.get(el)
  if (!c) {
    c = {}
    styleCache.set(el, c)
  }
  if (c[prop] === v) return
  c[prop] = v
  el.style[prop] = v
}
function setBox(el: HTMLElement | null, x: number, y: number, w: number, h: number) {
  setStyle(el, 'left', `${x.toFixed(1)}px`)
  setStyle(el, 'top', `${y.toFixed(1)}px`)
  setStyle(el, 'width', `${Math.max(0, w).toFixed(1)}px`)
  setStyle(el, 'height', `${Math.max(0, h).toFixed(1)}px`)
}

let planSerial = 0

export function PhoneScene({ layout, register }: { layout: Layout; register: RegisterScene }) {
  const tl = useTimeline()
  const p = useMemo(() => plan(tl, layout), [tl, layout])
  const planId = useMemo(() => ++planSerial, [p])
  const woman = useRef<CharacterHandle>(null)
  const man = useRef<CharacterHandle>(null)
  const herRoom = useRef<HerRoomHandle>(null)
  const hisRoom = useRef<HisRoomHandle>(null)
  const camA = useRef<CamLayerHandle>(null)
  const camB = useRef<CamLayerHandle>(null)
  const panelA = useRef<HTMLDivElement>(null)
  const panelB = useRef<HTMLDivElement>(null)
  const innerA = useRef<HTMLDivElement>(null)
  const innerB = useRef<HTMLDivElement>(null)
  const kinA = useRef<HTMLDivElement>(null)
  const kinB = useRef<HTMLDivElement>(null)
  const divider = useRef<HTMLDivElement>(null)
  const dividerGlow = useRef<HTMLDivElement>(null)
  const overlay = useRef<SVGSVGElement>(null)
  const thread = useRef<SVGPathElement>(null)
  const threadGlow = useRef<SVGPathElement>(null)
  const dots = useRef<(SVGCircleElement | null)[]>([])
  const mirrorB = layout === 'tall'

  // камери панелей; дзеркало правої панелі (вузький екран) робить CSS, тому кадр тут звичайний
  const viewA = useCallback((t: number, sub: Screen): ViewBox => cameraViewBox(p.camW.at(t), sub), [p])
  const viewB = useCallback((t: number, sub: Screen): ViewBox => cameraViewBox(p.camM.at(t), sub), [p])

  const update = useCallback(
    (ctx: FrameCtx) => {
      const t = ctx.t
      const scr = ctx.screen
      const wide = scr.layout === 'wide'
      attr(overlay.current, 'viewBox', `0 0 ${scr.w} ${scr.h}`)
      const gap = p.gap(t)
      const [A, B] = panels(scr, gap)
      const open = p.open(ctx.tReal)
      // панелі розкриваються від лінії світла: змінюється лише обрізання, растр кімнат не чіпаємо
      const cA = reveal(A, 0, open, scr)
      const cB = reveal(B, 1, open, scr)
      setBox(panelA.current, cA.x, cA.y, cA.w, cA.h)
      setBox(innerA.current, A.x - cA.x, A.y - cA.y, A.w, A.h)
      setBox(panelB.current, cB.x, cB.y, cB.w, cB.h)
      setBox(innerB.current, B.x - cB.x, B.y - cB.y, B.w, B.h)

      const subA: Screen = { ...scr, w: A.w, h: A.h, reservedBottom: wide ? scr.reservedBottom : 0, reservedTop: scr.reservedTop }
      const subB: Screen = { ...scr, w: B.w, h: B.h, reservedBottom: scr.reservedBottom, reservedTop: wide ? scr.reservedTop : 0 }
      // межі растру панелей залежать від розміру екрана, а не від ширини щілини між панелями
      const [from, to] = sceneWindow(ctx.tl, 'phone')
      const key = `${screenKey(scr)}|${planId}`
      camA.current?.frame(t, subA, key, viewA, from, to)
      camB.current?.frame(t, subB, key, viewB, from, to)
      const vbA = viewA(t, subA)
      const vbB = viewB(t, subB)

      const kin = p.kin(t)
      herRoom.current?.update({ lamp: 1, night: p.night(t), clock: p.clock(t), cup: true, notebooks: true, cards: 0.3 + kin * 0.5, vase: true, bloom: 1 })
      hisRoom.current?.update({ lamp: 1, night: p.night(t), clock: p.clock(t), cup: true, cloud: p.cloud(t) })
      const wp = p.W.pose(t)
      const mp = p.M.pose(t)
      woman.current?.apply(wp, t)
      man.current?.apply(mp, t)
      setOpacity(kinA.current, kin * 0.22)
      setOpacity(kinB.current, kin * 0.22)

      // лінія-межа і її сяйво — окремі шари: змінюються прозорість і трансформація
      const glow = 0.55 + 0.45 * kin + 0.15 * Math.sin(t * 1.3)
      if (wide) setBox(divider.current, A.w, 0, gap, scr.h)
      else setBox(divider.current, 0, A.h, scr.w, gap)
      setOpacity(divider.current, Math.min(1, glow).toFixed(2))
      const RX = wide ? 110 : scr.w * 0.6
      const RY = wide ? scr.h * 0.5 : 70
      const cx = wide ? A.w + gap / 2 : scr.w / 2
      const cy = wide ? scr.h * 0.42 : A.h + gap / 2
      const rx = wide ? 60 + kin * 50 : RX
      const ry = wide ? RY : 40 + kin * 30
      setStyle(dividerGlow.current, 'width', `${(RX * 2).toFixed(1)}px`)
      setStyle(dividerGlow.current, 'height', `${(RY * 2).toFixed(1)}px`)
      setStyle(dividerGlow.current, 'transform', `translate3d(${(cx - RX).toFixed(1)}px, ${(cy - RY).toFixed(1)}px, 0) scale(${(rx / RX).toFixed(3)}, ${(ry / RY).toFixed(3)})`)
      setOpacity(dividerGlow.current, (0.35 + kin * 0.45).toFixed(2))

      // нитка світла між телефонами (екранні координати)
      const wa = phonePoint(wp, WOMAN)
      const wb = phonePoint(mp, MAN)
      const a: [number, number] = [A.x + ((wa[0] - vbA[0]) / vbA[2]) * A.w, A.y + ((wa[1] - vbA[1]) / vbA[3]) * A.h]
      const bx = ((wb[0] - vbB[0]) / vbB[2]) * B.w
      const b: [number, number] = [B.x + (mirrorB ? B.w - bx : bx), B.y + ((wb[1] - vbB[1]) / vbB[3]) * B.h]
      const lift = wide ? Math.min(scr.h * 0.3, 240) : 0
      const side = wide ? 0 : -Math.min(scr.w * 0.35, 150)
      const c1: [number, number] = [a[0] + side, a[1] - lift]
      const c2: [number, number] = [b[0] + side, b[1] - lift]
      const d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)}C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`
      const thr = open * (0.55 + 0.45 * kin)
      attr(thread.current, 'd', d)
      attr(threadGlow.current, 'd', d)
      setOpacity(thread.current, thr * 0.85)
      setOpacity(threadGlow.current, thr * 0.35)
      // іскорки біжать від того, хто говорить, до того, хто слухає
      const dir = p.speaker(ctx.tReal)
      dots.current.forEach((el, i) => {
        if (!el) return
        const n = dots.current.length
        const base = (i / n + t * 0.16) % 1
        const u = dir >= 0 ? base : 1 - base
        const pt = bez(a, c1, c2, b, u)
        attr(el, 'cx', pt[0].toFixed(1))
        attr(el, 'cy', pt[1].toFixed(1))
        const fade = Math.sin(base * Math.PI)
        setOpacity(el, (thr * fade * (dir === 0 ? 0.35 : 0.9)).toFixed(2))
      })
    },
    [p, planId, viewA, viewB, mirrorB],
  )

  return (
    <SceneRoot id="phone" label="Розмова телефоном: дві кімнати, тепла лінія світла" register={register} update={update}>
      <div className="phone__bg" />
      <div ref={panelA} className="phone__panel">
        <div ref={innerA} className="phone__inner">
          <CamLayer ref={camA}>
            <HerRoom id="ph" ref={herRoom} />
            <WorldSvg layer>
              <Character ref={woman} body={WOMAN} look={VITA_LOOK} outfit={W_HOME} seed={5} shadow={0.22} />
            </WorldSvg>
            <WorldSvg>
              <ArmchairFront x={HER.chairX} y={HER.chairY} s={HER.chairS} />
            </WorldSvg>
          </CamLayer>
          <div ref={kinA} className="phone__kin" />
        </div>
      </div>
      <div ref={panelB} className="phone__panel">
        <div ref={innerB} className="phone__inner">
          <div className={`phone__view${mirrorB ? ' phone__view--mirror' : ''}`}>
            <CamLayer ref={camB}>
              <HisRoom ref={hisRoom} />
              <WorldSvg layer>
                <Character ref={man} body={MAN} look={SERHII_LOOK} outfit={M_HOME} seed={6} shadow={0.22} />
              </WorldSvg>
              <WorldSvg>
                <ArmchairFront x={HIS.chairX} y={HIS.chairY} s={HIS.chairS} flip={-1} c="#7a4a32" d="#5e3524" l="#94603f" />
              </WorldSvg>
            </CamLayer>
          </div>
          <div ref={kinB} className="phone__kin" />
        </div>
      </div>
      <div ref={dividerGlow} className="phone__glow" />
      <div ref={divider} className="phone__divider" />
      <svg ref={overlay} className="phone__overlay" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="ph-thread" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffe6b0" />
            <stop offset="0.5" stopColor="#fff4da" />
            <stop offset="1" stopColor="#ffe6b0" />
          </linearGradient>
        </defs>
        <path ref={threadGlow} d="" fill="none" stroke="#ffd98f" strokeWidth={10} strokeLinecap="round" />
        <path ref={thread} d="" fill="none" stroke="url(#ph-thread)" strokeWidth={2.4} strokeLinecap="round" />
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} ref={(n) => void (dots.current[i] = n)} r={3.2} fill="#fff4d6" />
        ))}
      </svg>
    </SceneRoot>
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
