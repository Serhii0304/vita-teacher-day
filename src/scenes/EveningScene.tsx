import { useCallback, useMemo, useRef } from 'react'
import { MoteLayer, type MoteLayerHandle } from '../art/particles'
import { ArmchairFront } from '../art/furniture'
import { HER, HerRoom, type HerRoomHandle } from '../art/HerRoom'
import { WOMAN } from '../characters/body'
import { Character, type CharacterHandle } from '../characters/Character'
import { VITA_LOOK, W_HOME } from '../characters/palettes'
import { FACE, HAND, PROP } from '../characters/pose'
import { targetForGrip } from '../characters/rigMath'
import { clamp, ease, smoothstep, windowEnv } from '../engine/math'
import { Actor } from '../stage/actor'
import { CamTrack, cameraViewBox, rc } from '../stage/camera'
import { FxLayer, SceneFrame, WorldSvg, type FxHandle, type ViewBox } from '../stage/layers'
import type { FrameCtx, Layout, RegisterScene, Screen } from '../stage/types'
import { useTimeline } from '../stage/useTimeline'
import type { Timeline } from '../story/timeline'
import { pick, ROOM_MATCH, ROOM_WOMAN } from './shared'

/**
 * КУПЛЕТ 1 — вечірній затишок.
 * «А коли до тебе вечір завітає» — клас поступово стає її кімнатою (збіжний наплив), за вікном вечір.
 * «Хай турботи потихеньку відійдуть» — відкладає зошити, вмикає теплу лампу, сідає в крісло.
 * «Хай і серце вчительське відпочиває» — бере чашку чаю, заплющує очі, спокійна усмішка.
 * «Хай тебе шанують, чують, бережуть» — дивиться на дитячі листівки-подяки, які тепло світяться.
 */
function plan(tl: Timeline, layout: Layout) {
  const s = tl.s
  const e = tl.e
  const s5 = s('v1-5')
  const s6 = s('v1-6')
  const s7 = s('v1-7')
  const s8 = s('v1-8')
  const c1 = s('c1-1')
  const holdNotes = {
    propF: PROP.notebooks,
    fHand: HAND.hold,
    fhx: 18,
    fhy: 48,
    fw: -88,
    fA: 1,
    fFront: 1,
    nHand: HAND.hold,
    nhx: 26,
    nhy: 52,
    nw: -60,
    nA: 1,
  }
  const W = new Actor(WOMAN, {
    x: ROOM_WOMAN.x,
    y: ROOM_WOMAN.y,
    flip: -1,
    turn: 0.8,
    head: -3,
    lookX: 0.3,
    lookY: -0.25,
    ...FACE.calm,
    smile: 0.45,
    ...holdNotes,
    nSw: 0,
    fSw: 0,
  })
  // дивиться на вечірнє небо, легкий видих
  W.to(s5 + 0.6, s5 + 2.4, { head: 2, lookY: -0.05, smile: 0.5, eye: 0.85 })
  W.to(s5 + 2.6, s5 + 3.2, { eye: 1, turn: 0.05, head: 0, lookX: -0.4 })
  W.set(s5 + 3.25, { flip: 1, turn: 0.06, lookX: 0.2, nfx: -4, ffx: 10 })
  W.to(s5 + 3.25, s5 + 3.8, { turn: 0.55, nfx: WOMAN.footN, ffx: WOMAN.footF, smile: 0.55 })
  // іде до столика
  const standX = HER.chairX + 42
  const walkEnd = W.walkAuto(s5 + 3.6, ROOM_WOMAN.x, standX, 'n')
  // відкладає зошити на столик
  const putAt = walkEnd + 0.2
  W.to(putAt, putAt + 0.7, { lean: 9, fhx: 54, fhy: 70, nhx: 58, nhy: 74, fw: -95, nw: -80, lookY: 0.55, lookX: 0.4, head: 6 }, ease.inOutCubic)
  W.set(putAt + 0.72, { propF: 0 })
  // вмикає лампу
  W.to(putAt + 0.75, putAt + 1.4, { fFront: 0, fHand: HAND.relaxed, fhx: 4, fhy: 108, fA: 0, fw: 0, nHand: HAND.open, nhx: 96, nhy: -18, nw: -170, nA: 1, lean: 12, lookY: -0.4, head: -4 }, ease.inOutCubic)
  const lampOn = putAt + 1.35
  W.to(lampOn + 0.1, lampOn + 0.8, { nHand: HAND.relaxed, nhx: 6, nhy: 108, nA: 0, nw: 0, lean: 0, head: 0, lookY: 0, ...FACE.warm }, ease.inOutCubic)
  // сідає в крісло (стопи на місці, таз рухається назад і вниз)
  const sit = Math.max(lampOn + 0.9, s6 + 2.2)
  W.to(sit, sit + 0.7, { px: -20, py: 30, lean: 16, turn: 0.4, head: 4 }, ease.inQuad)
  W.to(sit + 0.7, sit + 1.5, { px: -40, py: 59, lean: -4, nhx: 22, nhy: 84, fhx: 16, fhy: 88, ...FACE.relief }, ease.outCubic)
  // бере чашку (до столика трохи нахиляється)
  const reach = Math.max(sit + 1.8, s7 + 0.05)
  const seated = { x: standX, flip: 1, sc: 1, px: -40, py: 59, lean: 10, nw: -90, nA: 1 }
  const cupT = targetForGrip({ ...W.track.base, ...seated, y: ROOM_WOMAN.y }, WOMAN, 'n', HER.cupX, HER.tableTop - 9, -90)
  W.to(reach, reach + 0.9, { lean: 10, nHand: HAND.hold, nhx: cupT.hx, nhy: cupT.hy, nw: -90, nA: 1, lookX: 0.5, lookY: 0.4, head: 5, ...FACE.warm }, ease.inOutCubic)
  W.set(reach + 0.92, { propN: PROP.cup, steam: 1 })
  W.to(reach + 0.95, reach + 1.9, { lean: -6, nhx: 28, nhy: 54, fFront: 1, fHand: HAND.hold, fhx: 16, fhy: 62, fw: -80, fA: 1, head: 2, lookY: 0.2, lookX: 0.2 }, ease.inOutCubic)
  // заплющує очі — спокій, тепло
  W.to(reach + 2.1, reach + 2.9, { ...FACE.peace, head: -3, lean: -9 })
  // дивиться на листівки-подяки
  W.to(s8 + 0.1, s8 + 0.9, { ...FACE.warm, blush: 0.3, lookX: 0.7, lookY: -0.8, head: -8, turn: 0.65 })
  W.to(s8 + 2.6, s8 + 3.4, { lookX: -0.1, lookY: 0, head: 0, turn: 0.4, smile: 0.8, blush: 0.2 })
  W.to(s8 + 3.6, e('v1-8') + 0.4, { nod: 0.25 })

  const cam = new CamTrack(ROOM_MATCH[layout])
  cam.to(s5 + 3.3, walkEnd, pick(layout, rc(40, -320, 900, 620), rc(10, -330, 560, 800)))
  cam.to(walkEnd + 0.2, sit + 1.5, pick(layout, rc(150, -270, 720, 500), rc(130, -260, 470, 680)))
  cam.to(reach, reach + 2.4, pick(layout, rc(140, -232, 560, 390), rc(130, -230, 400, 560)))
  cam.to(s8 - 0.3, s8 + 1.2, pick(layout, rc(160, -320, 700, 500), rc(150, -330, 460, 680)))
  cam.to(c1 - 1.6, c1, pick(layout, rc(230, -250, 520, 360), rc(220, -250, 380, 520)), ease.inCubic)

  return {
    W,
    cam,
    lamp: (t: number) => smoothstep(lampOn, lampOn + 1.1, t),
    cards: (t: number) => windowEnv(t, s8 - 0.2, c1 + 0.5, 1.2, 1.0),
    notebooks: (t: number) => t >= putAt + 0.72,
    cup: (t: number) => t < reach + 0.92,
    armFront: (t: number) => smoothstep(sit + 0.45, sit + 0.85, t),
    bloom: (t: number) => smoothstep(c1 - 1.5, c1 - 0.2, t),
  }
}

export function EveningScene({ layout, register }: { layout: Layout; register: RegisterScene }) {
  const tl = useTimeline()
  const p = useMemo(() => plan(tl, layout), [tl, layout])
  const woman = useRef<CharacterHandle>(null)
  const room = useRef<HerRoomHandle>(null)
  const motes = useRef<MoteLayerHandle>(null)
  const bloom = useRef<FxHandle>(null)
  const cool = useRef<FxHandle>(null)
  const armFront = useRef<FxHandle>(null)

  const view = useCallback((t: number, scr: Screen): ViewBox => cameraViewBox(p.cam.at(t), scr), [p])
  const update = useCallback(
    (ctx: FrameCtx) => {
      const t = ctx.t
      const lamp = p.lamp(t)
      room.current?.update({ lamp, night: 0.15 + lamp * 0.1, clock: 0, cup: p.cup(t), notebooks: p.notebooks(t), cards: p.cards(t), vase: false }, ctx.heavy)
      if (ctx.heavy) woman.current?.apply(p.W.pose(t), t)
      motes.current?.update(t, lamp)
      armFront.current?.opacity(p.armFront(t))
      cool.current?.opacity(0.16 * (1 - lamp))
      bloom.current?.opacity(clamp(p.bloom(t)))
    },
    [p],
  )

  return (
    <SceneFrame id="evening" label="Вечірня кімната: лампа, крісло, чашка чаю" register={register} view={view} update={update}>
      <HerRoom id="ev" ref={room} />
      <MoteLayer ref={motes} count={18} area={{ x: 40, y: -520, w: 460, h: 520 }} seed={7} color="#ffdca0" size={2.4} />
      <WorldSvg layer>
        <Character ref={woman} body={WOMAN} look={VITA_LOOK} outfit={W_HOME} seed={2} shadow={0.25} />
      </WorldSvg>
      {/* передній підлокітник крісла з’являється, коли героїня сідає */}
      <FxLayer ref={armFront} bounds={{ x: HER.chairX - 80, y: HER.chairY - 130, w: 200, h: 140 }} initialOpacity={0}>
        <ArmchairFront x={HER.chairX} y={HER.chairY} s={HER.chairS} />
      </FxLayer>
      <FxLayer ref={cool} bounds={{ x: -2400, y: -1800, w: 5200, h: 3200 }} initialOpacity={0.16} fill="#33405e" />
      {/* світло лампи розливається — перехід до святкового приспіву */}
      <FxLayer ref={bloom} bounds={{ x: HER.lampX - 2600, y: -2400, w: 5200, h: 4600 }} initialOpacity={0}>
        <defs>
          <radialGradient id="ev-bloom" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff1cf" stopOpacity="1" />
            <stop offset="0.5" stopColor="#ffd98f" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ffc56a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x={HER.lampX - 2600} y={-2400} width={5200} height={4600} fill="url(#ev-bloom)" />
      </FxLayer>
    </SceneFrame>
  )
}
