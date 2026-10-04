import { useCallback, useMemo, useRef } from 'react'
import { Leaf, type LeafFieldHandle } from '../art/common'
import { LeafLayer, MoteLayer, type MoteLayerHandle } from '../art/particles'
import { DayView, RoomWindow } from '../art/room'
import { SITE } from '../config/site'
import { clamp, ease, lerp, smoothstep } from '../engine/math'
import { CamTrack, cameraViewBox, rc } from '../stage/camera'
import { FxLayer, SceneFrame, WorldSvg, type FxHandle, type ViewBox } from '../stage/layers'
import { setDisplay, setOpacity, setSvgAttribute as attr } from '../stage/svgAttributes'
import type { FrameCtx, Layout, RegisterScene, Screen } from '../stage/types'
import { useTimeline } from '../stage/useTimeline'
import type { Timeline } from '../story/timeline'
import { pick, ROOM_WINDOW } from './shared'

/**
 * ВСТУП — альбом на столі в теплому світлі. Обкладинка відкривається, на лівій сторінці — назва історії,
 * на правій — ілюстрація шкільного вікна. Камера наїжджає в ілюстрацію, і вона стає справжнім вікном класу.
 */
const BW = 340 // ширина сторінки
const BH = 440 // висота сторінки
// намальоване вікно на правій сторінці (масштаб k від справжнього вікна класу)
const K = 0.44
const PW = { cx: BW / 2, cy: -BH / 2 + 205, w: ROOM_WINDOW.w * K, h: ROOM_WINDOW.h * K }
// перенесення координат «справжнього» вікна класу на мініатюру на сторінці
const PAGE_TX = PW.cx - (ROOM_WINDOW.x + ROOM_WINDOW.w / 2) * K
const PAGE_TY = PW.cy - (ROOM_WINDOW.y + ROOM_WINDOW.h / 2) * K
const PAGE_TR = `translate(${PAGE_TX} ${PAGE_TY}) scale(${K})`
const pageBox = (x: number, y: number, w: number, h: number) => ({ x: PAGE_TX + x * K, y: PAGE_TY + y * K, w: w * K, h: h * K })

function plan(tl: Timeline, layout: Layout) {
  const v1 = tl.s('v1-1')
  const zoomEnd = v1 - 0.6
  // кадр 0: альбом праворуч/знизу — місце для тексту стартового екрана
  const cam = new CamTrack(pick(layout, rc(-60, -10, 1500, 820), rc(BW / 2, -90, 760, 1100)))
  cam.to(0.3, 4.2, pick(layout, rc(20, -10, 1080, 640), rc(40, -30, 820, 980)), ease.inOutCubic)
  cam.to(4.4, zoomEnd - 3.2, pick(layout, rc(PW.cx - 40, PW.cy - 10, 640, 470), rc(PW.cx - 10, PW.cy, 500, 640)), ease.inOutSine)
  // фінальний кадр: намальоване вікно займає те саме місце на екрані, що й справжнє вікно в першому кадрі класу
  cam.to(zoomEnd - 3.0, zoomEnd, pick(layout, rc(PW.cx, PW.cy, PW.w * (560 / 480), PW.h * (660 / 570)), rc(PW.cx, PW.cy, PW.w * (520 / 480), PW.h * (760 / 570))), ease.inOutCubic)
  return {
    cam,
    cover: (t: number) => ease.inOutCubic(clamp((t - 0.7) / 2.6)),
    title: (t: number) => smoothstep(2.6, 4.4, t) * (1 - smoothstep(zoomEnd - 3.2, zoomEnd - 1.8, t)),
    paperVeil: (t: number) => 1 - smoothstep(zoomEnd - 2.4, zoomEnd - 0.2, t),
    glow: (t: number) => 0.55 + 0.45 * smoothstep(0.5, 3.5, t),
  }
}

export function BookScene({ layout, register }: { layout: Layout; register: RegisterScene }) {
  const tl = useTimeline()
  const p = useMemo(() => plan(tl, layout), [tl, layout])
  const cover = useRef<SVGPathElement>(null)
  const coverOut = useRef<SVGGElement>(null)
  const coverIn = useRef<SVGGElement>(null)
  const title = useRef<SVGGElement>(null)
  const veil = useRef<SVGRectElement>(null)
  const sun = useRef<FxHandle>(null)
  const leaves = useRef<LeafFieldHandle>(null)
  const pageLeaves = useRef<LeafFieldHandle>(null)
  const motes = useRef<MoteLayerHandle>(null)
  const steam1 = useRef<SVGPathElement>(null)
  const steam2 = useRef<SVGPathElement>(null)
  const shadow = useRef<SVGRectElement>(null)

  // кадр камери: окрема функція — шар сцени растеризується один раз, а камера рухає готовий растр
  const view = useCallback(
    (t: number, scr: Screen): ViewBox => {
      let vb = cameraViewBox(p.cam.at(t), scr)
      if (scr.layout === 'tall') {
        // на вузькому екрані до старту альбом лежить нижче, під текстом привітання
        const H = scr.h
        const Wd = scr.w
        const s0 = Math.min(H * 0.27, ((Wd * 0.62) / BW) * BH) / BH
        const intro: ViewBox = [BW / 2 - Wd / 2 / s0, -(H * 0.77) / s0, Wd / s0, H / s0]
        const k = ease.inOutCubic(clamp((t - 0.3) / 3.0))
        vb = intro.map((v, i) => lerp(v, vb[i], k)) as ViewBox
      }
      return vb
    },
    [p],
  )
  const update = useCallback(
    (ctx: FrameCtx) => {
        const t = ctx.t
        const o = p.cover(t)
        // обкладинка: вільний край рухається від x=BW до x=-BW, з легкою перспективою
        const xe = BW * Math.cos(o * Math.PI)
        const lift = 26 * Math.sin(o * Math.PI)
        const y0 = -BH / 2
        const y1 = BH / 2
        // пишемо в DOM лише змінені значення: після відкриття альбом нерухомий і не перемальовується
        attr(cover.current, 'd', `M0 ${y0} L${xe.toFixed(1)} ${(y0 - lift).toFixed(1)} L${xe.toFixed(1)} ${(y1 + lift * 0.6).toFixed(1)} L0 ${y1} Z`)
        attr(cover.current, 'fill', xe >= 0 ? '#2f5b5d' : '#f3ead9')
        const left = Math.min(0, xe)
        attr(shadow.current, 'x', (left - 14).toFixed(1))
        attr(shadow.current, 'width', (BW - left + 28).toFixed(1))
        setDisplay(coverOut.current, xe > 2)
        attr(coverOut.current, 'transform', `scale(${(xe / BW).toFixed(3)} 1)`)
        setDisplay(coverIn.current, xe < -2)
        attr(coverIn.current, 'transform', `scale(${(-xe / BW).toFixed(3)} 1)`)
        const a = p.title(t)
        setOpacity(title.current, a)
        attr(title.current, 'transform', `translate(${(-BW / 2).toFixed(1)} ${(-40 + (1 - a) * 10).toFixed(2)})`)
        setOpacity(veil.current, 0.32 * p.paperVeil(t))
        sun.current?.opacity(p.glow(t))
        leaves.current?.update(t * 0.6, 1, 0.6)
        pageLeaves.current?.update(t, 1, 0.3)
        motes.current?.update(t, 0.8)
        const ph = t * 1.2
        steam1.current?.setAttribute('d', `M560 -170 c${(-10 + Math.sin(ph) * 6).toFixed(1)} -20 ${(12 + Math.sin(ph + 1) * 6).toFixed(1)} -36 ${(Math.sin(ph * 0.8) * 5).toFixed(1)} -60`)
        steam2.current?.setAttribute('d', `M584 -168 c${(-10 + Math.sin(ph + 2) * 6).toFixed(1)} -20 ${(12 + Math.sin(ph + 3) * 6).toFixed(1)} -36 ${(Math.sin(ph * 0.7 + 1) * 5).toFixed(1)} -60`)
          },
    [p],
  )

  return (
    <SceneFrame id="book" label="Альбом на столі відкривається" register={register} view={view} update={update}>
      <WorldSvg>
      <defs>
        <linearGradient id="bk-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a6a43" />
          <stop offset="0.5" stopColor="#87593a" />
          <stop offset="1" stopColor="#6f4730" />
        </linearGradient>
        <radialGradient id="bk-sun" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#ffe2a6" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#ffcf86" stopOpacity="0.15" />
          <stop offset="1" stopColor="#ffcf86" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bk-page" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e7dcc6" />
          <stop offset="0.08" stopColor="#f6efe2" />
          <stop offset="1" stopColor="#fbf6ec" />
        </linearGradient>
        <linearGradient id="bk-pageL" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#e3d6be" />
          <stop offset="0.1" stopColor="#f4ecdd" />
          <stop offset="1" stopColor="#f9f3e8" />
        </linearGradient>
        <radialGradient id="bk-cup" cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#c08a52" />
          <stop offset="1" stopColor="#8a5a34" />
        </radialGradient>
      </defs>

      {/* стіл */}
      <rect x={-3000} y={-2400} width={6000} height={4800} fill="url(#bk-wood)" />
      <g stroke="#5e3b26" strokeWidth={3} opacity={0.22} fill="none">
        {Array.from({ length: 30 }, (_, i) => (
          <path key={i} d={`M-3000 ${-1500 + i * 110} C-1200 ${-1530 + i * 110} 400 ${-1470 + i * 110} 3000 ${-1510 + i * 110}`} />
        ))}
      </g>
      <g stroke="#3e2618" strokeWidth={6} opacity={0.25}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={-3000} x2={3000} y1={-1650 + i * 330} y2={-1650 + i * 330} />
        ))}
      </g>
      </WorldSvg>
      {/* тіні від рами вікна і тепла пляма сонця — окремий шар: розгоряється лише CSS-прозорістю */}
      <FxLayer ref={sun} bounds={{ x: -1700, y: -1300, w: 3400, h: 2600 }} initialOpacity={0.55}>
        <rect x={-3000} y={-2400} width={6000} height={4800} fill="url(#bk-sun)" />
        <g fill="#2a170d" opacity={0.12}>
          <path d="M-1400 -900 L-1250 -900 L200 900 L50 900 Z" />
          <path d="M-700 -900 L-610 -900 L840 900 L750 900 Z" />
        </g>
      </FxLayer>
      <WorldSvg>

      {/* калина і листя на столі */}
      <g transform="translate(-520 -150) rotate(-18)">
        <path d="M0 0 C40 -40 90 -60 150 -70" stroke="#6b4a35" strokeWidth={5} fill="none" strokeLinecap="round" />
        <g fill="#7f9a86">
          <ellipse cx={60} cy={-58} rx={26} ry={13} transform="rotate(-30 60 -58)" />
          <ellipse cx={110} cy={-30} rx={24} ry={12} transform="rotate(20 110 -30)" />
        </g>
        <g fill="#b8322e">
          {[
            [140, -70],
            [152, -60],
            [130, -58],
            [146, -48],
            [160, -74],
            [126, -76],
            [158, -46],
            [136, -44],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={11} />
          ))}
        </g>
        <g fill="#fff" opacity={0.5}>
          <circle cx={137} cy={-74} r={3} />
          <circle cx={149} cy={-64} r={3} />
          <circle cx={127} cy={-62} r={3} />
        </g>
      </g>
      <g transform="translate(-440 230) rotate(30) scale(4)">
        <Leaf kind={0} color="#e2a640" />
      </g>
      <g transform="translate(-300 320) rotate(-60) scale(3.4)">
        <Leaf kind={2} color="#c4683a" />
      </g>
      <g transform="translate(480 300) rotate(80) scale(3.8)">
        <Leaf kind={1} color="#d9822b" />
      </g>
      {/* каштани */}
      <g>
        <ellipse cx={-560} cy={110} rx={30} ry={26} fill="#6b3a20" />
        <ellipse cx={-568} cy={100} rx={14} ry={8} fill="#a8683e" opacity={0.6} />
        <ellipse cx={-500} cy={150} rx={26} ry={24} fill="#5e321c" />
        <ellipse cx={-506} cy={140} rx={11} ry={7} fill="#a8683e" opacity={0.55} />
      </g>

      {/* чашка чаю (вид згори) */}
      <g>
        <ellipse cx={575} cy={-110} rx={92} ry={92} fill="#000" opacity={0.18} />
        <path d="M640 -120 c40 0 50 50 6 54" stroke="#efe3d1" strokeWidth={16} fill="none" />
        <circle cx={570} cy={-120} r={86} fill="#f3e8d8" />
        <circle cx={570} cy={-120} r={70} fill="url(#bk-cup)" />
        <ellipse cx={548} cy={-142} rx={26} ry={12} fill="#fff" opacity={0.18} />
        <circle cx={570} cy={-120} r={86} fill="none" stroke="#c46b45" strokeWidth={5} opacity={0.7} />
        <path ref={steam1} d="M560 -170" stroke="#fffaf0" strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.3} />
        <path ref={steam2} d="M584 -168" stroke="#fffaf0" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.25} />
      </g>
      {/* олівець */}
      <g transform="translate(470 140) rotate(-24)">
        <rect x={-110} y={-7} width={190} height={14} rx={3} fill="#d9b26a" />
        <path d="M80 -7 L104 0 L80 7 Z" fill="#e8d2b0" />
        <path d="M96 -2.4 L104 0 L96 2.4 Z" fill="#3a2a22" />
        <rect x={-120} y={-7} width={14} height={14} rx={3} fill="#c98b8b" />
      </g>

      {/* альбом */}
      <g>
        <rect ref={shadow} x={-14} y={-BH / 2 - 10} width={BW + 28} height={BH + 26} rx={10} fill="#000" opacity={0.22} />
        {/* права сторінка з ілюстрацією вікна */}
        <rect x={0} y={-BH / 2} width={BW} height={BH} fill="url(#bk-page)" />
        <g>
          <rect x={PW.cx - PW.w / 2 - 18} y={PW.cy - PW.h / 2 - 18} width={PW.w + 36} height={PW.h + 46} fill="#efe5d3" />
          <g transform={PAGE_TR}>
            <rect x={ROOM_WINDOW.x - 200} y={ROOM_WINDOW.y - 160} width={ROOM_WINDOW.w + 400} height={ROOM_WINDOW.h + 330} fill="#e9dcc4" />
            <RoomWindow id="bk-win" part="view" x={ROOM_WINDOW.x} y={ROOM_WINDOW.y} w={ROOM_WINDOW.w} h={ROOM_WINDOW.h}>
              <DayView x={ROOM_WINDOW.x} y={ROOM_WINDOW.y} w={ROOM_WINDOW.w} h={ROOM_WINDOW.h} />
            </RoomWindow>
          </g>
        </g>
      </g>
      </WorldSvg>
      {/* листопад у намальованому вікні сторінки — окремий шар */}
      <LeafLayer
        ref={pageLeaves}
        count={14}
        area={pageBox(ROOM_WINDOW.x - 20, ROOM_WINDOW.y, ROOM_WINDOW.w + 40, ROOM_WINDOW.h)}
        clip={pageBox(ROOM_WINDOW.x + 16, ROOM_WINDOW.y + 16, ROOM_WINDOW.w - 32, ROOM_WINDOW.h - 32)}
        seed={4}
        scale={1.25 * K}
        speed={0.9 * K}
        unit={K}
      />
      <WorldSvg>
      <g>
        <g>
          <g transform={PAGE_TR}>
            <RoomWindow id="bk-win" part="frame" x={ROOM_WINDOW.x} y={ROOM_WINDOW.y} w={ROOM_WINDOW.w} h={ROOM_WINDOW.h} />
          </g>
          <rect ref={veil} x={PW.cx - PW.w / 2 - 18} y={PW.cy - PW.h / 2 - 18} width={PW.w + 36} height={PW.h + 46} fill="#f6eedf" opacity={0.32} />
          <text x={PW.cx} y={PW.cy + PW.h / 2 + 64} textAnchor="middle" fontFamily="'Marck Script', cursive" fontSize={22} fill="#8a6a4e" opacity={0.85}>
            осінь за шкільним вікном
          </text>
        </g>
        <rect x={-3} y={-BH / 2} width={6} height={BH} fill="#d6c7ad" />
        {/* обкладинка */}
        <path ref={cover} d="" fill="#2f5b5d" />
        <g ref={coverOut}>
          <rect x={18} y={-BH / 2 + 18} width={BW - 36} height={BH - 36} rx={6} fill="none" stroke="#d9b26a" strokeWidth={2.2} opacity={0.75} />
          <rect x={0} y={-BH / 2} width={18} height={BH} fill="#264b4d" />
          <g transform={`translate(${BW / 2} 0)`} fill="none" stroke="#d9b26a" strokeWidth={2.2} strokeLinecap="round">
            <path d="M0 -60 c-30 24 -40 58 -16 96 c8 12 18 18 22 18 c4 0 14 -6 22 -18 c24 -38 14 -72 -16 -96 Z" opacity={0.9} />
            <path d="M0 -50 V70 M0 -10 l-18 -16 M0 10 l20 -18 M0 30 l-16 -12" opacity={0.85} />
            <ellipse cx={0} cy={0} rx={110} ry={150} opacity={0.4} strokeDasharray="2 10" />
          </g>
        </g>
        <g ref={coverIn} style={{ display: 'none' }}>
          <rect x={-BW} y={-BH / 2} width={BW} height={BH} fill="url(#bk-pageL)" />
          <g ref={title} opacity={0}>
            <text x={0} y={-60} textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontStyle="italic" fontWeight={600} fontSize={48} fill="#5a3a28">
              Тепло
            </text>
            <text x={0} y={-6} textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontStyle="italic" fontWeight={600} fontSize={48} fill="#5a3a28">
              простих розмов
            </text>
            <path d="M-60 26 C-20 18 20 18 60 26" stroke="#c98a5a" strokeWidth={2} fill="none" />
            <g transform="translate(0 64) scale(2.2)">
              <Leaf kind={0} color="#d9a24a" />
            </g>
            <text x={0} y={128} textAnchor="middle" fontFamily="'Marck Script', cursive" fontSize={22} fill="#8a6a4e">
              {SITE.albumDedication}
            </text>
          </g>
        </g>
      </g>

      </WorldSvg>
      <MoteLayer ref={motes} count={22} area={{ x: -900, y: -600, w: 1700, h: 1100 }} seed={11} size={3.2} />
      <LeafLayer ref={leaves} count={7} area={{ x: -1100, y: -900, w: 2200, h: 1700 }} seed={21} scale={3.2} speed={0.55} />
    </SceneFrame>
  )
}

