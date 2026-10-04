import { useCallback, useMemo, useRef } from 'react'
import { AutumnTree, type LeafFieldHandle } from '../art/common'
import { DotLayer, LeafLayer, MoteLayer, type DotLayerHandle, type MoteLayerHandle } from '../art/particles'
import { StreetLamp } from '../art/outdoor'
import { MAN, WOMAN } from '../characters/body'
import { Character, type CharacterHandle } from '../characters/Character'
import { M_HOME, SERHII_LOOK, VITA_LOOK, W_HOME } from '../characters/palettes'
import { FACE, HAND, PROP } from '../characters/pose'

import { ease, smoothstep, windowEnv } from '../engine/math'
import { Actor } from '../stage/actor'
import { CamTrack, cameraViewBox, rc } from '../stage/camera'
import { FxLayer, SceneFrame, WorldSvg, type FxHandle, type ViewBox } from '../stage/layers'
import { setDisplay, setOpacity } from '../stage/svgAttributes'
import type { FrameCtx, Layout, RegisterScene, Screen } from '../stage/types'
import { useTimeline } from '../stage/useTimeline'
import type { Timeline } from '../story/timeline'

/**
 * ПРИСПІВ 2 — святковий мотив в іншому ракурсі: вечірня вулиця, два теплих вікна навпроти.
 * «…я тебе вітаю!» — у своєму вікні він піднімає чашку за неї, нитка світла між вікнами.
 * «Миру, радості…» — камера наближається до її вікна: вона ставить букет на підвіконня й усміхається.
 * «Хай тобі вертається все віддане тепло» — теплі іскорки пливуть ниткою до її вікна, квіти розкриваються.
 * «Щоб і в серці, і у домі сонячно було» — її будинок поступово наповнюється сонячним світлом.
 */
interface Geo {
  herWin: { x: number; y: number; w: number; h: number }
  hisWin: { x: number; y: number; w: number; h: number }
  herHouse: { x: number; w: number; top: number }
  hisHouse: { x: number; w: number; top: number }
}

const GEO: Record<Layout, Geo> = {
  wide: {
    herWin: { x: -820, y: -640, w: 230, h: 260 },
    hisWin: { x: 590, y: -600, w: 230, h: 260 },
    herHouse: { x: -1140, w: 720, top: -1000 },
    hisHouse: { x: 420, w: 700, top: -960 },
  },
  tall: {
    herWin: { x: -330, y: -1260, w: 220, h: 250 },
    hisWin: { x: 120, y: -640, w: 220, h: 250 },
    herHouse: { x: -560, w: 560, top: -1620 },
    hisHouse: { x: 40, w: 560, top: -1000 },
  },
}

function plan(tl: Timeline, layout: Layout) {
  const s = tl.s
  const e = tl.e
  const g = GEO[layout]
  const a = s('c2-1')
  const b = s('c2-2')
  const c = s('c2-3')
  const d = s('c2-4')
  const end = e('c2-4')
  // героїня біля свого вікна (видно від пояса), тримає букет; герой — з чашкою
  const sc = 0.62
  const W = new Actor(WOMAN, {
    x: g.herWin.x + g.herWin.w * 0.45,
    y: g.herWin.y + g.herWin.h + 120 * sc,
    sc,
    flip: 1,
    turn: 0.55,
    ...FACE.warm,
    lookX: 0.6,
    propN: PROP.bouquet,
    nHand: HAND.hold,
    nhx: 30,
    nhy: 50,
    nw: -90,
    nA: 1,
    bloom: 0.8,
  })
  const M = new Actor(MAN, {
    x: g.hisWin.x + g.hisWin.w * 0.55,
    y: g.hisWin.y + g.hisWin.h + 130 * sc,
    sc,
    flip: -1,
    turn: 0.55,
    ...FACE.warm,
    lookX: 0.6,
    propN: PROP.cup,
    nHand: HAND.hold,
    nhx: 26,
    nhy: 56,
    nw: -90,
    nA: 1,
    steam: 1,
    fFront: 1,
    fHand: HAND.hold,
    fhx: 16,
    fhy: 62,
    fw: -80,
    fA: 1,
  })
  // «…я тебе вітаю!» — він піднімає чашку за неї
  M.to(a + 0.4, a + 1.4, { nhx: 46, nhy: -8, fFront: 0, fHand: HAND.relaxed, fhx: 4, fhy: 104, fA: 0, fw: 0, ...FACE.beam, head: -3 }, ease.inOutCubic)
  M.to(a + 3.0, e('c2-1') + 0.4, { nhx: 30, nhy: 50, ...FACE.warm, head: 0 })
  W.to(a + 0.8, a + 1.6, { ...FACE.beam, lookX: 0.8 })
  // «Миру, радості…» — вона ставить букет на підвіконня, торкається квітів
  W.to(b - 0.2, b + 1.0, { nhx: 44, nhy: 76, lean: 6, lookY: 0.5, head: 8 }, ease.inOutCubic)
  W.set(b + 1.02, { propN: 0, nHand: HAND.open })
  W.to(b + 1.1, b + 2.0, { nhx: 40, nhy: 48, nw: -150, lean: 2, ...FACE.warm, blush: 0.25 })
  W.to(b + 2.6, e('c2-2'), { nHand: HAND.rest, nhx: 22, nhy: 34, nw: -160, lookY: 0, lookX: 0.7, head: -2, ...FACE.beam })
  // «Хай тобі вертається…» — обидва дивляться одне на одного через вулицю
  M.to(c, c + 1.0, { lookX: 0.8, head: -2, smile: 0.9 })
  W.to(c + 0.3, c + 1.2, { nhx: 24, nhy: 60, nHand: HAND.relaxed, smile: 0.95 })
  // «…сонячно було» — тиха радість
  W.to(d, d + 1.2, { ...FACE.relief, eye: 0.85, smile: 0.85, head: 2 })
  M.to(d + 0.3, d + 1.4, { ...FACE.relief, eye: 0.85, smile: 0.85, head: 2 })

  const both = layout === 'wide' ? rc(0, -480, 2300, 1100) : rc(-10, -880, 1000, 1500)
  const herC = rc(g.herWin.x + g.herWin.w / 2, g.herWin.y + g.herWin.h / 2 - 10, layout === 'wide' ? 760 : 560, layout === 'wide' ? 520 : 760)
  const cam = new CamTrack(layout === 'wide' ? rc(-100, -520, 1700, 860) : rc(-100, -900, 820, 1240))
  cam.to(a - 1.6, a + 2.4, both, ease.inOutSine)
  cam.to(b - 0.6, b + 1.6, herC, ease.inOutCubic)
  cam.to(c - 0.3, c + 2.2, layout === 'wide' ? rc(-40, -540, 1900, 940) : rc(-60, -900, 900, 1320), ease.inOutCubic)
  cam.to(d - 0.2, end, both, ease.inOutSine)
  cam.to(end + 0.2, end + 3, layout === 'wide' ? rc(0, -260, 2400, 1150) : rc(0, -500, 1000, 1500), ease.inCubic)

  return {
    W,
    M,
    cam,
    g,
    thread: (t: number) => smoothstep(a - 1.6, a + 0.6, t),
    sparks: (t: number) => windowEnv(t, c - 0.2, end + 1.5, 1, 1),
    sunny: (t: number) => smoothstep(d - 0.2, d + 3.2, t),
    windowsOn: (t: number, i: number) => smoothstep(d + i * 0.45, d + i * 0.45 + 0.6, t),
  }
}

export function WindowsScene({ layout, register }: { layout: Layout; register: RegisterScene }) {
  const tl = useTimeline()
  const p = useMemo(() => plan(tl, layout), [tl, layout])
  const g = p.g
  const woman = useRef<CharacterHandle>(null)
  const man = useRef<CharacterHandle>(null)
  const thread = useRef<FxHandle>(null)
  const dots = useRef<DotLayerHandle>(null)
  const leaves = useRef<LeafFieldHandle>(null)
  const motes = useRef<MoteLayerHandle>(null)
  const sunny = useRef<FxHandle>(null)
  const herWins = useRef<(SVGRectElement | null)[]>([])
  const sill = useRef<SVGGElement>(null)

  const hw = g.herWin
  const mw = g.hisWin
  // інші вікна її будинку (засвічуються на «сонячно було»)
  const otherWins = useMemo(() => {
    const out: { x: number; y: number }[] = []
    const H = g.herHouse
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const x = H.x + 60 + c * ((H.w - 120) / 3) + 20
        const y = H.top + 120 + r * 260
        if (Math.abs(x - hw.x) < 120 && Math.abs(y - hw.y) < 150) continue
        if (y > -160) continue
        out.push({ x, y })
      }
    return out
  }, [g, hw])

  // нитка між вікнами нерухома — малюється один раз, змінюється лише прозорість шару
  const th = useMemo(() => {
    const ax = hw.x + hw.w * 0.6
    const ay = hw.y + hw.h * 0.35
    const bx = mw.x + mw.w * 0.4
    const by = mw.y + mw.h * 0.35
    const lift = layout === 'wide' ? 360 : 200
    const c1 = [ax + (bx - ax) * 0.25, Math.min(ay, by) - lift]
    const c2 = [ax + (bx - ax) * 0.75, Math.min(ay, by) - lift]
    const x0 = Math.min(ax, bx) - 40
    const y0 = Math.min(ay, by) - lift - 40
    return {
      ax,
      ay,
      bx,
      by,
      c1,
      c2,
      d: `M${ax} ${ay}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${bx} ${by}`,
      box: { x: x0, y: y0, w: Math.abs(bx - ax) + 80, h: Math.max(ay, by) - y0 + 40 },
    }
  }, [hw, mw, layout])

  const view = useCallback((t: number, scr: Screen): ViewBox => cameraViewBox(p.cam.at(t), scr), [p])
  const update = useCallback(
    (ctx: FrameCtx) => {
      const t = ctx.t
      const wp = p.W.pose(t)
      if (ctx.heavy) {
        woman.current?.apply(wp, t)
        man.current?.apply(p.M.pose(t), t)
        herWins.current.forEach((el, i) => setOpacity(el, 0.15 + 0.85 * p.windowsOn(t, i)))
        setDisplay(sill.current, !(wp.propN > 0.5))
      }
      leaves.current?.update(t, 1, 0.2)
      motes.current?.update(t, 0.8)
      const tv = p.thread(t)
      thread.current?.opacity(tv)
      const sp = p.sparks(t)
      const { ax, ay, bx, by, c1, c2 } = th
      for (let i = 0; i < DOTS; i++) {
        const base = (i / DOTS + t * 0.12) % 1
        const u = 1 - base // від його вікна до її
        const v = 1 - u
        const x = v * v * v * ax + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * bx
        const y = v * v * v * ay + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * by
        dots.current?.set(i, x, y, Math.max(0.25 * tv, sp) * Math.sin(base * Math.PI))
      }
      sunny.current?.opacity(p.sunny(t))
    },
    [p, th],
  )

  const hx = g.herHouse.x + g.herHouse.w / 2
  const hy = g.herHouse.top + 520
  const srx = g.herHouse.w * 1.1
  return (
    <SceneFrame id="windows" label="Вечірня вулиця: два теплих вікна навпроти" register={register} view={view} update={update}>
      <WorldSvg>
        <defs>
          <linearGradient id="wn-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d2a44" />
            <stop offset="0.6" stopColor="#3b4a66" />
            <stop offset="0.85" stopColor="#8c6a6e" />
            <stop offset="1" stopColor="#d79a74" />
          </linearGradient>
          <linearGradient id="wn-room" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd796" />
            <stop offset="1" stopColor="#e8a25c" />
          </linearGradient>
          <radialGradient id="wn-winglow">
            <stop offset="0" stopColor="#ffd38a" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffd38a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x={-4000} y={-4000} width={8000} height={4000} fill="url(#wn-sky)" />
        <circle cx={layout === 'wide' ? 120 : 260} cy={layout === 'wide' ? -1080 : -1880} r={34} fill="#f7ecd6" opacity={0.92} />
        <circle cx={layout === 'wide' ? 120 : 260} cy={layout === 'wide' ? -1080 : -1880} r={90} fill="#f7ecd6" opacity={0.08} />
        <g fill="#2b3550" opacity={0.6}>
          <ellipse cx={-400} cy={-1180} rx={220} ry={30} />
          <ellipse cx={600} cy={-1240} rx={260} ry={34} />
        </g>
        {/* далекі дахи */}
        <path d="M-4000 -420 L-1600 -420 L-1500 -560 L-1300 -560 L-1240 -460 L-1200 -460 L-1200 -700 L-1150 -700 L-1150 -460 L1250 -460 L1300 -620 L1500 -620 L1560 -480 L4000 -480 V0 H-4000 Z" fill="#2a3047" />
        {/* її будинок */}
        <House x={g.herHouse.x} top={g.herHouse.top} w={g.herHouse.w} color="#c98f6e" roof="#7a3f2e" />
        {otherWins.map((w, i) => (
          <g key={i}>
            <rect x={w.x} y={w.y} width={100} height={140} fill="#2c2a3c" />
            <rect ref={(n) => void (herWins.current[i] = n)} x={w.x} y={w.y} width={100} height={140} fill="url(#wn-room)" opacity={0.15} />
            <path d={`M${w.x + 50} ${w.y} v140 M${w.x} ${w.y + 60} h100`} stroke="#e8d6bd" strokeWidth={6} />
          </g>
        ))}
        {/* його будинок */}
        <House x={g.hisHouse.x} top={g.hisHouse.top} w={g.hisHouse.w} color="#8a9a8c" roof="#3e4a52" />
        {Array.from({ length: 4 }, (_, i) => {
          const x = g.hisHouse.x + 80 + (i % 2) * 380
          const y = g.hisHouse.top + 140 + Math.floor(i / 2) * 300
          if (Math.abs(x - mw.x) < 140 && Math.abs(y - mw.y) < 160) return null
          return (
            <g key={i}>
              <rect x={x} y={y} width={100} height={140} fill="#2c2a3c" />
              <rect x={x} y={y} width={100} height={140} fill="url(#wn-room)" opacity={i % 3 === 0 ? 0.5 : 0.12} />
              <path d={`M${x + 50} ${y} v140 M${x} ${y + 60} h100`} stroke="#d9dccf" strokeWidth={6} />
            </g>
          )
        })}

        {/* сяйво вікон */}
        <ellipse cx={hw.x + hw.w / 2} cy={hw.y + hw.h / 2} rx={hw.w * 1.6} ry={hw.h * 1.3} fill="url(#wn-winglow)" />
        <ellipse cx={mw.x + mw.w / 2} cy={mw.y + mw.h / 2} rx={mw.w * 1.6} ry={mw.h * 1.3} fill="url(#wn-winglow)" />
        {/* кімнати за вікнами */}
        <rect x={hw.x + 10} y={hw.y + 10} width={hw.w - 20} height={hw.h - 20} fill="url(#wn-room)" />
        <rect x={hw.x + hw.w * 0.1} y={hw.y + 30} width={60} height={70} fill="#d9a46a" opacity={0.6} />
        <rect x={mw.x + 10} y={mw.y + 10} width={mw.w - 20} height={mw.h - 20} fill="url(#wn-room)" />
        <path d={`M${mw.x + mw.w * 0.75} ${mw.y + 40} v120 M${mw.x + mw.w * 0.75 - 18} ${mw.y + 40} h36`} stroke="#c98a4a" strokeWidth={6} opacity={0.5} />
      </WorldSvg>
      {/* герої у своїх вікнах — власний шар */}
      <WorldSvg layer>
        <defs>
          <clipPath id="wn-herclip">
            <rect x={hw.x + 10} y={hw.y + 10} width={hw.w - 20} height={hw.h - 20} />
          </clipPath>
          <clipPath id="wn-hisclip">
            <rect x={mw.x + 10} y={mw.y + 10} width={mw.w - 20} height={mw.h - 20} />
          </clipPath>
        </defs>
        <g clipPath="url(#wn-herclip)">
          <Character ref={woman} body={WOMAN} look={VITA_LOOK} outfit={W_HOME} seed={7} shadow={0} />
        </g>
        <g clipPath="url(#wn-hisclip)">
          <Character ref={man} body={MAN} look={SERHII_LOOK} outfit={M_HOME} seed={8} shadow={0} />
        </g>
      </WorldSvg>
      <WorldSvg>
        <WindowFrame x={hw.x} y={hw.y} w={hw.w} h={hw.h} />
        {/* букет у вазі на підвіконні (з’являється, коли вона його ставить) */}
        <g ref={sill} style={{ display: 'none' }}>
          <g transform={`translate(${hw.x + hw.w * 0.72} ${hw.y + hw.h - 4}) scale(0.62)`}>
            <path d="M-18 0 C-24 -20 -22 -44 -12 -56 H12 C22 -44 24 -20 18 0 Z" fill="#cfe0de" opacity={0.9} />
            <circle cx={-10} cy={-80} r={14} fill="#f7ead8" />
            <circle cx={10} cy={-88} r={13} fill="#ecb7b0" />
            <circle cx={2} cy={-66} r={11} fill="#f4d9d0" />
            <circle cx={22} cy={-68} r={8} fill="#b9a0c9" />
            <g fill="#b8322e">
              <circle cx={-24} cy={-94} r={3.5} />
              <circle cx={-20} cy={-99} r={3.5} />
            </g>
          </g>
        </g>
        <WindowFrame x={mw.x} y={mw.y} w={mw.w} h={mw.h} />
      </WorldSvg>

      {/* «у домі сонячно» — окремий шар, розгоряється прозорістю */}
      <FxLayer ref={sunny} bounds={{ x: hx - srx, y: hy - 760, w: srx * 2, h: 1520 }} initialOpacity={0}>
        <defs>
          <radialGradient id="wn-sunny">
            <stop offset="0" stopColor="#ffd78a" stopOpacity="0.85" />
            <stop offset="0.5" stopColor="#ffbe6a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffbe6a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={hx} cy={hy} rx={srx} ry={760} fill="url(#wn-sunny)" />
      </FxLayer>

      {/* вулиця, дерево, ліхтар */}
      <WorldSvg>
        <rect x={-4000} y={-40} width={8000} height={3000} fill="#3a3540" />
        <rect x={-4000} y={-40} width={8000} height={16} fill="#57505c" />
        <AutumnTree x={layout === 'wide' ? -60 : 0} y={-20} s={layout === 'wide' ? 1.55 : 1.2} seed={14} palette={['#a8672e', '#94582a', '#b9783a', '#7d4a26']} trunk="#2e2019" />
        <StreetLamp x={layout === 'wide' ? 230 : 300} y={-30} s={1.5} />
      </WorldSvg>
      <LeafLayer ref={leaves} count={16} area={{ x: -1300, y: -1100, w: 2600, h: 1100 }} seed={23} scale={1.6} speed={0.5} colors={STREET_LEAVES} />
      <MoteLayer ref={motes} count={18} area={{ x: -600, y: -1000, w: 1200, h: 900 }} seed={29} color="#ffe2a0" size={2.6} />

      {/* нитка світла між вікнами */}
      <FxLayer ref={thread} bounds={th.box} initialOpacity={0}>
        <defs>
          <linearGradient id="wn-thread" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffe6b0" />
            <stop offset="0.5" stopColor="#fff4da" />
            <stop offset="1" stopColor="#ffe6b0" />
          </linearGradient>
        </defs>
        <path d={th.d} fill="none" stroke="#ffd98f" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
        <path d={th.d} fill="none" stroke="url(#wn-thread)" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      </FxLayer>
      <DotLayer ref={dots} count={DOTS} box={th.box} r={5} color="#fff1cf" />
    </SceneFrame>
  )
}

const DOTS = 12
const STREET_LEAVES = ['#e2a640', '#d9822b', '#c4683a', '#e8c46a']

function House({ x, top, w, color, roof }: { x: number; top: number; w: number; color: string; roof: string }) {
  return (
    <g>
      <rect x={x} y={top} width={w} height={-top} fill={color} />
      <rect x={x} y={top} width={w} height={-top} fill="#1b1f33" opacity={0.42} />
      <path d={`M${x - 30} ${top} L${x + w / 2} ${top - 200} L${x + w + 30} ${top} Z`} fill={roof} />
      <path d={`M${x - 30} ${top} H${x + w + 30} v16 H${x - 30} Z`} fill="#1b1f33" opacity={0.6} />
      <rect x={x + w / 2 - 60} y={-200} width={120} height={200} fill="#3a2a24" />
      <circle cx={x + w / 2 + 40} cy={-100} r={5} fill="#e2c08a" />
      <path d={`M${x + w / 2 - 80} -210 h160 v-14 h-160 Z`} fill="#1b1f33" opacity={0.5} />
    </g>
  )
}

function WindowFrame({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <path d={`M${x} ${y}h${w}v${h}h${-w}Z M${x + 10} ${y + 10}v${h - 20}h${w - 20}v${-(h - 20)}Z`} fill="#efe2cc" fillRule="evenodd" />
      <rect x={x + w / 2 - 4} y={y + 10} width={8} height={h * 0.38} fill="#efe2cc" />
      <rect x={x + 10} y={y + h * 0.38} width={w - 20} height={7} fill="#efe2cc" />
      <path d={`M${x - 20} ${y + h} h${w + 40} l-8 14 h${-w - 24} Z`} fill="#d9c7a8" />
    </g>
  )
}

