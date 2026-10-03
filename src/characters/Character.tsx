import { useId, useImperativeHandle, useRef, type ReactNode, type Ref, type RefCallback } from 'react'
import { solveIK } from '../engine/ik'
import { clamp, hash, lerp, noise1 } from '../engine/math'
import type { Params } from '../engine/moves'
import type { BodySpec } from './body'
import {
  browPath,
  eyeShapes,
  faceOutline,
  headGeo,
  mouthShapes,
  noseShapes,
  r,
  smoothPath,
  type FaceParams,
  type FaceStyle,
} from './face'
import type { Outfit, SkinHair } from './palettes'
import { BookProp, BouquetProp, CupProp, NotebooksProp, PhoneProp } from './props'

export interface CharacterHandle {
  apply(p: Params, t: number): void
}

interface Props {
  body: BodySpec
  look: SkinHair
  outfit: Outfit
  /** З якого боку (у локальній системі персонажа) падає основне світло. */
  light?: 'front' | 'back'
  seed?: number
  shadow?: number
  ref?: Ref<CharacterHandle>
}

type Reg = (key: string) => RefCallback<SVGElement>

const BLINK_PERIOD = 4.3

function blinkAt(t: number, seed: number): number {
  const off = seed * 1.7
  const k = Math.floor((t + off) / BLINK_PERIOD)
  const start = k * BLINK_PERIOD - off + 0.4 + hash(k * 7.13 + seed * 3.1) * 2.6
  const d = 0.17
  const x = (t - start) / d
  if (x <= 0 || x >= 1) return 0
  return Math.sin(x * Math.PI)
}

export function Character({ body, look, outfit, light = 'front', seed = 1, shadow = 0.32, ref }: Props) {
  const uid = 'c' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const els = useRef<Record<string, SVGElement>>({})
  const cbs = useRef(new Map<string, RefCallback<SVGElement>>())
  const reg: Reg = (key) => {
    let cb = cbs.current.get(key)
    if (!cb) {
      cb = (node: SVGElement | null) => {
        if (node) els.current[key] = node
        else delete els.current[key]
      }
      cbs.current.set(key, cb)
    }
    return cb
  }
  const id = (name: string) => `${uid}-${name}`
  const url = (name: string) => `url(#${id(name)})`

  const woman = body.kind === 'woman'
  const st: FaceStyle = woman
    ? { kind: 'woman', eyeW: 9.4, eyeH: 3.6, R: 16.2 }
    : { kind: 'man', eyeW: 8.8, eyeH: 3.0, R: 17.2 }
  const lightFront = light === 'front'
  const gx = (a: string, b: string, c: string) => (lightFront ? [a, b, c] : [c, b, a])

  useImperativeHandle(ref, () => ({
    apply(p: Params, t: number) {
      const E = els.current
      const set = (k: string, attr: string, v: string) => {
        const e = E[k]
        if (e) e.setAttribute(attr, v)
      }
      const flip = p.flip >= 0 ? 1 : -1
      set('root', 'transform', `translate(${r(p.x)} ${r(p.y)}) scale(${r(p.sc * flip * 1000) / 1000} ${r(p.sc * 1000) / 1000})`)
      const root = E.root as SVGGElement | undefined
      if (root) root.style.opacity = String(clamp(p.vis))

      // «живі» рухи — функції від часу, тому на паузі завмирають
      const breath = Math.sin((t * Math.PI * 2) / 4.1 + seed) * p.breath
      const idle = p.idle
      const leanIdle = noise1(t * 0.23, seed + 2) * 0.7 * idle
      const headIdle = noise1(t * 0.41, seed + 4) * 1.4 * idle
      const nodOsc = p.nod * 5.5 * Math.max(0, Math.sin((t * Math.PI * 2) / 0.95))

      const P = { x: p.px, y: body.pelvisY + p.py }
      const lean = p.lean + leanIdle

      // ---- ноги (IK, ступні закріплені в системі персонажа) ----
      // стегна в перспективі: сидячи обличчям до глядача стегна «йдуть» на нас і виглядають коротшими
      const kT = 1 - 0.5 * clamp(p.lFS ?? 0)
      const thighL = body.thigh * kT
      const leg = (side: 'N' | 'F', hip: [number, number], fx: number, fy: number, fr: number) => {
        const hx = P.x + hip[0]
        const hy = P.y + hip[1]
        const ax = fx
        const ay = -body.ankle + fy
        const ik = solveIK(hx, hy, ax, ay, thighL, body.shin, -1)
        set(`leg${side}`, 'transform', `translate(${r(hx)} ${r(hy)}) rotate(${r(ik.a)})`)
        set(`thigh${side}`, 'transform', `scale(1 ${r(kT * 1000) / 1000})`)
        set(`knee${side}`, 'transform', `translate(0 ${r(thighL)}) rotate(${r(ik.b)})`)
        set(`foot${side}`, 'transform', `translate(0 ${body.shin}) rotate(${r(fr - ik.bAbs)})`)
        return ik
      }
      const ikLN = leg('N', body.hipN, p.nfx, p.nfy, p.nfr)
      const ikLF = leg('F', body.hipF, p.ffx, p.ffy, p.ffr)

      // ---- спідниця / поли пальта: опукла оболонка навколо стегон і колін ----
      if (outfit.skirt && E.skirt) {
        set('skirt', 'd', skirtPath(P, lean, body, ikLN, ikLF, p, outfit.skirtLen ?? 0.4, woman))
      }

      // ---- корпус ----
      const tc = `translate(${r(P.x)} ${r(P.y)}) rotate(${r(lean)})`
      set('torso', 'transform', tc)
      set('torsoBody', 'transform', `scale(1 ${r((1 + breath * 0.006) * 1000) / 1000})`)
      const hp = body.headPivot
      const headRot = p.head + nodOsc + headIdle
      set('head', 'transform', `translate(${hp[0]} ${r(hp[1] - breath * 0.5)}) rotate(${r(headRot)}) scale(${body.headScale})`)
      set(
        'backHair',
        'transform',
        `${tc} translate(${hp[0]} ${r(hp[1] - breath * 0.5)}) rotate(${r(headRot)}) scale(${body.headScale})`,
      )
      const sway = Math.sin(t * 1.9 + seed) * 1.6 * p.wind + Math.sin(t * 0.7 + seed) * 0.6
      set('backHairSway', 'transform', `rotate(${r(-headRot * 0.18 + sway)} 0 -36)`)
      set('frontLockSway', 'transform', `rotate(${r(-headRot * 0.22 + sway * 1.3)} -14 -18)`)

      // ---- обличчя ----
      const blink = blinkAt(t, seed)
      const fp: FaceParams = {
        turn: clamp(p.turn),
        smile: p.smile,
        open: p.open,
        brow: p.brow,
        browIn: p.browIn,
        eye: p.eye * (1 - blink * 0.96),
        squint: p.squint,
        lookX: p.lookX + noise1(t * 0.9, seed + 9) * 0.07,
        lookY: p.lookY,
      }
      const talkO = p.talk * (0.1 + 0.3 * Math.max(0, Math.sin(t * 12.7 + Math.sin(t * 3.3 + seed) * 1.9)))
      const g = headGeo(fp.turn, st)
      set('cranium', 'cx', String(r(g.cranium.x)))
      set('faceMask', 'd', faceOutline(g, st))
      const sh = (g.s - Math.sin((40 * Math.PI) / 180)) * 9
      set('frontHair', 'transform', `translate(${r(sh)} 0)`)
      set('backHairShift', 'transform', `translate(${r(-sh * 0.35)} 0)`)
      for (const [side, center, w, near] of [
        ['N', g.eyeN, g.wN, true],
        ['F', g.eyeF, g.wF, false],
      ] as const) {
        const e = eyeShapes(center, w, st, fp, near)
        set(`eye${side}`, 'd', e.outline)
        set(`eyeClip${side}`, 'd', e.outline)
        set(`lid${side}`, 'd', e.lid)
        set(`lash${side}`, 'd', e.lash)
        set(`flick${side}`, 'd', e.flicks)
        set(`crease${side}`, 'd', e.crease)
        set(`lower${side}`, 'd', e.lower)
        set(`iris${side}`, 'transform', `translate(${r(e.iris.x)} ${r(e.iris.y)}) scale(${near ? 1 : r(0.78 + 0.22 * (w / st.eyeW))} 1)`)
        set(`brow${side}`, 'd', browPath(center, w, st, fp, near))
      }
      const m = mouthShapes(g, st, fp, p.open + talkO)
      set('mouthUpper', 'd', m.upper)
      set('mouthLower', 'd', m.lower)
      set('mouthInner', 'd', m.inner)
      set('mouthTeeth', 'd', m.teeth)
      set('mouthLine', 'd', m.line)
      set('mouthHi', 'd', m.hi)
      set('dimN', 'd', m.dimN)
      const smileAmt = Math.max(0, p.smile)
      const dim = E.dimN as SVGPathElement | undefined
      if (dim) dim.style.opacity = String(r(clamp((smileAmt - 0.35) * 0.9)))
      const inner = E.mouthInnerG as SVGGElement | undefined
      if (inner) inner.style.display = m.showInner ? '' : 'none'
      const n = noseShapes(g, st)
      set('noseBridge', 'd', n.bridge)
      set('noseNostril', 'd', n.nostril)
      set('noseWing', 'd', n.wing)
      set('noseTip', 'd', n.tip)
      set('noseShade', 'd', n.shade)
      set('noseHl', 'transform', `translate(${r(n.hl.x)} ${r(n.hl.y)})`)
      const bridgeEl = E.noseBridge as SVGPathElement | undefined
      if (bridgeEl) bridgeEl.style.opacity = String(r(0.06 + fp.turn * 0.22))
      set('cheekN', 'transform', `translate(${r(g.cheekN.x)} ${r(g.cheekN.y - smileAmt * 0.9)})`)
      set('cheekF', 'transform', `translate(${r(g.cheekF.x)} ${r(g.cheekF.y - smileAmt * 0.9)}) scale(${r(0.5 + 0.5 * Math.cos(g.th + 0.75))} 1)`)
      const cheeks = E.cheeks as SVGGElement | undefined
      if (cheeks) cheeks.style.opacity = String(r(clamp(0.22 + smileAmt * 0.32 + p.blush * 0.5)))
      set('ear', 'transform', `translate(${r(g.ear.x)} ${r(g.ear.y)})`)
      if (!woman) {
        const folds = E.folds as SVGPathElement | undefined
        set(
          'folds',
          'd',
          `M${r(g.nose.x - 5.4)} ${r(g.nose.y + 0.2)}Q${r(g.mN.x - 3.4)} ${r(g.mouth.y - 1.4)} ${r(g.mN.x - 2.2)} ${r(g.mouth.y + 2.4)}`,
        )
        if (folds) folds.style.opacity = String(r(clamp(smileAmt * 0.5)))
      }
      set('chinShade', 'd', `M${r(g.mN.x - 3)} ${r(g.chin.y - 2.6)}Q${r(g.chin.x)} ${r(g.chin.y - 0.6)} ${r(g.mF.x + 2.6)} ${r(g.chin.y - 3)}`)
      set('jawShade', 'd', jawShadePath(g, st))

      // ---- руки ----
      const arm = (side: 'N' | 'F', sh: [number, number], hx: number, hy: number, w: number, abs: number, hand: number, prop: number, fs: number) => {
        // перспективне скорочення: рука, спрямована до глядача (напр. телефон біля вуха), виглядає коротшою
        const k1 = 1 - 0.62 * clamp(fs)
        const k2 = 1 - 0.45 * clamp(fs)
        const L1 = body.upper * k1
        const L2 = body.fore * k2
        const ik = solveIK(0, 0, hx, hy, L1, L2, 1)
        const parentAbs = lean + ik.bAbs
        const wrist = lerp(w, w - parentAbs, clamp(abs))
        const chain = `${tc} translate(${sh[0]} ${r(sh[1] - breath * 0.5)})`
        const targets = side === 'N' ? ['N'] : ['F', 'FF']
        for (const s of targets) {
          set(`arm${s}`, 'transform', `${chain} rotate(${r(ik.a)})`)
          set(`upper${s}`, 'transform', `scale(1 ${r(k1 * 1000) / 1000})`)
          set(`fore${s}`, 'transform', `scale(1 ${r(k2 * 1000) / 1000})`)
          set(`elbow${s}`, 'transform', `translate(0 ${r(L1)}) rotate(${r(ik.b)})`)
          set(`hand${s}`, 'transform', `translate(0 ${r(L2)}) rotate(${r(wrist)})`)
          const hs = Math.round(hand)
          for (let i = 0; i <= 4; i++) {
            const he = E[`h${s}${i}`] as SVGGElement | undefined
            if (he) he.style.display = i === hs ? '' : 'none'
          }
          const pr = Math.round(prop)
          for (let i = 1; i <= 5; i++) {
            const pe = E[`p${s}${i}`] as SVGGElement | undefined
            if (pe) pe.style.display = i === pr ? '' : 'none'
          }
        }
      }
      arm('N', body.shN, p.nhx, p.nhy, p.nw, p.nA, p.nHand, p.propN, p.nFS ?? 0)
      arm('F', body.shF, p.fhx, p.fhy, p.fw, p.fA, p.fHand, p.propF, p.fFS ?? 0)
      const ffront = p.fFront > 0.5
      const fb = E.armFBack as SVGGElement | undefined
      const ff = E.armFFront as SVGGElement | undefined
      if (fb) fb.style.display = ffront ? 'none' : ''
      if (ff) ff.style.display = ffront ? '' : 'none'

      // ---- предмети: книга, пара над чашкою, букет ----
      for (const s of ['N', 'F', 'FF']) {
        const cover = E[`${s}cover`] as SVGGElement | undefined
        if (cover) {
          const o = clamp(p.bookOpen)
          const sx = Math.cos(o * Math.PI)
          cover.setAttribute('transform', `translate(1 0) scale(${r(sx * 1000) / 1000} 1) translate(-1 0)`)
          const inside = E[`${s}coverIn`] as SVGGElement | undefined
          if (inside) inside.style.opacity = sx < 0 ? '1' : '0'
        }
        const steam = E[`${s}steam`] as SVGGElement | undefined
        if (steam) {
          steam.style.opacity = String(r(clamp(p.steam)))
          const ph = t * 1.3 + seed
          set(`${s}steam1`, 'd', `M4 -18 c${r(-3 + Math.sin(ph) * 1.5)} -4 ${r(3 + Math.sin(ph + 1) * 1.5)} -7 ${r(Math.sin(ph * 0.8) * 1.2)} -11`)
          set(`${s}steam2`, 'd', `M9 -18 c${r(-3 + Math.sin(ph + 2) * 1.5)} -4 ${r(3 + Math.sin(ph + 3) * 1.5)} -7 ${r(Math.sin(ph * 0.7 + 1) * 1.2)} -11`)
        }
        for (let i = 1; i <= 6; i++) {
          const f = E[`${s}bq${i}`] as SVGGElement | undefined
          if (f) {
            const b = clamp(p.bloom - (i % 3) * 0.08)
            f.setAttribute('transform', `scale(${r(0.55 + 0.45 * b)}) rotate(${r((1 - b) * 25 * (i % 2 ? 1 : -1))})`)
          }
        }
      }
    },
  }))

  const L = body
  const sleeveW = woman ? 7.6 : 9
  const foreW = woman ? 5.6 : 6.8
  const handScale = woman ? 1 : 1.12

  const handGroup = (s: string) => (
    <g ref={reg(`hand${s}`)}>
      <g transform={`scale(${handScale})`}>
        <g ref={reg(`h${s}0`)}>
          <Hand shape="relaxed" fill={url('skin')} line={look.skinShade} />
        </g>
        <g ref={reg(`h${s}1`)} style={{ display: 'none' }}>
          <Hand shape="hold" fill={url('skin')} line={look.skinShade} />
        </g>
        <g ref={reg(`h${s}2`)} style={{ display: 'none' }}>
          <Hand shape="open" fill={url('skin')} line={look.skinShade} />
        </g>
        <g ref={reg(`h${s}3`)} style={{ display: 'none' }}>
          <g transform="translate(2.4 11) rotate(4)">
            <PhoneProp />
          </g>
          <Hand shape="phone" fill={url('skin')} line={look.skinShade} />
        </g>
        <g ref={reg(`h${s}4`)} style={{ display: 'none' }}>
          <Hand shape="rest" fill={url('skin')} line={look.skinShade} />
        </g>
      </g>
      {/* предмети: точка хвату в кулаці, «вгору» предмета = +x кисті */}
      <g transform={`translate(${1.5 * handScale} ${13.5 * handScale}) rotate(90)`}>
        <g ref={reg(`p${s}1`)} style={{ display: 'none' }}>
          <g transform="translate(-6 -2)">
            <BookProp reg={reg} k={s} />
          </g>
        </g>
        <g ref={reg(`p${s}2`)} style={{ display: 'none' }}>
          <g transform="translate(-1 9)">
            <CupProp reg={reg} k={s} />
          </g>
        </g>
        <g ref={reg(`p${s}4`)} style={{ display: 'none' }}>
          <g transform="translate(0 2) scale(1.05)">
            <BouquetPropRegistered reg={reg} s={s} />
          </g>
        </g>
        <g ref={reg(`p${s}5`)} style={{ display: 'none' }}>
          <g transform="translate(-8 4)">
            <NotebooksProp />
          </g>
        </g>
        <g ref={reg(`p${s}3`)} style={{ display: 'none' }} />
      </g>
    </g>
  )

  const armGroup = (s: string, shade = false) => (
    <g ref={reg(`arm${s}`)}>
      {/* плече-рукав (масштабується по довжині для перспективного скорочення) */}
      <g ref={reg(`upper${s}`)}>
        <path
          d={`M${-sleeveW} -6 C${-sleeveW - 1.5} ${L.upper * 0.3} ${-sleeveW + 0.5} ${L.upper * 0.75} ${-foreW - 0.6} ${L.upper + 1} L${foreW + 0.6} ${L.upper + 1} C${sleeveW + 0.4} ${L.upper * 0.7} ${sleeveW + 1.6} ${L.upper * 0.3} ${sleeveW} -6 Z`}
          fill={url('sleeve')}
        />
      </g>
      <circle cx={0} cy={0} r={sleeveW - 0.4} fill={url('sleeve')} />
      <g ref={reg(`elbow${s}`)}>
        <circle cx={0} cy={0} r={foreW + 0.6} fill={url('sleeve')} />
        <g ref={reg(`fore${s}`)}>
          <path
            d={`M${-foreW - 0.4} 0 C${-foreW - 0.8} ${L.fore * 0.35} ${-foreW + 0.4} ${L.fore * 0.7} ${-foreW + 1.2} ${L.fore - 2} L${foreW - 0.8} ${L.fore - 2} C${foreW + 0.2} ${L.fore * 0.6} ${foreW + 0.8} ${L.fore * 0.3} ${foreW + 0.4} 0 Z`}
            fill={url('sleeve')}
          />
          <path d={`M${-foreW + 1} ${L.fore - 6} L${foreW - 0.6} ${L.fore - 6} L${foreW - 0.8} ${L.fore - 0.5} L${-foreW + 1.2} ${L.fore - 0.5} Z`} fill={outfit.cuff} />
          {shade && <path d={`M${-foreW - 0.4} 0 C${-foreW - 0.8} ${L.fore * 0.35} ${-foreW + 0.4} ${L.fore * 0.7} ${-foreW + 1.2} ${L.fore - 2} L${-foreW + 3} ${L.fore - 2} C${-foreW + 2} ${L.fore * 0.6} ${-foreW + 1.5} ${L.fore * 0.3} ${-foreW + 2} 0 Z`} fill="#000" opacity={0.1} />}
        </g>
        {handGroup(s)}
      </g>
    </g>
  )

  const legGroup = (s: 'N' | 'F') => {
    const tw = woman ? 14 : 15.5
    const kw = woman ? 8.6 : 10
    const aw = woman ? 4.6 : 5.6
    const trousers = !outfit.skirt || outfit.style === 'coat' || outfit.style === 'coatMan'
    const hem = trousers ? (woman ? 7.4 : 8.6) : aw
    const legFill = url('legs')
    const F = L.foot
    const a = L.ankle
    return (
      <g ref={reg(`leg${s}`)}>
        <g ref={reg(`thigh${s}`)}>
          <path
            d={`M${-tw} -8 C${-tw - 1.6} ${L.thigh * 0.28} ${-kw - 2} ${L.thigh * 0.72} ${-kw} ${L.thigh} L${kw} ${L.thigh} C${kw + 1.6} ${L.thigh * 0.6} ${tw + 1.8} ${L.thigh * 0.22} ${tw} -8 Z`}
            fill={legFill}
          />
        </g>
        <g ref={reg(`knee${s}`)}>
          <circle cx={0} cy={0} r={kw + 0.4} fill={legFill} />
          <path
            d={
              trousers
                ? `M${-kw - 0.4} 0 C${-kw - 1.6} ${L.shin * 0.3} ${-hem - 0.8} ${L.shin * 0.7} ${-hem - 0.6} ${L.shin + 2} L${hem + 1.6} ${L.shin + 2} C${hem + 1.2} ${L.shin * 0.6} ${kw + 0.6} ${L.shin * 0.25} ${kw + 0.4} 0 Z`
                : `M${-kw - 0.3} 0 C${-kw - 3.4} ${L.shin * 0.22} ${-kw - 1} ${L.shin * 0.52} ${-aw} ${L.shin} L${aw} ${L.shin} C${aw + 0.6} ${L.shin * 0.6} ${kw + 0.6} ${L.shin * 0.24} ${kw + 0.3} 0 Z`
            }
            fill={legFill}
          />
          {outfit.boot && (
            <path
              d={`M${-hem - 0.9} ${L.shin * 0.6} L${hem + 1.8} ${L.shin * 0.6} L${hem + 1.6} ${L.shin + 3} L${-hem - 0.7} ${L.shin + 3} Z`}
              fill={outfit.shoe}
            />
          )}
          <g ref={reg(`foot${s}`)}>
            {/* стопа/взуття; підошва на рівні землі (y = висота кісточки) */}
            <path
              d={`M-6.5 -3 C-9 1.5 -8 ${a} -2.5 ${a} L${F - 7} ${a} C${F - 1.5} ${a} ${F - 0.5} ${a - 3} ${F - 3.6} ${a - 5.2} C${F - 10} ${a - 7.8} 10 ${a - 9.6} 4.5 -5.5 Z`}
              fill={outfit.shoe}
            />
            <path d={`M-2.5 ${a - 0.2} L${F - 7} ${a - 0.2} C${F - 2.5} ${a - 0.2} ${F - 1.4} ${a - 1.4} ${F - 1.6} ${a - 2.4}`} fill="none" stroke={outfit.shoeLight} strokeWidth={1.3} opacity={0.7} />
            {woman && outfit.style === 'cardigan' && <path d={`M-6 ${a - 2.4} L-2.6 ${a - 2.4} L-3 ${a} L-5.6 ${a} Z`} fill="#3b251b" />}
          </g>
        </g>
      </g>
    )
  }

  const gradients = (
    <defs>
      <linearGradient id={id('skin')} x1="0" x2="1" y1="0" y2="0">
        {gx(look.skinShade, look.skin, look.skinLight).map((c, i) => (
          <stop key={i} offset={i === 0 ? 0 : i === 1 ? 0.55 : 1} stopColor={c} />
        ))}
      </linearGradient>
      <linearGradient id={id('face')} gradientUnits="userSpaceOnUse" x1={lightFront ? -22 : 24} y1="-10" x2={lightFront ? 24 : -22} y2="-24">
        <stop offset="0" stopColor={look.skinShade} />
        <stop offset="0.35" stopColor={look.skin} />
        <stop offset="1" stopColor={look.skinLight} />
      </linearGradient>
      <radialGradient id={id('cheek')}>
        <stop offset="0" stopColor={look.blush} stopOpacity="0.9" />
        <stop offset="1" stopColor={look.blush} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={id('hair')} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor={look.hairLight} />
        <stop offset="0.35" stopColor={look.hair} />
        <stop offset="1" stopColor={look.hairDeep} />
      </linearGradient>
      <linearGradient id={id('hairBack')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={look.hair} />
        <stop offset="1" stopColor={look.hairDeep} />
      </linearGradient>
      <linearGradient id={id('jawGrad')} x1="0" x2="1" y1="0" y2="0.2">
        <stop offset="0" stopColor={look.skinShade} stopOpacity="0.62" />
        <stop offset="0.55" stopColor={look.skinShade} stopOpacity="0.18" />
        <stop offset="1" stopColor={look.skinShade} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={id('browShadow')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={look.skinShade} stopOpacity="0.55" />
        <stop offset="1" stopColor={look.skinShade} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={id('sclera')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#e9d9cc" />
        <stop offset="0.45" stopColor="#faf3ea" />
        <stop offset="1" stopColor="#fbf6ef" />
      </linearGradient>
      <radialGradient id={id('iris')} cx="0.45" cy="0.4" r="0.6">
        <stop offset="0" stopColor={lighten(look.iris)} />
        <stop offset="0.7" stopColor={look.iris} />
        <stop offset="1" stopColor={look.lash} />
      </radialGradient>
      <linearGradient id={id('top')} x1="0" x2="1" y1="0" y2="0">
        {gx(outfit.topShade, outfit.top, outfit.topLight).map((c, i) => (
          <stop key={i} offset={i === 0 ? 0 : i === 1 ? 0.5 : 1} stopColor={c} />
        ))}
      </linearGradient>
      <linearGradient id={id('sleeve')} x1="0" x2="1" y1="0" y2="0">
        {gx(outfit.sleeveShade, outfit.sleeve, outfit.topLight).map((c, i) => (
          <stop key={i} offset={i === 0 ? 0 : i === 1 ? 0.55 : 1} stopColor={c} />
        ))}
      </linearGradient>
      <linearGradient id={id('legs')} x1="0" x2="1" y1="0" y2="0">
        {gx(outfit.legsShade, outfit.legs, lighten(outfit.legs, 0.12)).map((c, i) => (
          <stop key={i} offset={i === 0 ? 0 : i === 1 ? 0.55 : 1} stopColor={c} />
        ))}
      </linearGradient>
      {outfit.skirt && (
        <linearGradient id={id('skirt')} x1="0" x2="0.35" y1="0" y2="1">
          <stop offset="0" stopColor={lighten(outfit.skirt, 0.1)} />
          <stop offset="0.6" stopColor={outfit.skirt} />
          <stop offset="1" stopColor={outfit.skirtShade ?? outfit.skirt} />
        </linearGradient>
      )}
      <radialGradient id={id('shadow')}>
        <stop offset="0" stopColor="#2a1a12" stopOpacity="0.55" />
        <stop offset="1" stopColor="#2a1a12" stopOpacity="0" />
      </radialGradient>
      <clipPath id={id('eyeN')}>
        <path ref={reg('eyeClipN')} d="" />
      </clipPath>
      <clipPath id={id('eyeF')}>
        <path ref={reg('eyeClipF')} d="" />
      </clipPath>
    </defs>
  )

  return (
    <g ref={reg('root')} className="character">
      {gradients}
      {shadow > 0 && <ellipse cx={4} cy={1} rx={woman ? 58 : 64} ry={8} fill={url('shadow')} opacity={shadow} />}

      {/* волосся позаду корпусу */}
      <g ref={reg('backHair')}>
        <g ref={reg('backHairShift')}>
          <g ref={reg('backHairSway')}>{woman ? <WomanBackHair fill={url('hairBack')} hi={look.hairLight} /> : <ManBackHair fill={look.hairDeep} />}</g>
        </g>
      </g>

      {/* дальня рука (за корпусом) */}
      <g ref={reg('armFBack')}>{armGroup('F', true)}</g>

      {legGroup('F')}
      {legGroup('N')}

      {outfit.skirt && <path ref={reg('skirt')} d="" fill={url('skirt')} />}

      <g ref={reg('torso')}>
        <g ref={reg('torsoBody')}>
          <Torso body={body} outfit={outfit} look={look} url={url} woman={woman} />
        </g>
        {outfit.scarf && <ScarfFront outfit={outfit} woman={woman} />}
        <g ref={reg('head')}>
          <ellipse ref={reg('cranium')} cx={0} cy={-22} rx={st.R + 2.4} ry={st.R + 4.4} fill={url('face')} />
          <path ref={reg('faceMask')} d="" fill={url('face')} />
          <path ref={reg('jawShade')} d="" fill={url('jawGrad')} opacity={lightFront ? 1 : 0.35} />
          <path ref={reg('chinShade')} d="" fill="none" stroke={look.skinShade} strokeWidth={1.4} opacity={0.22} strokeLinecap="round" />
          <g ref={reg('cheeks')}>
            <ellipse ref={reg('cheekN')} cx={0} cy={0} rx={5.6} ry={3.6} fill={url('cheek')} />
            <ellipse ref={reg('cheekF')} cx={0} cy={0} rx={4.4} ry={3.2} fill={url('cheek')} />
          </g>
          {/* ніс */}
          <path ref={reg('noseShade')} d="" fill={look.skinShade} opacity={0.42} />
          <path ref={reg('noseBridge')} d="" fill="none" stroke={look.skinDeep} strokeWidth={0.7} strokeLinecap="round" />
          <path ref={reg('noseWing')} d="" fill="none" stroke={look.skinDeep} strokeWidth={0.65} strokeLinecap="round" opacity={0.45} />
          <path ref={reg('noseTip')} d="" fill="none" stroke={look.skinDeep} strokeWidth={0.6} strokeLinecap="round" opacity={0.35} />
          <path ref={reg('noseNostril')} d="" fill={look.skinDeep} opacity={0.75} />
          <ellipse ref={reg('noseHl')} cx={0} cy={0} rx={1.3} ry={0.8} fill="#fff6ec" opacity={0.45} />
          {!woman && <path ref={reg('folds')} d="" fill="none" stroke={look.skinShade} strokeWidth={0.8} strokeLinecap="round" />}
          {/* очі */}
          {(['N', 'F'] as const).map((s) => (
            <g key={s}>
              <path ref={reg(`lid${s}`)} d="" fill={woman ? '#b7867a' : look.skinShade} opacity={woman ? 0.4 : 0.32} />
              <path ref={reg(`crease${s}`)} d="" fill="none" stroke={look.skinDeep} strokeWidth={0.55} opacity={0.5} strokeLinecap="round" />
              <path ref={reg(`eye${s}`)} d="" fill={url('sclera')} />
              <g clipPath={url(`eye${s}`)}>
                <g ref={reg(`iris${s}`)}>
                  <circle r={st.eyeH * (woman ? 0.9 : 0.92)} fill={url('iris')} />
                  <circle r={st.eyeH * 0.4} fill="#140b08" />
                  <circle cx={1} cy={-1.05} r={0.7} fill="#ffffff" opacity={0.95} />
                  <circle cx={-0.95} cy={0.95} r={0.32} fill="#ffffff" opacity={0.55} />
                </g>
                <path ref={reg(`lidShadow${s}`)} d="" />
              </g>
              <path ref={reg(`lash${s}`)} d="" fill={look.lash} />
              <path ref={reg(`flick${s}`)} d="" fill="none" stroke={look.lash} strokeWidth={0.5} strokeLinecap="round" />
              <path ref={reg(`lower${s}`)} d="" fill="none" stroke={look.skinDeep} strokeWidth={0.45} opacity={0.4} strokeLinecap="round" />
              <path ref={reg(`brow${s}`)} d="" fill={look.brow} opacity={0.94} />
            </g>
          ))}
          {/* рот */}
          <g ref={reg('mouthInnerG')} style={{ display: 'none' }}>
            <path ref={reg('mouthInner')} d="" fill="#5e2a2b" />
            <path ref={reg('mouthTeeth')} d="" fill="#fbf6ee" />
          </g>
          <path ref={reg('mouthLower')} d="" fill={look.lip} opacity={woman ? 0.95 : 0.5} />
          <path ref={reg('mouthUpper')} d="" fill={look.lipDark} opacity={woman ? 0.82 : 0.4} />
          <path ref={reg('mouthLine')} d="" fill="none" stroke={look.lipDark} strokeWidth={woman ? 0.7 : 0.75} strokeLinecap="round" opacity={0.9} />
          <path ref={reg('mouthHi')} d="" fill="none" stroke="#fff4ec" strokeWidth={0.6} strokeLinecap="round" opacity={woman ? 0.45 : 0.2} />
          <path ref={reg('dimN')} d="" fill="none" stroke={look.skinDeep} strokeWidth={0.5} strokeLinecap="round" />
          {/* волосся спереду */}
          <g ref={reg('frontHair')}>
            {woman ? (
              <WomanFrontHair fill={url('hair')} hi={look.hairLight} deep={look.hairDeep} reg={reg} shadow={url('browShadow')} />
            ) : (
              <ManFrontHair fill={url('hair')} hi={look.hairLight} deep={look.hairDeep} temple={look.temple ?? look.hairLight} />
            )}
          </g>
          {!woman && (
            <g ref={reg('ear')}>
              <path d="M0.4 -6.8 C4.6 -7.6 5.8 -2.2 4.8 3.2 C4 6.8 0.4 7 -0.8 4.2 C-2 0.6 -2 -4.6 0.4 -6.8 Z" fill={look.skin} />
              <path d="M1 -4 C3.2 -3.6 3.4 0 2.2 2.6" fill="none" stroke={look.skinShade} strokeWidth={0.9} strokeLinecap="round" />
              <path d="M0.4 -6.8 C-1 -5 -1.6 -1 -0.8 4.2" fill="none" stroke={look.skinShade} strokeWidth={0.6} opacity={0.5} />
            </g>
          )}
        </g>
      </g>

      {/* дальня рука перед корпусом — коли тримає предмет обома руками */}
      <g ref={reg('armFFront')} style={{ display: 'none' }}>
        {armGroup('FF', true)}
      </g>
      {armGroup('N')}
    </g>
  )
}

/** Ref-сумісна обгортка букета: квіти реєструються як `${s}bq1..6`. */
function BouquetPropRegistered({ reg, s }: { reg: Reg; s: string }) {
  return <BouquetProp reg={(k) => reg(k.replace(/^(.*)f(\d)$/, `${s}bq$2`))} k={`${s}x`} />
}

function lighten(hex: string, amt = 0.25): string {
  const n = parseInt(hex.slice(1), 16)
  const rr = (n >> 16) & 255
  const gg = (n >> 8) & 255
  const bb = n & 255
  const f = (c: number) => Math.round(c + (255 - c) * amt)
  return `#${((1 << 24) | (f(rr) << 16) | (f(gg) << 8) | f(bb)).toString(16).slice(1)}`
}

/* ---------- геометрія спідниці ---------- */

type IK = ReturnType<typeof solveIK>

function hull(points: [number, number][]): [number, number][] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: [number, number][] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

function roundedPoly(pts: [number, number][], f = 0.28): string {
  const n = pts.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n]
    const v = pts[i]
    const q = pts[(i + 1) % n]
    const a = [v[0] + (p[0] - v[0]) * f, v[1] + (p[1] - v[1]) * f]
    const b = [v[0] + (q[0] - v[0]) * f, v[1] + (q[1] - v[1]) * f]
    d += (i === 0 ? 'M' : 'L') + `${r(a[0])} ${r(a[1])}Q${r(v[0])} ${r(v[1])} ${r(b[0])} ${r(b[1])}`
  }
  return d + 'Z'
}

function skirtPath(P: { x: number; y: number }, lean: number, body: BodySpec, kn: IK, kf: IK, p: Params, len: number, woman: boolean): string {
  const rad = (lean * Math.PI) / 180
  const rot = (x: number, y: number): [number, number] => [P.x + x * Math.cos(rad) - y * Math.sin(rad), P.y + x * Math.sin(rad) + y * Math.cos(rad)]
  const w = woman ? 1 : 1.12
  const pts: [number, number][] = [rot(-15 * w, -34), rot(15 * w, -34), rot(-21 * w, -6), rot(20 * w, -8), rot(-19 * w, 8)]
  // від коліна вздовж гомілки на len*довжину гомілки, з розширенням
  for (const [ik, ax, ay] of [
    [kn, p.nfx, -body.ankle + p.nfy],
    [kf, p.ffx, -body.ankle + p.ffy],
  ] as const) {
    const kx = ik.jx
    const ky = ik.jy
    const dx = ax - kx
    const dy = ay - ky
    const dl = Math.hypot(dx, dy) || 1
    const hx = kx + (dx / dl) * body.shin * len
    const hy = ky + (dy / dl) * body.shin * len
    const flare = woman ? 13 : 12
    pts.push([kx - 11, ky], [kx + 11, ky], [hx - flare, hy], [hx + flare, hy])
  }
  return roundedPoly(hull(pts), 0.22)
}

/** М’яка тінь уздовж ближньої щоки й щелепи (бік, протилежний світлу). */
function jawShadePath(g: ReturnType<typeof headGeo>, st: FaceStyle): string {
  const R = st.R
  const ax = 1
  const man = st.kind === 'man'
  const jw = man ? 1.1 : 1
  const D = Math.PI / 180
  const o = [
    { x: ax + R * Math.sin(g.th - 93 * D) - 3.5, y: -24 },
    { x: ax + R * Math.sin(g.th - 92 * D) - 3.5, y: -14 },
    { x: ax + R * 0.92 * jw * Math.sin(g.th - 78 * D), y: man ? -3 : -4.4 },
    { x: g.chin.x - 3.8 * g.c * jw, y: g.chin.y - 1.2 },
    { x: g.chin.x + 0.4, y: g.chin.y + 0.2 },
  ]
  const i = [
    { x: g.chin.x - 1.2, y: g.chin.y - 2.4 },
    { x: g.chin.x - 4.6, y: g.chin.y - 3.2 },
    { x: o[2].x + 4.2, y: o[2].y - 1.5 },
    { x: o[1].x + 8, y: -14 },
    { x: o[0].x + 6.4, y: -24 },
  ]
  return smoothPath([...o, ...i], true, 0.9)
}

/* ---------- кисті ---------- */

function Hand({ shape, fill, line }: { shape: 'relaxed' | 'hold' | 'open' | 'phone' | 'rest'; fill: string; line: string }) {
  switch (shape) {
    case 'relaxed':
      return (
        <g>
          <path d="M-4.4 -1.4 C-5.8 4 -6 9.6 -5 13.6 C-4.2 17 -2.6 19.4 -0.4 19.4 C1.8 19.4 3 16.6 3.4 13.6 C3.8 10.4 4.2 6.4 4.6 2.6 L4.8 -1.4 Z" fill={fill} />
          <path d="M3.4 1.6 C6.8 3.6 7.9 8 6.8 11 C6.3 12.6 4.6 12.4 4.4 11 C4.1 8.8 3.6 6.4 2.4 4.8 Z" fill={fill} />
          <path d="M-2.6 12.4 L-2.2 18 M0 12.8 L0.6 18.6" stroke={line} strokeWidth={0.55} opacity={0.6} strokeLinecap="round" />
        </g>
      )
    case 'hold':
      return (
        <g>
          <path d="M-4.6 -1.4 C-6.2 4 -6.4 9.4 -5 13.2 C-3.4 17 2.6 17.4 5 14.2 C6.6 11.8 6.2 6 5 1.2 L4.8 -1.4 Z" fill={fill} />
          <path d="M3 6 C6.4 5.8 7.6 9.2 6.2 11.6 C5.4 12.8 3.2 12.4 2.8 10.8 Z" fill={fill} />
          <path d="M-3.8 11.2 C-1.4 13.4 2 13.4 4.4 11.6" fill="none" stroke={line} strokeWidth={0.6} opacity={0.65} strokeLinecap="round" />
        </g>
      )
    case 'open':
      return (
        <g>
          <path d="M-4.6 -1.4 C-6.6 5 -7.2 12 -6.2 19.6 C-5.6 22.4 -2 22.8 0.4 21.8 C2.8 20.8 3.8 17 4.4 12.6 C4.8 9 4.8 4 4.8 -1.4 Z" fill={fill} />
          <path d="M3.8 2.6 C7.6 3 10.6 5.8 11.2 9 C11.5 10.6 10.2 11.3 9.1 10.3 C7.6 8.9 5.9 7.5 3.6 7 Z" fill={fill} />
          <path d="M-4.6 14.2 L-5.1 20.4 M-2.3 14.6 L-2.4 21.8 M0.3 14.6 L0.8 21.2" stroke={line} strokeWidth={0.5} opacity={0.55} strokeLinecap="round" />
        </g>
      )
    case 'phone':
      return (
        <g>
          <path d="M-4.6 -1.4 C-6 3 -6.2 7.4 -5.4 10.8 C-4.6 13.4 -2 14.2 0 13.6 L1 6 L4.8 2 L4.8 -1.4 Z" fill={fill} />
          <path d="M-5.4 10.6 C-6.6 13 -6 16.2 -4 17.2 C-2.8 17.8 -1.6 17 -1.8 15.6 L-2 12.4 Z" fill={fill} />
          <path d="M4 1.8 C7.4 4 8.2 8.6 6.6 11.8 C6 13 4.6 12.8 4.4 11.6 C4.2 9.4 3.8 7 2.8 5.4 Z" fill={fill} />
        </g>
      )
    case 'rest':
      return (
        <g>
          <path d="M-4.4 -1.4 C-5.4 5 -4.6 12 -2.4 19 C-1.4 21.6 2 21.4 2.6 18.6 C3.6 13 4.4 6 4.8 -1.4 Z" fill={fill} />
          <path d="M3.6 3 C6.6 6 7.4 10 6.4 13 C6 14.2 4.6 14 4.4 12.6 C4 10.4 3.4 7.6 2.4 5.8 Z" fill={fill} />
        </g>
      )
  }
}

/* ---------- волосся ---------- */

/** Довге хвилясте волосся позаду: падає за плечі, видно з обох боків обличчя. */
function WomanBackHair({ fill, hi }: { fill: string; hi: string }) {
  return (
    <g>
      <path
        d="M0 -47 C15 -48 26 -40 26.5 -27 C27 -16 23.5 -6 25 4 C26.5 13 25.5 22 21 31 C18 37 19 44 15 50 C11 55 4 56 -2 54.5 C-7 57 -14 56 -18 51 C-23 46 -23 40 -26 34 C-29 27 -27 18 -29 9 C-31 0 -29 -10 -30 -18 C-30 -34 -17 -46 0 -47 Z"
        fill={fill}
      />
      <g fill="none" strokeLinecap="round">
        <path d="M-25 -2 C-22 10 -26 22 -22 34 C-20 41 -16 47 -11 51" stroke="#000" strokeWidth={1.3} opacity={0.22} />
        <path d="M21 6 C24 17 22 28 17 38 C15 42 15 46 13 50" stroke="#000" strokeWidth={1.1} opacity={0.22} />
        <path d="M-27 -10 C-25 2 -28 14 -26 26" stroke={hi} strokeWidth={1.2} opacity={0.22} />
        <path d="M23 -14 C24.6 -4 22.6 6 24 16" stroke={hi} strokeWidth={1} opacity={0.2} />
      </g>
    </g>
  )
}

/**
 * Передня частина зачіски: боковий проділ, м’яка хвиля над лобом у бік погляду
 * і пасмо, що обрамлює ближню щоку та спадає на плече. Дальнє око лишається відкритим.
 */
function WomanFrontHair({ fill, hi, deep, reg, shadow }: { fill: string; hi: string; deep: string; reg: Reg; shadow: string }) {
  return (
    <g>
      {/* легка тінь від чубка на лобі */}
      <path d="M-14.6 -26.6 C-11 -32.6 -6 -35.6 -2.6 -35.4 C3 -32.6 10 -29.4 15 -25.6 C17.6 -23.6 19.6 -21.4 20.8 -19.2 L19.8 -15.6 C16.4 -19.6 11.6 -23.6 5.6 -26.8 C0.6 -29.4 -3.6 -30.6 -6.4 -30 C-9.6 -29.2 -12.4 -27 -14.6 -24.4 Z" fill={shadow} />
      {/* верх і хвиля над лобом */}
      <path
        d="M-16.6 -22 C-20.2 -32.6 -15.6 -43.6 -4 -48.2 C7.6 -51.4 20.6 -46.4 25 -35.6 C27.4 -29.4 26.6 -20.6 23.8 -12.8 C23 -15.6 22.2 -17.8 21 -19.8 C17.4 -25.2 11.4 -29 5.4 -31.6 C1 -33.6 -2 -35.2 -3 -35.4 C-6.6 -34.8 -10.4 -32.2 -13 -28.4 C-14.6 -26.4 -15.8 -24.2 -16.6 -22 Z"
        fill={fill}
      />
      {/* пасмо біля ближньої щоки, що спадає на плече */}
      <g ref={reg('frontLockSway')}>
        <path
          d="M-9.8 -31.4 C-13.6 -28.4 -15.2 -21.6 -14.6 -14 C-14.2 -7 -13.6 0 -11.6 7.4 C-10 14 -11.6 22 -14.4 29.4 C-17 36.4 -16.4 43.4 -19.2 50 C-21 54.4 -25.4 55 -27 50.6 C-28.4 45 -26.2 38 -27 31 C-27.8 23 -25.4 15 -26.2 6 C-27 -4 -24.6 -16 -20.6 -24.6 C-17.6 -30.6 -13.6 -33.4 -9.8 -31.4 Z"
          fill={fill}
        />
        <path d="M-17.6 -18 C-18.6 -6 -16.6 4 -16.6 14 C-16.6 24 -19.6 34 -21.6 46" fill="none" stroke={hi} strokeWidth={1.1} opacity={0.35} strokeLinecap="round" />
        <path d="M-22.6 -10 C-23.6 2 -21.8 14 -22.8 26" fill="none" stroke={deep} strokeWidth={1} opacity={0.5} strokeLinecap="round" />
      </g>
      {/* відблиски на хвилі */}
      <path d="M-4 -46 C5 -46.6 15 -42.4 20.6 -34.6 C22.6 -31.6 23.8 -28.4 24.2 -25" fill="none" stroke={hi} strokeWidth={1.8} opacity={0.42} strokeLinecap="round" />
      <path d="M-3.6 -41 C4 -40.2 11.4 -36.4 16.6 -30.6" fill="none" stroke={hi} strokeWidth={1} opacity={0.3} strokeLinecap="round" />
      <path d="M-12.6 -40.4 C-9.6 -43.6 -6.6 -45.4 -3.6 -46.4" fill="none" stroke={hi} strokeWidth={1.1} opacity={0.3} strokeLinecap="round" />
      <path d="M-3 -35.4 C2 -40 3 -44 2.2 -48" fill="none" stroke={deep} strokeWidth={0.9} opacity={0.55} strokeLinecap="round" />
      <path d="M22.4 -26.4 C24 -22.4 24.2 -18.4 24 -14.6" fill="none" stroke={deep} strokeWidth={0.9} opacity={0.5} strokeLinecap="round" />
      <path d="M2 -33 C8 -30.6 14.6 -26.6 19.6 -21.4" fill="none" stroke={deep} strokeWidth={0.8} opacity={0.45} strokeLinecap="round" />

    </g>
  )
}

function ManBackHair(_props: { fill: string }) {
  void _props
  return null
}

/** Коротка охайна стрижка з боковим проділом; трохи сивини на скронях. */
function ManFrontHair({ fill, hi, deep, temple }: { fill: string; hi: string; deep: string; temple: string }) {
  return (
    <g>
      <path
        d="M-10 0.6 C-15.6 0.2 -21.4 -4 -23.6 -12.6 C-25.2 -21.6 -23.4 -29.8 -20.4 -34.4 C-15.8 -43.4 -5 -48.8 5 -48.2 C12.6 -47.6 18.4 -43.6 19.2 -37.6 C19.6 -34 18.4 -31.4 16.4 -30.2 C14 -32.4 10 -34 4.6 -34.2 C-1 -34.4 -6.2 -33.2 -9.6 -30.6 C-12.2 -28.4 -13.8 -25.4 -14.2 -21.8 L-14.4 -14 L-16.2 -12.6 L-16.4 -19 C-18.6 -18.6 -20.2 -16 -19.8 -11.4 C-19.2 -6.4 -14.6 -2 -10 0.6 Z"
        fill={fill}
      />
      {/* проділ, об’єм над лобом і текстура */}
      <path d="M-9.6 -43.4 C-3 -46.6 8 -46.4 16 -40.6" fill="none" stroke={hi} strokeWidth={1.6} opacity={0.42} strokeLinecap="round" />
      <path d="M-6 -39.4 C1 -42 9.6 -41.4 15.8 -36.6" fill="none" stroke={hi} strokeWidth={0.9} opacity={0.3} strokeLinecap="round" />
      <path d="M-12.6 -41.6 C-10 -37.6 -9 -35 -9.2 -31.6" fill="none" stroke={deep} strokeWidth={0.9} opacity={0.55} strokeLinecap="round" />
      <path d="M-1 -33.8 C5 -36.8 12 -36.4 17.8 -32.4" fill="none" stroke={deep} strokeWidth={0.8} opacity={0.5} strokeLinecap="round" />
      <path d="M-22 -22 C-21.6 -30 -18.6 -36.6 -13.6 -41" fill="none" stroke={deep} strokeWidth={0.9} opacity={0.45} strokeLinecap="round" />
      {/* ледь сиві скроні */}
      <path d="M-14.8 -24.6 L-15.2 -15" fill="none" stroke={temple} strokeWidth={1.2} opacity={0.32} strokeLinecap="round" />
      <path d="M-20.2 -27 C-21 -22 -20.8 -19 -20 -16" fill="none" stroke={temple} strokeWidth={1} opacity={0.28} strokeLinecap="round" />
    </g>
  )
}

/* ---------- корпус ---------- */

function Torso({ body, outfit, look, url, woman }: { body: BodySpec; outfit: Outfit; look: SkinHair; url: (n: string) => string; woman: boolean }) {
  const [nx, ny] = body.neck
  const [hx, hy] = body.headPivot
  const neckW = woman ? 6.2 : 7.8
  const neck = (
    <g>
      <path
        d={`M${nx - neckW + 0.4} ${ny + 6} C${nx - neckW} ${ny - 4} ${hx - neckW - 0.6} ${hy + 6} ${hx - neckW + 0.4} ${hy - 4} L${hx + neckW + 0.6} ${hy - 4} C${hx + neckW + 0.4} ${hy + 6} ${nx + neckW + 0.6} ${ny - 4} ${nx + neckW + 0.8} ${ny + 6} Z`}
        fill={url('skin')}
      />
      <path d={`M${hx - neckW + 0.4} ${hy + 1} Q${hx + 1} ${hy + 13} ${hx + neckW + 0.6} ${hy + 4} L${hx + neckW + 0.6} ${hy} Q${hx + 1} ${hy + 6} ${hx - neckW + 0.4} ${hy - 1} Z`} fill={look.skinShade} opacity={0.5} />
    </g>
  )
  if (woman) return <WomanTorso outfit={outfit} url={url} neck={neck} look={look} />
  return <ManTorso outfit={outfit} url={url} neck={neck} />
}

function WomanTorso({ outfit, url, neck, look }: { outfit: Outfit; url: (n: string) => string; neck: ReactNode; look: SkinHair }) {
  void look
  const silhouette =
    'M1 -113.5 C-6 -112.5 -15 -107.5 -20.5 -101 C-25.5 -95 -24.5 -84 -21.5 -72 C-18.5 -60 -14.5 -50 -14.5 -40 C-14.5 -30 -19.5 -20 -20.5 -8 C-21 0 -20.5 6 -19 10 L18.5 10 C20.5 4 20.5 -4 18.5 -12 C16.5 -24 13.5 -34 14 -44 C14.8 -52 20 -58 23 -66 C26 -74 25 -84 21.5 -92 C19.5 -98 16 -104 12 -110 C8 -113 5 -114.5 1 -113.5 Z'
  if (outfit.style === 'cardigan') {
    return (
      <g>
        {neck}
        <path d={silhouette} fill={url('top')} />
        {/* блуза у вирізі кардигана */}
        <path d="M2.5 -112.5 L12.8 -110.6 C16.8 -100 18.6 -88 17.2 -75 C14.6 -84 9 -98 2.5 -112.5 Z" fill={outfit.under} />
        <path d="M12.8 -110.6 C16.8 -100 18.6 -88 17.2 -75" fill="none" stroke={outfit.underShade} strokeWidth={0.8} />
        {/* комірець блузи */}
        <path d="M1.6 -113 L7.6 -103.4 L9.6 -110.6 Z" fill={outfit.collar} stroke={outfit.underShade} strokeWidth={0.5} />
        <path d="M9.6 -111 L14.8 -104.6 L13.6 -110.8 Z" fill={outfit.collar} stroke={outfit.underShade} strokeWidth={0.5} />
        {/* планка кардигана і ґудзики */}
        <path d="M2.5 -112.5 C9 -98 14.6 -84 17.2 -75 C16.6 -52 14.4 -26 13.2 10" fill="none" stroke={outfit.topShade} strokeWidth={1} opacity={0.8} />
        <circle cx={16.2} cy={-64} r={1.3} fill="#efe3d3" />
        <circle cx={15} cy={-51} r={1.3} fill="#efe3d3" />
        <circle cx={14.2} cy={-38} r={1.3} fill="#efe3d3" />
        {/* резинка внизу */}
        <path d="M-20.6 3 L18.8 3 L18.5 10 L-19 10 Z" fill={outfit.topShade} opacity={0.45} />
        <path d="M-12 4 V9.6 M-6 4 V9.8 M0 4 V9.8 M6 4 V9.8 M12 4 V9.6" stroke={outfit.topShade} strokeWidth={0.5} opacity={0.6} />
        {/* брошка-листочок */}
        <path d="M20.3 -86 c-1.4 1.6 -1.6 3.6 0 5.2 c1.6 -1.6 1.4 -3.6 0 -5.2 Z M20.3 -80.8 v1.8" fill="#d9b26a" stroke="#b98d43" strokeWidth={0.3} />
        <path d="M-19 -88 C-16 -74 -16 -60 -13.5 -46" fill="none" stroke={outfit.topShade} strokeWidth={1.2} opacity={0.35} />
      </g>
    )
  }
  if (outfit.style === 'knit') {
    const knit =
      'M0 -114 C-7 -113.5 -17 -109 -22.5 -102 C-27.5 -95 -26.5 -84 -23.5 -72 C-20.5 -60 -17.5 -50 -17.5 -38 C-17.5 -26 -22 -14 -22.5 -2 C-22.5 5 -21.5 10 -20 14 L20.5 14 C21.6 9 22 2 21 -6 C19.6 -18 17 -30 17.2 -42 C17.8 -54 22 -60 24.5 -68 C27 -76 26.5 -86 23 -94 C21 -100 17 -106 12.5 -110.5 C8.5 -113.5 4.5 -114.5 0 -114 Z'
    return (
      <g>
        {neck}
        <path d={knit} fill={url('top')} />
        {/* широкий м’який комір */}
        <path d="M-3 -113.5 C1 -109 9 -108 14.5 -110.4 L13.4 -113.6 C9 -111.6 2.5 -112 -0.6 -115 Z" fill={outfit.topShade} opacity={0.55} />
        {/* в’язка «коса» */}
        <g fill="none" stroke={outfit.topShade} strokeWidth={0.9} opacity={0.5} strokeLinecap="round">
          <path d="M12 -100 c-3 4 3 8 0 12 c-3 4 3 8 0 12 c-3 4 3 8 0 12 c-3 4 3 8 0 12 c-3 4 3 8 0 12 c-3 4 3 8 0 12" />
          <path d="M5 -104 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 6 0 10" />
          <path d="M-6 -106 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 8 0 12 c-2 4 2 8 0 12" opacity={0.6} />
        </g>
        <path d="M-22.4 6 L20.9 6 L20.5 14 L-20 14 Z" fill={outfit.topShade} opacity={0.35} />
        <path d="M-15 7 V13.6 M-9 7 V13.8 M-3 7 V13.8 M3 7 V13.8 M9 7 V13.8 M15 7 V13.6" stroke={outfit.topShade} strokeWidth={0.6} opacity={0.5} />
      </g>
    )
  }
  // пальто
  const coat =
    'M0 -114 C-7.5 -113.5 -17.5 -109 -23 -102 C-28.5 -95 -27.5 -84 -24.5 -72 C-21.5 -60 -18.5 -50 -18 -40 C-17.5 -30 -21.5 -20 -22.5 -8 C-23 0 -22.5 6 -21 10 L20.5 10 C22.5 4 22.5 -4 20.5 -12 C18.5 -24 16 -34 16.6 -44 C17.4 -54 22 -60 25 -68 C28 -76 27.5 -86 24 -94 C21.5 -100 17.5 -106 13 -110.5 C9 -113.5 4.5 -114.5 0 -114 Z'
  return (
    <g>
      {neck}
      <path d={coat} fill={url('top')} />
      {/* светр у вирізі */}
      <path d="M2.5 -112.5 L13 -110.4 C17 -100 19.2 -88 18 -76 C15 -85 9 -98 2.5 -112.5 Z" fill={outfit.under} />
      {/* лацкани */}
      <path d="M2 -112 C6 -100 12 -88 17.6 -75 L13.2 -78 C9.6 -86 6 -94 4.4 -101 L-1.8 -104 C-0.6 -107 0.6 -110 2 -112 Z" fill={outfit.topShade} opacity={0.7} />
      <path d="M13 -110.4 C17.6 -100 20.4 -88 18 -76 L21.6 -84 C21.4 -94 18.6 -104 13 -110.4 Z" fill={outfit.topLight} opacity={0.6} />
      {/* пояс */}
      <path d="M-18.2 -44 L16.8 -44 L16.4 -37 L-18 -37 Z" fill={outfit.topShade} />
      <path d="M12 -44 c2 -3 7 -2 6 1.5 c-1 2.6 -5 2 -6 -1.5 Z M14 -38 l-2.4 12 M16 -38 l1.4 11" fill={outfit.topShade} stroke={outfit.topShade} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M15.4 -40 V8" stroke={outfit.topShade} strokeWidth={0.9} opacity={0.7} />
      <path d="M-20 -88 C-17 -74 -17 -60 -15 -46" fill="none" stroke={outfit.topShade} strokeWidth={1.2} opacity={0.4} />
    </g>
  )
}

function ManTorso({ outfit, url, neck }: { outfit: Outfit; url: (n: string) => string; neck: ReactNode }) {
  const silhouette =
    'M-1 -124.5 C-12 -123 -25 -118 -30.5 -109 C-35 -101 -33 -86 -29 -72 C-26 -60 -23.5 -46 -23.5 -32 C-23.5 -18 -24.5 -8 -23 4 L22.5 4 C23.5 -6 22 -18 21.5 -30 C21 -44 23.5 -56 26 -68 C28.5 -80 29.5 -92 27 -102 C25 -110 19 -118 11 -122.5 C7 -124.5 3 -125 -1 -124.5 Z'
  if (outfit.style === 'sweater') {
    return (
      <g>
        {neck}
        <path d={silhouette} fill={url('top')} />
        {/* V-виріз із сорочкою */}
        <path d="M0 -123.5 L14.4 -121 C18.6 -110 19.6 -100 18 -90 C13.6 -98 6.6 -110 0 -123.5 Z" fill={outfit.under} />
        <path d="M14.4 -121 C18.6 -110 19.6 -100 18 -90 C13.6 -98 6.6 -110 0 -123.5" fill="none" stroke={outfit.topShade} strokeWidth={2.2} />
        {/* комір сорочки */}
        <path d="M-0.6 -124 L6.6 -112.4 L9.4 -121.6 Z" fill={outfit.collar} stroke="#a9bccc" strokeWidth={0.5} />
        <path d="M9.4 -122 L16.4 -115 L15 -121.8 Z" fill={outfit.collar} stroke="#a9bccc" strokeWidth={0.5} />
        <path d="M11.4 -114 V-96" stroke="#a9bccc" strokeWidth={0.6} opacity={0.8} />
        <circle cx={11.6} cy={-104} r={0.8} fill="#f4f7fa" />
        {/* резинка */}
        <path d="M-23.4 -4 L22.8 -4 L22.5 4 L-23 4 Z" fill={outfit.topShade} opacity={0.6} />
        <path d="M-17 -3.4 V3.6 M-10 -3.4 V3.6 M-3 -3.4 V3.6 M4 -3.4 V3.6 M11 -3.4 V3.6 M18 -3.4 V3.6" stroke={outfit.topShade} strokeWidth={0.6} opacity={0.6} />
        <path d="M-26 -96 C-22 -80 -21 -62 -20 -44" fill="none" stroke={outfit.topShade} strokeWidth={1.3} opacity={0.45} />
        <path d="M24 -90 C22 -80 21 -70 22 -60" fill="none" stroke={outfit.topLight} strokeWidth={1.2} opacity={0.35} />
      </g>
    )
  }
  // пальто
  return (
    <g>
      {neck}
      <path d={silhouette} fill={url('top')} />
      <path d="M0 -123.5 L14.4 -121 C19 -108 20.4 -92 19.6 -70 C19.2 -50 19 -24 18.6 4 L9 4 C9.6 -30 9.2 -70 6.4 -96 C5 -108 2.6 -116 0 -123.5 Z" fill={outfit.under} />
      <path d="M-0.6 -124 L6.6 -112.4 L9.4 -121.6 Z" fill={outfit.collar} />
      <path d="M0 -123.5 C4 -112 8 -102 9.8 -86 L5 -90 C3.4 -100 0.8 -108 -3 -114 Z" fill={outfit.topShade} />
      <path d="M14.4 -121 C19.6 -110 21.6 -98 21 -84 L25 -92 C24.6 -104 21 -114 14.4 -121 Z" fill={outfit.topLight} opacity={0.7} />
      <path d="M9.6 -86 C9.6 -60 9.4 -30 9 4" stroke={outfit.topShade} strokeWidth={1.4} />
      <path d="M-27 -96 C-23 -80 -22 -62 -21 -44" fill="none" stroke={outfit.topShade} strokeWidth={1.3} opacity={0.5} />
    </g>
  )
}

function ScarfFront({ outfit, woman }: { outfit: Outfit; woman: boolean }) {
  const c = outfit.scarf!
  const d = outfit.scarfShade ?? c
  if (woman) {
    return (
      <g>
        <path d="M-6 -118 C0 -112 10 -111 17 -116 C19 -112 19 -106 16 -102 C8 -99 -2 -102 -8 -108 Z" fill={c} />
        <path d="M12 -106 C16 -96 18 -84 17 -72 L10 -72 C11 -84 9 -96 6 -104 Z" fill={d} />
        <path d="M10 -72 L17 -72 L17.6 -69 L9.6 -69 Z" fill={c} />
        <path d="M-4 -112 C2 -108 9 -107 15 -110" fill="none" stroke={d} strokeWidth={0.9} opacity={0.7} />
      </g>
    )
  }
  return (
    <g>
      <path d="M-8 -128 C0 -121 11 -120 20 -126 C22 -121 22 -114 18 -110 C9 -107 -3 -110 -10 -117 Z" fill={c} />
      <path d="M13 -114 C17 -102 19 -88 18 -74 L10 -74 C11 -88 9 -102 6 -112 Z" fill={d} />
      <path d="M-5 -121 C2 -117 10 -116 17 -119" fill="none" stroke={d} strokeWidth={1} opacity={0.7} />
    </g>
  )
}
