import { useCallback, useMemo, useRef } from 'react'
import { AutumnTree, Leaf, type LeafFieldHandle } from '../art/common'
import { LeafLayer, MoteLayer, type MoteLayerHandle } from '../art/particles'
import { Bench, CafeTable, FlowerBush, KalynaBush, StreetLamp, StringLights } from '../art/outdoor'
import { MAN, WOMAN } from '../characters/body'
import { Character, type CharacterHandle } from '../characters/Character'
import { M_AUTUMN, SERHII_LOOK, VITA_LOOK, W_AUTUMN } from '../characters/palettes'
import { FACE, HAND, PROP } from '../characters/pose'
import { targetForGrip } from '../characters/rigMath'
import { clamp, ease, lerp, smoothstep, windowEnv } from '../engine/math'
import { Actor } from '../stage/actor'
import { CamTrack, cameraViewBox, rc } from '../stage/camera'
import { FxLayer, SceneFrame, WorldSvg, type FxHandle, type ViewBox } from '../stage/layers'
import { setDisplay, setOpacity, setSvgAttribute as attr } from '../stage/svgAttributes'
import type { FrameCtx, Layout, RegisterScene, Screen } from '../stage/types'
import { useTimeline } from '../stage/useTimeline'
import type { Timeline } from '../story/timeline'

/**
 * ПРОГРАШ → БРІДЖ → ФІНАЛЬНИЙ ПРИСПІВ → ЗАВЕРШЕННЯ — один безперервний простір: осіння алея і тераса в саду.
 * Програш: вона йде алеєю зліва, він — справа; помічають одне одного, усміхаються (одне середовище).
 * «Сподіваюсь, станем ближчими з тобою» — обоє роблять однакові кроки назустріч (взаємний рух).
 * «І для щирих слів завжди знайдеться час» — разом ідуть до тераси, сідають на лавку з природною відстанню.
 * «Щоб ділитися і радістю, й журбою» — розмова; «Щоб життя ще більше поєднало нас» — тиха усмішка,
 *   пара від двох чашок на столику м’яко сплітається.
 * Фінальний приспів — найсвітліша сцена: золоте світло, квіти, гірлянда, легкий «тост» чашками.
 * Завершення «Хай тобі буде тепло» — рух заспокоюється, лишається затишна композиція.
 */
const BENCH = { x: 600, y: 22 }
const SEAT_W = BENCH.x - 78
const SEAT_M = BENCH.x + 84
const TABLE = { x: BENCH.x + 6, y: 118 }
const CUP_W = { x: TABLE.x - 22, y: TABLE.y - 112 * 0.9 }
const CUP_M = { x: TABLE.x + 24, y: TABLE.y - 112 * 0.9 }

function plan(tl: Timeline, layout: Layout) {
  const s = tl.s
  const e = tl.e
  const g0 = e('c2-4') + 1.4
  const b1 = s('b-1')
  const b2 = s('b-2')
  const b3 = s('b-3')
  const b4 = s('b-4')
  const f1 = s('f-1')
  const f2 = s('f-2')
  const f3 = s('f-3')
  const f4 = s('f-4')
  const o1 = s('o-1')
  const o2 = s('o-2')
  const end = tl.duration

  const W = new Actor(WOMAN, { x: -1560, y: 22, flip: 1, turn: 0.7, ...FACE.calm, smile: 0.45, lookX: 0.2, wind: 0.8, nhx: 8, nhy: 102, fhx: 4, fhy: 104 })
  const M = new Actor(MAN, { x: 1950, y: 18, flip: -1, turn: 0.7, ...FACE.calm, smile: 0.4, lookX: 0.2, wind: 0.6, nhx: 8, nhy: 110, fhx: 4, fhy: 112 })

  // програш: вона йде алеєю, милується листям
  const wEnd = W.walkAuto(g0 - 0.6, -1560, -430, 'n', 1, 0.56)
  W.to(g0 + 1.5, g0 + 3, { lookY: -0.6, head: -8, smile: 0.6 })
  W.to(wEnd - 0.6, wEnd + 0.4, { lookY: 0, head: 0, lookX: 0.3 })
  // він іде назустріч із іншого боку
  const mStart = g0 + 3.6
  const mEnd = M.walkAuto(mStart, 1950, 810, 'n', 1, 0.6)
  // помічають одне одного
  const see = Math.max(mEnd + 0.3, wEnd + 0.6)
  M.to(see - 0.4, see + 0.5, { ...FACE.surprise, lookX: 0.7 })
  M.to(see + 0.6, see + 1.4, { ...FACE.warm, head: 3 })
  W.to(see + 0.2, see + 1.0, { ...FACE.warm, turn: 0.75, lookX: 0.7, head: -2 })
  // вона ледь помітно махає рукою, він киває
  W.to(see + 1.2, see + 1.8, { fFront: 1, fHand: HAND.open, fhx: 26, fhy: 6, fw: -160, fA: 1 }, ease.inOutCubic)
  W.to(see + 2.3, see + 2.9, { fFront: 0, fHand: HAND.relaxed, fhx: 4, fhy: 104, fA: 0, fw: 0 }, ease.inOutCubic)
  M.to(see + 1.4, see + 2.4, { nod: 0.4, ...FACE.beam })
  M.to(see + 2.4, see + 2.8, { nod: 0 })
  // перші повільні кроки назустріч (однакові)
  const pre = Math.max(see + 3.0, b1 - 3.7)
  W.walk(pre, b1 - 0.1, -430, -240, 'n')
  M.walk(pre, b1 - 0.1, 810, 620, 'n')
  // «Сподіваюсь, станем ближчими з тобою» — кроки назустріч
  const meetW = 108
  const meetM = 282
  W.walk(b1 + 0.15, b1 + 3.0, -240, meetW, 'f')
  M.walk(b1 + 0.15, b1 + 3.0, 620, meetM, 'f')
  W.to(b1 + 2.8, b1 + 3.6, { ...FACE.beam, lookX: 0.6, blush: 0.25 })
  M.to(b1 + 2.8, b1 + 3.6, { ...FACE.beam, lookX: 0.6 })
  // «І для щирих слів завжди знайдеться час» — він запрошує жестом до тераси, вона киває
  M.to(b2 - 0.4, b2 + 0.5, { fFront: 1, fHand: HAND.open, fhx: 30, fhy: 30, fw: -120, fA: 1, turn: 0.4 }, ease.inOutCubic)
  W.to(b2 + 0.1, b2 + 0.8, { nod: 0.3, turn: 0.55 })
  W.to(b2 + 0.8, b2 + 1.0, { nod: 0 })
  M.to(b2 + 0.6, b2 + 0.9, { fFront: 0, fHand: HAND.relaxed, fhx: 4, fhy: 112, fA: 0, fw: 0, turn: 0.1 })
  M.set(b2 + 0.9, { flip: 1, turn: 0.15, nfx: -5, ffx: 13 })
  M.to(b2 + 0.9, b2 + 1.3, { turn: 0.55, nfx: MAN.footN, ffx: MAN.footF })
  const wArr = W.walkAuto(b2 + 1.1, meetW, SEAT_W + 34, 'n', 1, 0.62)
  const mArr = M.walkAuto(b2 + 1.25, meetM, SEAT_M - 40, 'n', 1, 0.62)
  // сідають на лавку (природна відстань між ними)
  const sitW = wArr + 0.15
  W.to(sitW, sitW + 0.6, { px: -18, py: 30, lean: 14, turn: 0.45 }, ease.inQuad)
  W.to(sitW + 0.6, sitW + 1.3, { px: -34, py: 64, lean: -2, lFS: 0.6, nfx: 20, ffx: 32, nhx: 22, nhy: 84, fhx: 16, fhy: 88, ...FACE.warm }, ease.outCubic)
  const sitM = mArr + 0.15
  M.to(sitM, sitM + 0.25, { turn: 0.1 })
  M.set(sitM + 0.25, { flip: -1, turn: 0.12, nfx: -6, ffx: 10 })
  M.to(sitM + 0.25, sitM + 0.85, { px: -16, py: 32, lean: 14, turn: 0.5 }, ease.inQuad)
  M.to(sitM + 0.85, sitM + 1.5, { px: -38, py: 74, lean: -2, lFS: 0.6, nfx: 22, ffx: 34, nhx: 24, nhy: 90, fhx: 18, fhy: 95, ...FACE.warm }, ease.outCubic)
  // «Щоб ділитися і радістю, й журбою» — розмова: радість, мить задумливості, підтримка
  W.to(b3, b3 + 0.4, { talk: 0.6, ...FACE.beam, turn: 0.75, lookX: 0.6 })
  W.to(b3 + 0.3, b3 + 0.9, { fFront: 1, fHand: HAND.open, fhx: 40, fhy: 30, fw: -140, fA: 1 }, ease.inOutCubic)
  M.to(b3 + 0.4, b3 + 1.0, { ...FACE.beam, nod: 0.3, turn: 0.75, lookX: 0.6 })
  W.to(b3 + 1.8, b3 + 2.3, { talk: 0, fFront: 0, fHand: HAND.relaxed, fhx: 16, fhy: 88, fA: 0, fw: 0, ...FACE.concern, head: 6, lookY: 0.5, eye: 0.85 })
  M.to(b3 + 2.0, b3 + 2.4, { nod: 0, ...FACE.listen, browIn: 0.35 })
  M.to(b3 + 2.5, b3 + 3.0, { talk: 0.5, ...FACE.warm })
  W.to(e('b-3') - 0.6, e('b-3') + 0.2, { ...FACE.warm, head: 0, lookY: 0, eye: 1 })
  M.to(e('b-3') - 0.2, e('b-3') + 0.2, { talk: 0 })
  // «Щоб життя ще більше поєднало нас» — тиха усмішка, погляд
  W.to(b4, b4 + 1.4, { smile: 0.85, blush: 0.3, lookX: 0.7, head: 2 })
  M.to(b4 + 0.3, b4 + 1.6, { smile: 0.85, lookX: 0.7, head: 2 })
  W.to(b4 + 2.6, e('b-4'), { turn: 0.35, lookX: 0.2, lookY: -0.2, head: -2 })
  M.to(b4 + 2.8, e('b-4'), { turn: 0.35, lookX: 0.2, lookY: -0.2, head: -2 })
  // фінальний приспів: дивляться на захід сонця, світло й квіти; «тост» чашками
  W.to(f1 - 0.4, f1 + 1.2, { ...FACE.beam, turn: 0.25, lookX: -0.3, lookY: -0.3 })
  M.to(f1 - 0.2, f1 + 1.4, { ...FACE.beam, turn: 0.3, lookX: 0.2, lookY: -0.3 })
  const seatedW = { ...W.track.base, x: SEAT_W + 34, flip: 1, sc: 1, px: -34, py: 64, lean: 8, lFS: 0.6 }
  const seatedM = { ...M.track.base, x: SEAT_M - 40, flip: -1, sc: 1, px: -38, py: 74, lean: 8, lFS: 0.6 }
  const cw = targetForGrip(seatedW, WOMAN, 'n', CUP_W.x, CUP_W.y - 9, -90)
  const cm = targetForGrip(seatedM, MAN, 'n', CUP_M.x, CUP_M.y - 9, -90)
  M.to(f2 - 0.3, f2 + 0.6, { lean: 8, nHand: HAND.hold, nhx: cm.hx, nhy: cm.hy, nw: -90, nA: 1, turn: 0.75, lookX: 0.4, lookY: 0.4 }, ease.inOutCubic)
  M.set(f2 + 0.62, { propN: PROP.cup, steam: 1 })
  W.to(f2 + 0.1, f2 + 1.0, { lean: 8, nHand: HAND.hold, nhx: cw.hx, nhy: cw.hy, nw: -90, nA: 1, turn: 0.75, lookX: 0.4, lookY: 0.4 }, ease.inOutCubic)
  W.set(f2 + 1.02, { propN: PROP.cup, steam: 1 })
  M.to(f2 + 0.7, f2 + 1.6, { lean: 0, nhx: 44, nhy: 30, ...FACE.beam, lookY: 0, lookX: 0.7 }, ease.inOutCubic)
  W.to(f2 + 1.1, f2 + 2.0, { lean: 0, nhx: 44, nhy: 30, ...FACE.beam, lookY: 0, lookX: 0.7 }, ease.inOutCubic)
  W.to(f2 + 2.6, e('f-2'), { nhx: 30, nhy: 50, fFront: 1, fHand: HAND.hold, fhx: 16, fhy: 60, fw: -80, fA: 1, ...FACE.warm })
  M.to(f2 + 2.7, e('f-2'), { nhx: 30, nhy: 54, fFront: 1, fHand: HAND.hold, fhx: 18, fhy: 64, fw: -80, fA: 1, ...FACE.warm })
  // «Хай тобі вертається все віддане тепло» — світло довкола, обличчя до сонця
  W.to(f3 - 0.2, f3 + 1.4, { turn: 0.3, lookX: -0.2, lookY: -0.4, ...FACE.relief, eye: 0.9, smile: 0.8 })
  M.to(f3, f3 + 1.6, { turn: 0.35, lookX: 0.1, lookY: -0.4, smile: 0.8 })
  // «Щоб і в серці, і у домі сонячно було» — знову погляд одне на одного
  W.to(f4 - 0.2, f4 + 1.2, { turn: 0.75, lookX: 0.6, lookY: 0, ...FACE.beam })
  M.to(f4, f4 + 1.3, { turn: 0.75, lookX: 0.6, lookY: 0, ...FACE.beam })
  // завершення: спокій
  M.to(o1 - 0.2, o1 + 1.4, { ...FACE.warm, lookX: 0.7, head: 3 })
  W.to(o1 + 0.4, o1 + 1.8, { ...FACE.warm, blush: 0.3, head: 2 })
  W.to(o2, o2 + 1.6, { ...FACE.peace, smile: 0.7, head: -2, lean: -4 })
  M.to(o2 + 0.4, o2 + 2.0, { ...FACE.relief, smile: 0.75, lean: -4 })
  W.to(e('o-2') + 2.5, e('o-2') + 4.5, { ...FACE.warm, turn: 0.6, lookX: 0.5 })
  W.to(e('o-2') + 1, end, { idle: 0.4, breath: 0.6, wind: 0.2 })
  M.to(e('o-2') + 1, end, { idle: 0.4, breath: 0.6, wind: 0.2 })

  // камера
  const T = (r: [number, number, number, number], q: [number, number, number, number]) => (layout === 'wide' ? rc(...r) : rc(...q))
  const cam = new CamTrack(T([-1380, -330, 1300, 720], [-1420, -320, 640, 940]))
  cam.to(g0 + 0.5, wEnd, T([-560, -330, 1200, 700], [-520, -320, 620, 900]), ease.inOutSine)
  cam.to(mStart + 1.5, mEnd, T([760, -330, 1250, 720], [860, -320, 620, 900]), ease.inOutSine)
  cam.to(see - 0.2, see + 2.6, T([190, -400, 1900, 940], [190, -420, 1420, 2000]), ease.inOutCubic)
  cam.to(pre, b1 + 0.2, T([195, -330, 1300, 720], [195, -330, 860, 1220]), ease.inOutSine)
  cam.to(b1 + 0.4, b1 + 3.2, T([195, -300, 880, 590], [195, -300, 560, 800]), ease.inOutSine)
  cam.to(b2 + 1.0, sitM + 1.2, T([BENCH.x, -280, 900, 600], [BENCH.x, -290, 560, 800]), ease.inOutSine)
  cam.to(b3 - 0.4, b3 + 1.6, T([BENCH.x, -250, 660, 450], [BENCH.x, -250, 440, 620]), ease.inOutSine)
  cam.to(b4 + 0.5, e('b-4'), T([BENCH.x, -240, 600, 410], [BENCH.x, -240, 400, 570]), ease.inOutSine)
  cam.to(e('b-4') + 0.2, f1 + 1.5, T([BENCH.x + 60, -400, 1300, 800], [BENCH.x + 30, -420, 760, 1100]), ease.inOutCubic)
  cam.to(f2 - 0.5, f2 + 1.5, T([BENCH.x, -280, 860, 580], [BENCH.x, -280, 520, 740]), ease.inOutSine)
  cam.to(f3 - 0.3, f3 + 2.5, T([BENCH.x + 60, -380, 1400, 860], [BENCH.x + 30, -380, 760, 1100]), ease.inOutSine)
  cam.to(f4 - 0.2, e('f-4'), T([BENCH.x + 20, -300, 980, 660], [BENCH.x, -300, 600, 860]), ease.inOutSine)
  cam.to(o1 - 0.5, o1 + 2, T([BENCH.x, -260, 760, 520], [BENCH.x, -265, 480, 680]), ease.inOutSine)
  // фінальний кадр: герої в нижній частині, у небі — місце для фінального напису
  cam.to(e('o-2') + 0.5, e('o-2') + 9, T([BENCH.x + 60, -420, 2400, 1180], [BENCH.x, -480, 780, 1150]), ease.inOutSine)

  return {
    W,
    M,
    cam,
    lights: (t: number) => smoothstep(e('b-4') + 0.2, f1 + 0.6, t),
    sunset: (t: number) => smoothstep(f1, end - 6, t),
    sunY: (t: number) => lerp(-560, -190, smoothstep(g0, end - 4, t)),
    rays: (t: number) => 0.35 + 0.65 * smoothstep(e('b-4') - 1, f1 + 2, t) * (1 - 0.6 * smoothstep(e('o-2'), end, t)),
    glow: (t: number) => windowEnv(t, f3 - 0.4, e('f-4') + 2, 1.4, 2),
    entwine: (t: number) => smoothstep(b4 + 0.4, b4 + 3.4, t),
    cupsOnTable: (t: number) => [t < f2 + 1.02, t < f2 + 0.62] as const,
    lamps: (t: number) => smoothstep(o1, e('o-2') + 3, t),
    calm: (t: number) => 1 - 0.7 * smoothstep(e('o-2'), e('o-2') + 6, t),
  }
}

const SUN_Y0 = -560

export function GardenScene({ layout, register }: { layout: Layout; register: RegisterScene }) {
  const tl = useTimeline()
  const p = useMemo(() => plan(tl, layout), [tl, layout])
  const woman = useRef<CharacterHandle>(null)
  const man = useRef<CharacterHandle>(null)
  const leaves = useRef<LeafFieldHandle>(null)
  const leavesFront = useRef<LeafFieldHandle>(null)
  const motes = useRef<MoteLayerHandle>(null)
  const sparkle = useRef<MoteLayerHandle>(null)
  const bulbs = useRef<FxHandle>(null)
  const sunset = useRef<FxHandle>(null)
  const sun = useRef<FxHandle>(null)
  const dusk = useRef<FxHandle>(null)
  const steamW = useRef<SVGPathElement>(null)
  const steamM = useRef<SVGPathElement>(null)
  const cupW = useRef<SVGGElement>(null)
  const cupM = useRef<SVGGElement>(null)
  const lampGlow = useRef<FxHandle>(null)
  const flowerGlow = useRef<FxHandle>(null)
  const rays = useRef<FxHandle>(null)
  const wrap = useRef<FxHandle>(null)
  const sunX = layout === 'wide' ? 1060 : 860

  const view = useCallback((t: number, scr: Screen): ViewBox => cameraViewBox(p.cam.at(t), scr), [p])
  const update = useCallback(
    (ctx: FrameCtx) => {
      const t = ctx.t
      woman.current?.apply(p.W.pose(t), t)
      man.current?.apply(p.M.pose(t), t)
      const calm = p.calm(t)
      leaves.current?.update(t * (0.4 + 0.6 * calm), Math.max(0.35, calm), 0.6)
      leavesFront.current?.update(t * 0.7, calm, 0.6)
      motes.current?.update(t, 0.7)
      // світло — окремі шари: змінюються лише прозорість, зсув і поворот (робота композитора)
      const lg = p.lights(t)
      bulbs.current?.opacity(lg * (0.85 + 0.15 * Math.sin(t * 2.1)))
      const ss = p.sunset(t)
      sunset.current?.opacity(ss)
      dusk.current?.opacity(ss * 0.6)
      const dy = p.sunY(t) - SUN_Y0
      sun.current?.move(0, dy)
      const r = p.rays(t)
      rays.current?.move(0, dy, t * 0.8)
      rays.current?.opacity(r)
      wrap.current?.move(0, dy)
      wrap.current?.opacity(0.55 * r)
      const gl = p.glow(t)
      sparkle.current?.update(t, gl * gl)
      flowerGlow.current?.opacity(0.25 + 0.75 * gl)
      lampGlow.current?.opacity(p.lamps(t))
      const [wOn, mOn] = p.cupsOnTable(t)
      setDisplay(cupW.current, wOn)
      setDisplay(cupM.current, mOn)
      // пара від двох чашок м’яко сплітається
      const en = p.entwine(t)
      const ph = t * 0.9
      const top = -126
      const midX = (CUP_W.x + CUP_M.x) / 2
      const sw = (x0: number, side: number, ph2: number) => {
        const x1 = lerp(x0 + Math.sin(ph2) * 6, midX + side * 6, en)
        const xTop = lerp(x0 + Math.sin(ph2 + 1.4) * 8, midX - side * 4, en)
        return `M${x0} ${CUP_W.y - 22} C${(x0 + Math.sin(ph2 + 0.5) * 10).toFixed(1)} ${CUP_W.y - 50} ${x1.toFixed(1)} ${CUP_W.y - 70} ${(lerp(x0, midX, en * 0.6) + Math.sin(ph2 + 2) * 5).toFixed(1)} ${CUP_W.y - 95} S${xTop.toFixed(1)} ${CUP_W.y + top + 20} ${(xTop + Math.sin(ph2 + 3) * 6).toFixed(1)} ${CUP_W.y + top}`
      }
      const steamOp = 0.16 + 0.2 * clamp(en + 0.3)
      setOpacity(steamW.current, wOn ? steamOp : 0)
      setOpacity(steamM.current, mOn ? steamOp : 0)
      if (wOn) attr(steamW.current, 'd', sw(CUP_W.x, -1, ph))
      if (mOn) attr(steamM.current, 'd', sw(CUP_M.x, 1, ph + 2))
    },
    [p],
  )

  return (
    <SceneFrame id="garden" label="Осінній сад і тераса: зустріч, лавка, дві чашки, золоте світло" register={register} view={view} update={update}>
      <WorldSvg>
        <defs>
          <linearGradient id="gd-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e6a978" />
            <stop offset="0.5" stopColor="#f3c690" />
            <stop offset="1" stopColor="#f9dfae" />
          </linearGradient>
        </defs>
        {/* небо: золоте → захід → сутінки */}
        <rect x={-5000} y={-4000} width={10000} height={4000} fill="url(#gd-sky)" />
      </WorldSvg>
      <FxLayer ref={sunset} bounds={{ x: -5000, y: -4000, w: 10000, h: 4000 }} initialOpacity={0}>
        <defs>
          <linearGradient id="gd-sunset" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6d5a7e" />
            <stop offset="0.45" stopColor="#c27e86" />
            <stop offset="0.8" stopColor="#f0a77a" />
            <stop offset="1" stopColor="#f7c98e" />
          </linearGradient>
        </defs>
        <rect x={-5000} y={-4000} width={10000} height={4000} fill="url(#gd-sunset)" />
      </FxLayer>
      {/* сонце, що повільно сідає за пагорби */}
      <FxLayer ref={sun} bounds={{ x: sunX - 1500, y: SUN_Y0 - 900, w: 3000, h: 1800 }}>
        <defs>
          <radialGradient id="gd-sun">
            <stop offset="0" stopColor="#fff3d4" stopOpacity="1" />
            <stop offset="0.12" stopColor="#ffe2a2" stopOpacity="0.9" />
            <stop offset="0.4" stopColor="#ffc879" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffb86a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gd-horizon">
            <stop offset="0" stopColor="#ffd08a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffb878" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${sunX} ${SUN_Y0})`}>
          <circle cx={0} cy={0} r={900} fill="url(#gd-sun)" />
          <ellipse cx={0} cy={60} rx={1500} ry={220} fill="url(#gd-horizon)" />
          <circle cx={0} cy={0} r={58} fill="#fff6e2" opacity={0.96} />
        </g>
      </FxLayer>
      <FxLayer ref={rays} bounds={{ x: sunX - 2200, y: SUN_Y0 - 2200, w: 4400, h: 4400 }} pivot={[sunX, SUN_Y0]} initialOpacity={0.4}>
        <defs>
          <radialGradient id="gd-ray" cx="0" cy="0" r="2200" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff1cf" stopOpacity="0.32" />
            <stop offset="0.6" stopColor="#fff1cf" stopOpacity="0.06" />
            <stop offset="1" stopColor="#fff1cf" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${sunX} ${SUN_Y0})`}>
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2
            const a2 = a + 0.07
            const d = `M0 0 L${(Math.cos(a) * 2200).toFixed(0)} ${(Math.sin(a) * 2200).toFixed(0)} L${(Math.cos(a2) * 2200).toFixed(0)} ${(Math.sin(a2) * 2200).toFixed(0)} Z`
            return <path key={i} d={d} fill="url(#gd-ray)" />
          })}
        </g>
      </FxLayer>
      <WorldSvg>
        <defs>
          <linearGradient id="gd-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a39a5a" />
            <stop offset="1" stopColor="#6f7a48" />
          </linearGradient>
          <linearGradient id="gd-path" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e3cfa8" />
            <stop offset="1" stopColor="#cbb38a" />
          </linearGradient>
          <linearGradient id="gd-deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b98a5c" />
            <stop offset="1" stopColor="#8e6440" />
          </linearGradient>
        </defs>
        {/* пагорби й далекий ліс у серпанку */}
        <path d="M-5000 -260 C-3000 -360 -1600 -300 -400 -340 C800 -380 1800 -300 5000 -330 V0 H-5000 Z" fill="#d9a87a" opacity={0.55} />
        <path d="M-5000 -180 C-3400 -240 -1800 -200 -200 -230 C1400 -260 2600 -200 5000 -220 V0 H-5000 Z" fill="#b98a62" opacity={0.6} />
        {/* дальній ряд дерев алеї */}
        {[-2700, -2250, -1800, -1350, -900, -450, 1500, 1950].map((x, i) => (
          <AutumnTree key={x} x={x} y={-40} s={1.9 + (i % 3) * 0.15} seed={40 + i} palette={i % 2 ? ['#e2a640', '#d58a2f', '#eec46a', '#c76b30'] : ['#e8b64e', '#d9952f', '#efc86a', '#c97b2e']} lit="right" />
        ))}
        {/* трава, алея, настил тераси */}
        <rect x={-5000} y={-60} width={10000} height={3000} fill="url(#gd-grass)" />
        <path d="M-5000 -18 L320 -18 L380 70 L-5000 70 Z" fill="url(#gd-path)" />
        <rect x={300} y={-34} width={1100} height={150} fill="url(#gd-deck)" />
        <g stroke="#7a5236" strokeWidth={2} opacity={0.45}>
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={300 + i * 92} y1={-34} x2={300 + i * 92 - 30} y2={116} />
          ))}
        </g>
        <rect x={300} y={-40} width={1100} height={8} fill="#c99a68" />
        {/* опале листя на землі */}
        {GROUND_LEAVES.map(([x, y, k, c], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${i * 47}) scale(1.6 0.8)`}>
            <Leaf kind={Number(k)} color={String(c)} vein={false} />
          </g>
        ))}
      </WorldSvg>
      {/* сяйво ліхтарів алеї (засвічуються в сутінках) */}
      <FxLayer ref={lampGlow} bounds={{ x: -1650 - 200, y: -20 - 390 - 200, w: 1230 + 400, h: 400 }} initialOpacity={0}>
        <StreetLamp x={-1650} y={-20} s={1.3} part="glow" />
        <StreetLamp x={-420} y={-20} s={1.3} part="glow" />
      </FxLayer>
      <WorldSvg>
        <StreetLamp x={-1650} y={-20} s={1.3} part="lamp" />
        <StreetLamp x={-420} y={-20} s={1.3} part="lamp" />
        <Bench x={-1080} y={-12} s={0.9} />
        {/* пергола тераси з гірляндою */}
        <rect x={330} y={-640} width={22} height={620} fill="#7a5236" />
        <rect x={1240} y={-640} width={22} height={620} fill="#6b4630" />
        <rect x={300} y={-660} width={1000} height={20} fill="#8a5d3b" />
        <g fill="#c4683a">
          {Array.from({ length: 9 }, (_, i) => (
            <ellipse key={i} cx={342 + (i % 3) * 8} cy={-600 + i * 64} rx={14} ry={9} transform={`rotate(${i * 40} ${342 + (i % 3) * 8} ${-600 + i * 64})`} />
          ))}
        </g>
        <g fill="#d99a3c">
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx={1252 - (i % 3) * 8} cy={-590 + i * 70} rx={14} ry={9} transform={`rotate(${i * 50} ${1252 - (i % 3) * 8} ${-590 + i * 70})`} />
          ))}
        </g>
        <StringLights x0={340} x1={1250} y={-640} sag={50} n={16} part="base" />
      </WorldSvg>
      {/* сяйво лампочок гірлянди — окремий шар, мерехтить лише прозорістю */}
      <FxLayer ref={bulbs} bounds={{ x: 300, y: -680, w: 1000, h: 140 }} initialOpacity={0}>
        <StringLights x0={340} x1={1250} y={-640} sag={50} n={16} part="glow" />
      </FxLayer>
      {/* квіти і калина на терасі */}
      <FxLayer ref={flowerGlow} bounds={{ x: 250, y: -170, w: 1110, h: 240 }} initialOpacity={0.25}>
        <defs>
          <radialGradient id="gd-flowerglow">
            <stop offset="0" stopColor="#ffd98f" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffd98f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={420} cy={-40} rx={160} ry={90} fill="url(#gd-flowerglow)" />
        <ellipse cx={1150} cy={-50} rx={200} ry={110} fill="url(#gd-flowerglow)" />
      </FxLayer>
      <WorldSvg>
        <FlowerBush x={410} y={-24} s={1.1} seed={51} palette={0} />
        <FlowerBush x={1120} y={-26} s={1.15} seed={52} palette={1} />
        <KalynaBush x={1240} y={-30} s={1.1} />
        <FlowerBush x={1010} y={-20} s={0.85} seed={53} palette={2} />
        {/* лавка для двох */}
        <Bench x={BENCH.x} y={BENCH.y} s={1} />
      </WorldSvg>
      {/* герої — власний шар */}
      <WorldSvg layer>
        <Character ref={woman} body={WOMAN} look={VITA_LOOK} outfit={W_AUTUMN} seed={9} shadow={0.25} />
        <Character ref={man} body={MAN} look={SERHII_LOOK} outfit={M_AUTUMN} seed={10} shadow={0.25} />
      </WorldSvg>
      <WorldSvg>
        {/* невеликий столик із двома чашками перед лавкою */}
        <CafeTable x={TABLE.x} y={TABLE.y} s={0.9} />
        <g ref={cupW}>
          <TableCupStatic x={CUP_W.x} y={CUP_W.y} color="#c46b45" />
        </g>
        <g ref={cupM}>
          <TableCupStatic x={CUP_M.x} y={CUP_M.y} color="#2f5b5d" />
        </g>
        <path ref={steamW} d="" fill="none" stroke="#fff6e6" strokeWidth={6} strokeLinecap="round" opacity={0} />
        <path ref={steamM} d="" fill="none" stroke="#fff6e6" strokeWidth={6} strokeLinecap="round" opacity={0} />
      </WorldSvg>
      {/* тепло, що повертається: золоті іскорки довкола */}
      <MoteLayer ref={sparkle} count={36} area={{ x: BENCH.x - 520, y: -620, w: 1040, h: 620 }} seed={61} color="#ffe2a0" size={3} />
      <MoteLayer ref={motes} count={20} area={{ x: -1800, y: -700, w: 3200, h: 700 }} seed={62} color="#fff0c8" size={2.4} />
      <LeafLayer ref={leaves} count={26} area={{ x: -2400, y: -900, w: 3900, h: 960 }} seed={63} scale={1.6} speed={0.7} />
      <WorldSvg>
        <FlowerBush x={-600} y={220} s={2.2} seed={70} palette={0} />
        <FlowerBush x={1500} y={240} s={2.3} seed={71} palette={1} />
      </WorldSvg>
      <LeafLayer ref={leavesFront} count={6} area={{ x: -2400, y: -900, w: 3900, h: 1300 }} seed={64} scale={2.4} speed={0.55} />
      {/* тепле світло, що огортає героїв (після персонажів — «загортання» світлом) */}
      <FxLayer ref={wrap} bounds={{ x: sunX - 1500, y: SUN_Y0 - 1500, w: 3000, h: 3000 }} initialOpacity={0}>
        <defs>
          <radialGradient id="gd-wrap" cx="0" cy="0" r="1500" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffd79a" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#ffc98a" stopOpacity="0.14" />
            <stop offset="1" stopColor="#ffc98a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${sunX} ${SUN_Y0})`}>
          <circle cx={0} cy={0} r={1500} fill="url(#gd-wrap)" />
        </g>
      </FxLayer>
      <FxLayer ref={dusk} bounds={{ x: -5000, y: -1400, w: 10000, h: 2400 }} initialOpacity={0}>
        <defs>
          <linearGradient id="gd-dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b3060" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="#3b3060" stopOpacity="0.18" />
            <stop offset="1" stopColor="#2a2040" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <rect x={-5000} y={-1400} width={10000} height={2400} fill="url(#gd-dusk)" />
      </FxLayer>
    </SceneFrame>
  )
}

const GROUND_LEAVES: [number, number, number, string][] = [
  [-1800, 30, 0, '#d9822b'],
  [-1500, 52, 1, '#e2a640'],
  [-1100, 26, 2, '#c4683a'],
  [-800, 58, 0, '#e8c46a'],
  [-300, 40, 3, '#d9822b'],
  [120, 60, 1, '#c4683a'],
]

function TableCupStatic({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0} rx={15} ry={3} fill="#d9c8b1" />
      <path d="M-9 -20 h18 l-1.6 16 c-0.4 2.2 -2 3.4 -4 3.4 h-6.8 c-2 0 -3.6 -1.2 -4 -3.4 Z" fill="#f3e8d8" />
      <path d="M-8.6 -12 h17.2 l-0.3 3 h-16.6 Z" fill={color} opacity={0.85} />
      <path d="M9 -16 c6 0 7 8 0.6 9.6" fill="none" stroke="#efe3d1" strokeWidth={2.6} />
    </g>
  )
}

