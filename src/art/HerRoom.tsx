import { useImperativeHandle, useRef, type Ref } from 'react'
import { ArmchairBack } from './furniture'
import { Books, Bookshelf, Curtain, EveningView, PottedPlant, RoomWindow, Rug, SideTable, TableLamp, VaseBouquet, WallClock } from './room'
import { ROOM_WINDOW as WIN } from '../scenes/shared'

/**
 * Затишна кімната героїні (вечір). Використовується у вечірній сцені куплету 1
 * і в розмові телефоном у куплеті 2. Персонаж і передній підлокітник крісла малює сама сцена.
 */
export interface HerRoomState {
  lamp: number
  night: number
  clock: number // хвилини від 0
  cup: boolean
  notebooks: boolean
  cards: number
  vase: boolean
  bloom?: number
}

export interface HerRoomHandle {
  update(s: HerRoomState): void
}

export const HER = {
  chairX: 112,
  chairY: 26,
  chairS: 0.82,
  tableX: 236,
  lampX: 258,
  cupX: 204,
  tableTop: -122,
  boardX: 150,
}

export function HerRoom({ id, ref }: { id: string; ref?: Ref<HerRoomHandle> }) {
  const lamp = useRef<SVGGElement>(null)
  const lampShade = useRef<SVGPathElement>(null)
  const warm = useRef<SVGGElement>(null)
  const cool = useRef<SVGRectElement>(null)
  const night = useRef<SVGRectElement>(null)
  const moon = useRef<SVGGElement>(null)
  const minH = useRef<SVGLineElement>(null)
  const hourH = useRef<SVGLineElement>(null)
  const cup = useRef<SVGGElement>(null)
  const notes = useRef<SVGGElement>(null)
  const cards = useRef<SVGGElement>(null)
  const vase = useRef<SVGGElement>(null)
  const vaseBloom = useRef<SVGGElement>(null)
  useImperativeHandle(ref, () => ({
    update(s: HerRoomState) {
      if (lamp.current) lamp.current.style.opacity = s.lamp.toFixed(3)
      if (lampShade.current) lampShade.current.setAttribute('fill', s.lamp > 0.5 ? '#ffe7b8' : '#e9d4ac')
      if (warm.current) warm.current.style.opacity = (s.lamp * 0.9).toFixed(3)
      if (cool.current) cool.current.style.opacity = (0.26 * (1 - s.lamp * 0.8)).toFixed(3)
      if (night.current) night.current.style.opacity = (s.night * 0.82).toFixed(3)
      if (moon.current) moon.current.setAttribute('transform', `translate(0 ${(-s.night * 40).toFixed(1)})`)
      const m = s.clock
      minH.current?.setAttribute('transform', `rotate(${((m % 60) * 6).toFixed(1)})`)
      hourH.current?.setAttribute('transform', `rotate(${((7 * 60 + m) * 0.5).toFixed(1)})`)
      if (cup.current) cup.current.style.display = s.cup ? '' : 'none'
      if (notes.current) notes.current.style.display = s.notebooks ? '' : 'none'
      if (cards.current) cards.current.style.opacity = s.cards.toFixed(3)
      if (vase.current) vase.current.style.display = s.vase ? '' : 'none'
      if (vaseBloom.current && s.bloom != null) {
        const b = 0.75 + 0.25 * s.bloom
        vaseBloom.current.setAttribute('transform', `translate(0 -70) scale(${b.toFixed(3)}) translate(0 70)`)
      }
    },
  }))
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bea78f" />
          <stop offset="1" stopColor="#cdb79d" />
        </linearGradient>
        <pattern id={`${id}-pat`} width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M28 6 L40 28 L28 50 L16 28 Z" fill="none" stroke="#a88e74" strokeWidth="1.4" opacity="0.5" />
          <circle cx="28" cy="28" r="2.4" fill="#a88e74" opacity="0.5" />
          <circle cx="0" cy="0" r="1.8" fill="#a88e74" opacity="0.45" />
          <circle cx="56" cy="56" r="1.8" fill="#a88e74" opacity="0.45" />
        </pattern>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c5538" />
          <stop offset="1" stopColor="#5b3b27" />
        </linearGradient>
        <radialGradient id={`${id}-warm`}>
          <stop offset="0" stopColor="#ffc979" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#ffb75e" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffb75e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-2400} y={-1800} width={5200} height={1800} fill={`url(#${id}-wall)`} />
      <rect x={-2400} y={-1800} width={5200} height={1800} fill={`url(#${id}-pat)`} />
      <rect x={-2400} y={-24} width={5200} height={24} fill="#8a6a4e" />
      <rect x={-2400} y={0} width={5200} height={1400} fill={`url(#${id}-floor)`} />
      <g stroke="#3e2618" strokeWidth={2} opacity={0.3}>
        {[24, 58, 104, 166, 246, 346, 470].map((yy) => (
          <line key={yy} x1={-2400} x2={2800} y1={yy} y2={yy} />
        ))}
      </g>

      {/* вікно у вечір */}
      <Curtain x={WIN.x - 80} y={WIN.y - 40} h={WIN.h + 90} side="left" color="#c98b8b" shade="#a96d6e" />
      <RoomWindow id={`${id}-win`} x={WIN.x} y={WIN.y} w={WIN.w} h={WIN.h} frame="#ece0cc" frameShade="#cdbb9f">
        <EveningView x={WIN.x} y={WIN.y} w={WIN.w} h={WIN.h} />
        <rect ref={night} x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill="#141c33" opacity={0} />
        <g ref={moon}>
          <circle cx={WIN.x + WIN.w * 0.3} cy={WIN.y + WIN.h * 0.42} r={20} fill="#f7ecd6" opacity={0.9} />
          <circle cx={WIN.x + WIN.w * 0.3 + 8} cy={WIN.y + WIN.h * 0.42 - 5} r={18} fill="#9fb0c6" opacity={0.0} />
        </g>
      </RoomWindow>
      <Curtain x={WIN.x + WIN.w + 80} y={WIN.y - 40} h={WIN.h + 90} side="right" color="#c98b8b" shade="#a96d6e" />
      <rect x={WIN.x - 110} y={WIN.y - 56} width={WIN.w + 220} height={12} rx={6} fill="#8a6a4e" />
      <g ref={vase} style={{ display: 'none' }}>
        <g ref={vaseBloom}>
          <VaseBouquet x={WIN.x + WIN.w - 90} y={WIN.y + WIN.h - 2} s={1.15} />
        </g>
      </g>
      <PottedPlant x={WIN.x + 60} y={WIN.y + WIN.h - 2} s={0.75} />

      {/* годинник */}
      <WallClock x={-20} y={-660} r={44} minRef={minH} hourRef={hourH} />

      {/* дитячі листівки-подяки на корковій дошці */}
      <g>
        <rect x={HER.boardX - 10} y={-610} width={210} height={150} rx={6} fill="#b78b5e" />
        <rect x={HER.boardX - 2} y={-602} width={194} height={134} rx={4} fill="#c99e6e" />
        <g ref={cards} opacity={0}>
          <ellipse cx={HER.boardX + 95} cy={-535} rx={160} ry={110} fill={`url(#${id}-warm)`} />
        </g>
        <g transform={`translate(${HER.boardX + 18} -592) rotate(-5)`}>
          <rect width={58} height={70} fill="#fff8ea" />
          <circle cx={29} cy={26} r={12} fill="#f2b84a" />
          <path d="M14 54 Q29 44 44 54" stroke="#c46b45" strokeWidth={3} fill="none" />
        </g>
        <g transform={`translate(${HER.boardX + 84} -596) rotate(4)`}>
          <rect width={52} height={64} fill="#f2faf2" />
          <path d="M26 54 V30" stroke="#6f8f68" strokeWidth={2.4} />
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse key={i} cx={26} cy={18} rx={4} ry={8} fill="#c98bb9" transform={`rotate(${i * 60} 26 26)`} />
          ))}
          <circle cx={26} cy={26} r={4} fill="#f2c25e" />
        </g>
        <g transform={`translate(${HER.boardX + 140} -588) rotate(-3)`}>
          <rect width={46} height={60} fill="#fff3e8" />
          <path d="M8 46 C2 30 16 14 34 16 C36 32 24 44 8 46 Z" fill="#e2a640" />
        </g>
        <g transform={`translate(${HER.boardX + 40} -530) rotate(3)`}>
          <rect width={110} height={52} fill="#fdf1dd" />
          <text x={55} y={32} textAnchor="middle" fontFamily="'Marck Script', cursive" fontSize={20} fill="#c46b45">
            Дякуємо!
          </text>
        </g>
      </g>

      {/* книжкова шафа */}
      <Bookshelf x={420} y={-760} w={240} h={740} />
      <Books x={438} y={-760} s={0.7} colors={['#d9b26a', '#7f9a86', '#c46b45', '#8e6d8c', '#2f5b5d']} />

      {/* килим, крісло, столик, лампа */}
      <Rug x={HER.chairX + 30} y={70} w={620} h={96} />
      <ArmchairBack x={HER.chairX} y={HER.chairY} s={HER.chairS} />
      <SideTable x={HER.tableX} y={0} s={0.95} />
      <g ref={notes} style={{ display: 'none' }}>
        <rect x={HER.tableX - 52} y={HER.tableTop - 8} width={64} height={8} fill="#7f9a86" />
        <rect x={HER.tableX - 50} y={HER.tableTop - 15} width={64} height={7} fill="#c46b45" />
        <rect x={HER.tableX - 48} y={HER.tableTop - 22} width={64} height={7} fill="#efe2cf" />
      </g>
      <g ref={cup}>
        <path d={`M${HER.cupX - 13} ${HER.tableTop - 2} h26`} stroke="#d9c8b1" strokeWidth={4} strokeLinecap="round" />
        <path d={`M${HER.cupX - 8} ${HER.tableTop - 18} h16 l-1.4 14 c-0.3 2 -1.8 3 -3.6 3 h-6 c-1.8 0 -3.3 -1 -3.6 -3 Z`} fill="#f3e8d8" />
        <path d={`M${HER.cupX - 7.6} ${HER.tableTop - 11} h15.2 l-0.3 2.6 h-14.6 Z`} fill="#c46b45" opacity={0.85} />
        <path d={`M${HER.cupX + 8} ${HER.tableTop - 14} c5 0 6 7 0.6 8.4`} fill="none" stroke="#efe3d1" strokeWidth={2.4} />
      </g>
      <TableLamp x={HER.lampX} y={HER.tableTop} s={1} glowRef={lamp} shadeRef={lampShade} />

      {/* загальне освітлення: прохолодний вечір → тепло лампи */}
      <rect ref={cool} x={-2400} y={-1800} width={5200} height={3200} fill="#33405e" opacity={0.26} />
      <g ref={warm} opacity={0}>
        <ellipse cx={HER.lampX} cy={-240} rx={900} ry={700} fill={`url(#${id}-warm)`} />
      </g>
    </g>
  )
}
