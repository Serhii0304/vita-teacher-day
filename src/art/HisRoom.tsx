import { useId, useImperativeHandle, useRef, type Ref } from 'react'
import { ArmchairBack } from './furniture'
import { Books, Curtain, EveningView, PottedPlant, RoomWindow, Rug, SideTable, WallClock } from './room'

/**
 * Кімната героя (вечір). Композиція дзеркальна до кімнати героїні — він сидить у кріслі,
 * повернутий вліво (до неї через «лінію світла»). Гітара біля стіни — натяк, що пісню написав він.
 */
export const HIS = {
  chairX: -112,
  chairY: 26,
  chairS: 0.86,
  tableX: -238,
  lampX: -262,
  cupX: -206,
  tableTop: -122,
  win: { x: 250, y: -800, w: 470, h: 560 },
}

export interface HisRoomState {
  lamp: number
  night: number
  clock: number
  cup: boolean
  cloud: number
}

export interface HisRoomHandle {
  update(s: HisRoomState): void
}

export function HisRoom({ ref }: { ref?: Ref<HisRoomHandle> }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const lamp = useRef<SVGGElement>(null)
  const warm = useRef<SVGGElement>(null)
  const cool = useRef<SVGRectElement>(null)
  const night = useRef<SVGRectElement>(null)
  const minH = useRef<SVGLineElement>(null)
  const hourH = useRef<SVGLineElement>(null)
  const cup = useRef<SVGGElement>(null)
  const clouds = useRef<SVGGElement>(null)
  const W = HIS.win
  useImperativeHandle(ref, () => ({
    update(s: HisRoomState) {
      if (lamp.current) lamp.current.style.opacity = s.lamp.toFixed(3)
      if (warm.current) warm.current.style.opacity = (s.lamp * 0.9).toFixed(3)
      if (cool.current) cool.current.style.opacity = (0.34 * (1 - s.lamp * 0.8)).toFixed(3)
      if (night.current) night.current.style.opacity = (s.night * 0.82).toFixed(3)
      minH.current?.setAttribute('transform', `rotate(${((s.clock % 60) * 6).toFixed(1)})`)
      hourH.current?.setAttribute('transform', `rotate(${((7 * 60 + s.clock) * 0.5).toFixed(1)})`)
      if (cup.current) cup.current.style.display = s.cup ? '' : 'none'
      if (clouds.current) clouds.current.setAttribute('transform', `translate(${(s.cloud * 600 - 300).toFixed(1)} 0)`)
    },
  }))
  return (
    <g>
      <defs>
        <linearGradient id={`hr-wall-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6c7f76" />
          <stop offset="1" stopColor="#7d8f84" />
        </linearGradient>
        <linearGradient id={`hr-floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a5236" />
          <stop offset="1" stopColor="#57391f" />
        </linearGradient>
        <radialGradient id={`hr-warm-${uid}`}>
          <stop offset="0" stopColor="#ffc979" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#ffb75e" stopOpacity="0.2" />
          <stop offset="1" stopColor="#ffb75e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`hr-lamp-${uid}`}>
          <stop offset="0" stopColor="#ffdc96" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#ffc56a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffb44f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-2600} y={-1800} width={5200} height={1800} fill={`url(#hr-wall-${uid})`} />
      {/* вертикальні панелі стіни */}
      <g stroke="#5d7067" strokeWidth={3} opacity={0.5}>
        {Array.from({ length: 50 }, (_, i) => (
          <line key={i} x1={-2600 + i * 110} x2={-2600 + i * 110} y1={-420} y2={0} />
        ))}
      </g>
      <rect x={-2600} y={-430} width={5200} height={12} fill="#5d7067" />
      <rect x={-2600} y={-24} width={5200} height={24} fill="#4f3a2a" />
      <rect x={-2600} y={0} width={5200} height={1400} fill={`url(#hr-floor-${uid})`} />

      {/* вікно з хмаринками */}
      <Curtain x={W.x - 80} y={W.y - 40} h={W.h + 90} side="left" color="#d4a24c" shade="#b5862f" />
      <RoomWindow id={`hw-${uid}`} x={W.x} y={W.y} w={W.w} h={W.h} frame="#e9e2d2" frameShade="#c9bfa9">
        <EveningView x={W.x} y={W.y} w={W.w} h={W.h} />
        <g ref={clouds} opacity={0.75}>
          <ellipse cx={W.x + 120} cy={W.y + 120} rx={70} ry={20} fill="#e9c9b8" />
          <ellipse cx={W.x + 160} cy={W.y + 108} rx={46} ry={18} fill="#f1d6c4" />
          <ellipse cx={W.x + 330} cy={W.y + 190} rx={60} ry={16} fill="#d9b8ad" />
        </g>
        <rect ref={night} x={W.x} y={W.y} width={W.w} height={W.h} fill="#141c33" opacity={0} />
        <circle cx={W.x + W.w * 0.7} cy={W.y + W.h * 0.3} r={18} fill="#f7ecd6" opacity={0.85} />
      </RoomWindow>
      <Curtain x={W.x + W.w + 80} y={W.y - 40} h={W.h + 90} side="right" color="#d4a24c" shade="#b5862f" />
      <rect x={W.x - 110} y={W.y - 56} width={W.w + 220} height={12} rx={6} fill="#4f3a2a" />
      <PottedPlant x={W.x + W.w - 70} y={W.y + W.h - 2} s={0.8} />

      {/* полиця з книжками і годинник */}
      <rect x={-640} y={-520} width={300} height={12} fill="#8a5d3b" />
      <Books x={-626} y={-520} s={0.9} colors={['#c46b45', '#d9b26a', '#2f5b5d', '#7f9a86', '#b8935f']} />
      <WallClock x={-470} y={-680} r={42} minRef={minH} hourRef={hourH} />
      {/* картина-пейзаж (гори і море) */}
      <g>
        <rect x={-330} y={-720} width={220} height={150} fill="#b8935f" />
        <rect x={-320} y={-710} width={200} height={130} fill="#cfdde0" />
        <path d="M-320 -620 L-270 -670 L-230 -640 L-190 -680 L-120 -620 V-580 H-320 Z" fill="#7f9a86" />
        <rect x={-320} y={-610} width={200} height={30} fill="#6d93a3" />
        <circle cx={-160} cy={-690} r={10} fill="#f2c27a" />
      </g>
      {/* гітара біля стіни */}
      <g transform="translate(140 0) rotate(-8)">
        <path d="M-6 -380 h12 v220 h-12 Z" fill="#5a3a28" />
        <rect x={-10} y={-410} width={20} height={36} rx={4} fill="#3e2618" />
        <path d="M0 -170 C-44 -170 -50 -120 -36 -100 C-58 -80 -62 -20 -30 0 C-12 10 12 10 30 0 C62 -20 58 -80 36 -100 C50 -120 44 -170 0 -170 Z" fill="#c98a4a" />
        <path d="M0 -170 C-44 -170 -50 -120 -36 -100 C-58 -80 -62 -20 -30 0 C-20 6 -10 8 0 8 Z" fill="#b5763a" opacity={0.6} />
        <circle cx={0} cy={-90} r={14} fill="#3e2618" />
        <rect x={-14} y={-38} width={28} height={7} rx={2} fill="#3e2618" />
        <g stroke="#f4e6c8" strokeWidth={0.8} opacity={0.8}>
          <line x1={-3} y1={-400} x2={-3} y2={-34} />
          <line x1={0} y1={-400} x2={0} y2={-34} />
          <line x1={3} y1={-400} x2={3} y2={-34} />
        </g>
      </g>

      <Rug x={HIS.chairX - 30} y={70} w={600} h={92} color="#3f5d63" border="#d9b26a" />
      <ArmchairBack x={HIS.chairX} y={HIS.chairY} s={HIS.chairS} flip={-1} c="#7a4a32" d="#5e3524" l="#94603f" />
      <SideTable x={HIS.tableX} y={0} s={0.95} />
      <g ref={cup}>
        <path d={`M${HIS.cupX - 13} ${HIS.tableTop - 2} h26`} stroke="#c9bfa9" strokeWidth={4} strokeLinecap="round" />
        <path d={`M${HIS.cupX - 8} ${HIS.tableTop - 18} h16 l-1.4 14 c-0.3 2 -1.8 3 -3.6 3 h-6 c-1.8 0 -3.3 -1 -3.6 -3 Z`} fill="#e9e2d2" />
        <path d={`M${HIS.cupX - 7.6} ${HIS.tableTop - 11} h15.2 l-0.3 2.6 h-14.6 Z`} fill="#2f5b5d" opacity={0.85} />
      </g>
      {/* лампа з зеленим абажуром */}
      <g transform={`translate(${HIS.lampX} ${HIS.tableTop})`}>
        <g ref={lamp} opacity={0}>
          <ellipse cx={0} cy={-80} rx={440} ry={360} fill={`url(#hr-lamp-${uid})`} />
        </g>
        <path d="M-20 0 h40 v-6 h-40 Z" fill="#b08a4a" />
        <path d="M-2 -6 V-70 M-2 -70 L22 -86" stroke="#b08a4a" strokeWidth={5} strokeLinecap="round" />
        <path d="M2 -78 C10 -104 46 -110 56 -90 L48 -82 C38 -96 18 -94 10 -74 Z" fill="#3f6b58" />
        <path d="M10 -74 C18 -94 38 -96 48 -82" stroke="#ffe7b0" strokeWidth={3} fill="none" opacity={0.8} />
      </g>

      <rect ref={cool} x={-2600} y={-1800} width={5200} height={3200} fill="#2c3a5a" opacity={0.34} />
      <g ref={warm} opacity={0}>
        <ellipse cx={HIS.lampX + 30} cy={-260} rx={900} ry={700} fill={`url(#hr-warm-${uid})`} />
      </g>
    </g>
  )
}
