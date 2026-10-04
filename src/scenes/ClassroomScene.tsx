import { useCallback, useMemo, useRef } from 'react'
import { type LeafFieldHandle } from '../art/common'
import { LeafLayer, MoteLayer, type MoteLayerHandle } from '../art/particles'
import { Books, ChalkBoard, Curtain, DayView, Globe, KidsDrawings, PottedPlant, RoomWindow, TeacherDesk, WallClock, windowPanes } from '../art/room'
import { WOMAN } from '../characters/body'
import { Character, type CharacterHandle } from '../characters/Character'
import { VITA_LOOK, W_TEACHER } from '../characters/palettes'
import { FACE, HAND, PROP } from '../characters/pose'
import { ease, smoothstep, windowEnv } from '../engine/math'
import { Actor } from '../stage/actor'
import { CamTrack, cameraViewBox, rc } from '../stage/camera'
import { FxLayer, SceneFrame, WorldSvg, type FxHandle, type ViewBox } from '../stage/layers'
import { setOpacity } from '../stage/svgAttributes'
import type { FrameCtx, Layout, RegisterScene, Screen } from '../stage/types'
import { useTimeline } from '../stage/useTimeline'
import type { Timeline } from '../story/timeline'
import { pick, ROOM_MATCH, ROOM_WINDOW as WIN, ROOM_WOMAN } from './shared'

/**
 * КУПЛЕТ 1 — шкільний день.
 * «За вікном шкільним…» — біля вікна з книгою, дивиться на листя.
 * «…сміх дітей» — чує сміх у коридорі (тепле світло з дверей), з усмішкою обертається до класу.
 * «Ти для кожного знаходиш добре слово» — розгортає книгу, тепло говорить.
 * «Відкриваєш їм красу простих речей» — відкритий жест; крейдяні малюнки на дошці «оживають».
 * Наприкінці закриває книгу й повертається до вікна — звідси збіжний наплив у вечірню кімнату.
 */
function plan(tl: Timeline, layout: Layout) {
  const s = tl.s
  const e = tl.e
  const a = s('v1-1')
  const b = s('v1-2')
  const c = s('v1-3')
  const d = s('v1-4')
  const holdBook = {
    propF: PROP.book,
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
    bookOpen: 0,
  }
  const W = new Actor(WOMAN, {
    x: ROOM_WOMAN.x,
    y: ROOM_WOMAN.y,
    flip: -1,
    turn: 0.85,
    head: -5,
    lookX: 0.3,
    lookY: -0.4,
    ...FACE.calm,
    smile: 0.36,
    ...holdBook,
  })
  // «За вікном шкільним кружляє листя знову» — проводить поглядом листок
  W.to(a - 0.4, a + 2.0, { lookY: 0.25, lookX: 0.45, head: 4, smile: 0.5 })
  W.to(a + 2.2, e('v1-1') - 0.2, { lookY: -0.1, lookX: 0.15, head: -2, smile: 0.56, squint: 0.08 })
  // «І лунає в коридорах сміх дітей» — оглядається на сміх, світло усміхається
  W.to(b + 0.05, b + 0.85, { turn: 0.12, lookX: -0.9, lookY: 0, head: 3, ...FACE.beam })
  W.to(b + 1.4, b + 1.9, { turn: 0.02, head: 1 }, ease.inOutQuad)
  W.set(b + 1.9, { flip: 1, turn: 0.04, lookX: 0.2, nfx: -4, ffx: 10 })
  W.to(b + 1.9, b + 2.9, { turn: 0.32, lookX: -0.15, head: 2, smile: 0.78, open: 0.12 })
  W.to(b + 3.0, e('v1-2') + 0.4, { open: 0, smile: 0.7 })
  // «Ти для кожного знаходиш добре слово» — розгортає книгу, говорить до класу
  W.to(c - 0.3, c + 1.2, { bookOpen: 1, fhx: 22, fhy: 42, nhx: 30, nhy: 46, head: 4, lookY: 0.3, lookX: 0.1 })
  W.to(c + 1.3, c + 2.0, { head: -1, lookY: -0.05, lookX: -0.3, ...FACE.warm, talk: 0.55 })
  W.to(c + 2.2, e('v1-3') + 0.2, { nod: 0.35, head: 1 })
  // «Відкриваєш їм красу простих речей» — відкритий жест рукою, сяйво над книгою
  W.to(d - 0.2, d + 0.9, { nHand: HAND.open, nhx: 62, nhy: 30, nw: -135, nA: 1, nod: 0, talk: 0.25, ...FACE.beam, lookX: -0.2, head: -2 }, ease.inOutCubic)
  W.to(d + 1.0, d + 2.4, { nhx: 66, nhy: 22, nw: -142, head: 0, turn: 0.22 })
  W.to(d + 2.6, e('v1-4') + 0.1, { talk: 0, smile: 0.8, open: 0.1 })
  // кінець: закриває книгу, обертається до вікна (кадр збігається з вечірньою кімнатою)
  const z = e('v1-4')
  W.to(z + 0.1, z + 0.8, { ...holdBook, bookOpen: 0, smile: 0.5, open: 0, turn: 0.1, head: 0 }, ease.inOutCubic)
  W.set(z + 0.85, { flip: -1, turn: 0.06, nfx: WOMAN.footN, ffx: WOMAN.footF })
  W.to(z + 0.85, z + 1.6, { turn: 0.8, head: -3, lookY: -0.25, lookX: 0.3, smile: 0.45 })

  const cam = new CamTrack(pick(layout, rc(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 560, 660), rc(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 520, 760)))
  cam.to(a - 1.0, a + 2.4, pick(layout, rc(-300, -400, 1000, 760), rc(-260, -390, 620, 900)), ease.inOutCubic)
  cam.to(a + 2.6, e('v1-2') + 0.3, pick(layout, rc(-190, -310, 760, 540), rc(-120, -282, 420, 600)))
  cam.to(c - 0.6, c + 1.6, pick(layout, rc(70, -340, 1000, 680), rc(-30, -320, 560, 820)), ease.inOutCubic)
  cam.to(d - 0.2, d + 2.6, pick(layout, rc(-20, -292, 640, 450), rc(-40, -272, 360, 500)), ease.inOutCubic)
  cam.to(z + 0.2, z + 1.6, ROOM_MATCH[layout], ease.inOutCubic)

  return {
    W,
    cam,
    // світло з коридору (сміх дітей)
    doorLight: (t: number) => windowEnv(t, b - 0.6, e('v1-2') + 1.4, 0.8, 1.4),
    // дошка «оживає»
    chalk: (t: number) => smoothstep(d + 0.3, d + 1.8, t) * (1 - smoothstep(z + 0.6, z + 2.4, t)),
    bookGlow: (t: number) => windowEnv(t, c + 0.6, z + 0.9, 1.0, 0.8),
  }
}


const PANES = windowPanes(WIN.x, WIN.y, WIN.w, WIN.h)

export function ClassroomScene({ layout, register }: { layout: Layout; register: RegisterScene }) {
  const tl = useTimeline()
  const p = useMemo(() => plan(tl, layout), [tl, layout])
  const woman = useRef<CharacterHandle>(null)
  const leavesOut = useRef<LeafFieldHandle>(null)
  const motes = useRef<MoteLayerHandle>(null)
  const sparkle = useRef<MoteLayerHandle>(null)
  const door = useRef<FxHandle>(null)
  const boardGlow = useRef<SVGGElement>(null)
  const chalk = useRef<SVGGElement>(null)

  const view = useCallback((t: number, scr: Screen): ViewBox => cameraViewBox(p.cam.at(t), scr), [p])
  const update = useCallback(
    (ctx: FrameCtx) => {
      const t = ctx.t
      const pose = p.W.pose(t)
      woman.current?.apply(pose, t)
      leavesOut.current?.update(t, 1, 0.3)
      motes.current?.update(t, 0.9)
      const glow = p.chalk(t)
      setOpacity(boardGlow.current, glow)
      setOpacity(chalk.current, 0.82 + glow * 0.18)
      // світло з коридору — окремий шар, змінюється лише прозорість
      door.current?.opacity(0.25 + 0.75 * p.doorLight(t))
      // золоті іскорки над книгою слідують за героїнею
      const bg = p.bookGlow(t)
      const dir = pose.flip >= 0 ? 1 : -1
      sparkle.current?.follow(pose.x + dir * 40, pose.y - 300)
      sparkle.current?.update(t * 1.6, bg * bg)
    },
    [p],
  )

  return (
    <SceneFrame id="classroom" label="Клас: героїня біля вікна з книгою" register={register} view={view} update={update}>
      <WorldSvg>
        <defs>
          <linearGradient id="cr-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9dcc4" />
            <stop offset="1" stopColor="#f2e6cf" />
          </linearGradient>
          <linearGradient id="cr-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b98a58" />
            <stop offset="1" stopColor="#8e6440" />
          </linearGradient>
          <linearGradient id="cr-patch" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffe6b0" stopOpacity="0" />
            <stop offset="0.4" stopColor="#ffe6b0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffe6b0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* стіна і панель */}
        <rect x={-2000} y={-1800} width={4400} height={1800} fill="url(#cr-wall)" />
        <rect x={-2000} y={-190} width={4400} height={190} fill="#a9b8a2" />
        <rect x={-2000} y={-196} width={4400} height={10} fill="#c9d3c0" />
        <rect x={-2000} y={-8} width={4400} height={8} fill="#7f8f78" />
        {/* підлога (паркет) */}
        <rect x={-2000} y={0} width={4400} height={1400} fill="url(#cr-floor)" />
        <g stroke="#7a5534" strokeWidth={2} opacity={0.35}>
          {[30, 70, 120, 185, 265, 360, 480, 630].map((yy) => (
            <line key={yy} x1={-2000} x2={2400} y1={yy} y2={yy} />
          ))}
          {Array.from({ length: 26 }, (_, i) => {
            const x0 = -1600 + i * 130
            return <line key={i} x1={x0} y1={0} x2={(x0 - 100) * 2.4 + 100} y2={1400} />
          })}
        </g>
        {/* сонячна пляма на підлозі */}
        <path d="M-560 40 L-120 40 L120 260 L-260 260 Z" fill="url(#cr-patch)" opacity={0.75} />

        {/* вікно з осіннім двором */}
        <Curtain x={WIN.x - 80} y={WIN.y - 40} h={WIN.h + 90} side="left" />
        <RoomWindow id="cr-win" part="view" x={WIN.x} y={WIN.y} w={WIN.w} h={WIN.h}>
          <DayView x={WIN.x} y={WIN.y} w={WIN.w} h={WIN.h} />
        </RoomWindow>
      </WorldSvg>
      {/* листопад за склом — окремий шар (рама лишається поверх) */}
      <LeafLayer ref={leavesOut} count={16} area={{ x: WIN.x - 20, y: WIN.y, w: WIN.w + 40, h: WIN.h }} clip={PANES} seed={4} scale={1.25} speed={0.9} />
      <WorldSvg>
        <defs>
          <linearGradient id="cr-ray" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff1c8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff1c8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <RoomWindow id="cr-win" part="frame" x={WIN.x} y={WIN.y} w={WIN.w} h={WIN.h} />
        <Curtain x={WIN.x + WIN.w + 80} y={WIN.y - 40} h={WIN.h + 90} side="right" />
        <rect x={WIN.x - 110} y={WIN.y - 56} width={WIN.w + 220} height={12} rx={6} fill="#b08a5c" />
        <PottedPlant x={WIN.x + 70} y={WIN.y + WIN.h - 2} s={0.9} />
        <Books x={WIN.x + WIN.w - 130} y={WIN.y + WIN.h - 2} s={0.8} />

        {/* дошка, дитячі малюнки, стіл */}
        <KidsDrawings x={140} y={-800} w={560} />
        <ChalkBoard x={140} y={-660} w={560} h={330} glowRef={boardGlow} chalkRef={chalk} />
        <TeacherDesk x={360} y={-150} w={400} />
        <Books x={400} y={-150} s={1} />
        <Globe x={680} y={-150} s={1} />
        <g transform="translate(560 -150)">
          <rect x={-16} y={-40} width={32} height={40} rx={4} fill="#c46b45" />
          <path d="M-8 -40 l-4 -26 M0 -40 l2 -30 M8 -40 l6 -24" stroke="#5a3a28" strokeWidth={3} strokeLinecap="round" />
          <circle cx={-12} cy={-66} r={3} fill="#e2c08a" />
        </g>

        <WallClock x={995} y={-770} r={46} />
        {/* двері в коридор */}
        <rect x={880} y={-660} width={230} height={660} fill="#8a5d3b" />
        <rect x={896} y={-646} width={198} height={646} fill="#3d2a1f" />
      </WorldSvg>
      {/* тепле світло з коридору, коли лунає сміх, — окремий шар */}
      <FxLayer ref={door} bounds={{ x: 880, y: -660, w: 440, h: 1200 }} initialOpacity={0.25}>
        <defs>
          <linearGradient id="cr-door" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffd88a" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffd88a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={896} y={-646} width={90} height={646} fill="url(#cr-door)" />
        <path d="M986 0 L1300 300 L1300 520 L896 0 Z" fill="#ffd88a" opacity={0.18} />
      </FxLayer>
      <WorldSvg>
        <path d="M986 -646 L1094 -680 L1094 34 L986 0 Z" fill="#a8744a" />
        <circle cx={1004} cy={-320} r={7} fill="#e2c08a" />
        {/* промені з вікна */}
        <g opacity={0.7}>
          <path d={`M${WIN.x + 40} ${WIN.y + 80} L${WIN.x + 200} ${WIN.y + 60} L260 120 L-260 140 Z`} fill="url(#cr-ray)" />
          <path d={`M${WIN.x + 240} ${WIN.y + 120} L${WIN.x + 400} ${WIN.y + 110} L520 60 L120 90 Z`} fill="url(#cr-ray)" opacity={0.7} />
        </g>
      </WorldSvg>
      <MoteLayer ref={motes} count={26} area={{ x: -600, y: -720, w: 760, h: 760 }} seed={3} />
      {/* героїня — власний шар: її рух не перемальовує клас під нею */}
      <WorldSvg layer>
        <Character ref={woman} body={WOMAN} look={VITA_LOOK} outfit={W_TEACHER} seed={1} />
      </WorldSvg>
      {/* тепле загальне світло */}
      <FxLayer bounds={{ x: WIN.x + WIN.w / 2 - 900, y: WIN.y + WIN.h / 2 - 700, w: 1800, h: 1400 }}>
        <defs>
          <radialGradient id="cr-warm" cx="0.25" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#ffe3a8" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffe3a8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={WIN.x + WIN.w / 2} cy={WIN.y + WIN.h / 2} rx={900} ry={700} fill="url(#cr-warm)" />
      </FxLayer>
      {/* золоті іскорки над книгою під час «відкриваєш їм красу простих речей» */}
      <MoteLayer ref={sparkle} count={14} area={{ x: -60, y: -120, w: 120, h: 140 }} seed={9} color="#ffe2a0" size={2.6} />
    </SceneFrame>
  )
}
