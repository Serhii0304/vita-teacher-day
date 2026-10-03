import type { Params } from '../engine/moves'
import type { BodySpec } from './body'

/**
 * Параметри пози (усі числа — щоб їх можна було плавно інтерполювати):
 *  x, y, sc, flip      — положення персонажа у сцені, масштаб, напрям (1 вправо / -1 вліво)
 *  px, py              — зсув таза від положення стоячи
 *  lean                — нахил корпусу (°; + уперед)
 *  head, turn          — нахил голови (°; + підборіддя вниз), поворот обличчя 0 анфас … 1 три чверті
 *  nhx, nhy / fhx, fhy — ціль зап’ястя ближньої/дальньої руки відносно плеча (система торса)
 *  nw, fw, nA, fA      — поворот кисті; nA=1 — абсолютний кут (предмет тримається рівно)
 *  nHand, fHand        — форма кисті: 0 розслаблена, 1 тримає, 2 відкрита, 3 телефон, 4 лежить
 *  fFront              — дальня рука перед корпусом (обидві руки тримають предмет)
 *  nfx, nfy, nfr / ffx, ffy, ffr — ступні (x, підйом, поворот стопи)
 *  smile, open, brow, browIn, eye, squint, lookX, lookY, blush, talk, nod — міміка
 *  propN, propF        — предмет у руці: 0 — нічого, 1 книга, 2 чашка, 3 телефон, 4 букет, 5 зошити
 *  bookOpen, bloom, steam — стан предметів
 *  breath, idle, wind  — амплітуди «живих» рухів
 *  nSw, fSw            — розмах рук під час ходи
 *  nFS, fFS            — перспективне скорочення руки (0…1), напр. телефон біля вуха
 *  lFS                 — перспективне скорочення стегон (сидячи обличчям до глядача)
 *  vis                 — прозорість персонажа
 */
export const PROP = { none: 0, book: 1, cup: 2, phone: 3, bouquet: 4, notebooks: 5 } as const
export const HAND = { relaxed: 0, hold: 1, open: 2, phone: 3, rest: 4 } as const

export function restPose(body: BodySpec): Params {
  return {
    x: 0,
    y: 0,
    sc: 1,
    flip: 1,
    px: 0,
    py: 0,
    lean: 0,
    head: 0,
    turn: 0.75,
    nhx: 4,
    nhy: body.upper + body.fore - 5,
    nw: 0,
    nA: 0,
    nHand: 0,
    fhx: 1,
    fhy: body.upper + body.fore - 6,
    fw: 0,
    fA: 0,
    fHand: 0,
    fFront: 0,
    nfx: body.footN,
    nfy: 0,
    nfr: 0,
    ffx: body.footF,
    ffy: 0,
    ffr: 0,
    smile: 0.3,
    open: 0,
    brow: 0,
    browIn: 0,
    eye: 1,
    squint: 0,
    lookX: 0.2,
    lookY: 0,
    blush: 0,
    talk: 0,
    nod: 0,
    propN: 0,
    propF: 0,
    bookOpen: 0,
    bloom: 1,
    steam: 0,
    breath: 1,
    idle: 1,
    wind: 0,
    nSw: 1,
    fSw: 1,
    nFS: 0,
    fFS: 0,
    lFS: 0,
    vis: 1,
  }
}

/** Готові вирази обличчя (часткові набори параметрів). */
export const FACE = {
  calm: { smile: 0.3, open: 0, brow: 0, browIn: 0, squint: 0, eye: 1 },
  warm: { smile: 0.72, open: 0, brow: 0.15, browIn: 0, squint: 0.12, eye: 1 },
  beam: { smile: 1, open: 0.32, brow: 0.3, browIn: 0, squint: 0.2, eye: 1 },
  listen: { smile: 0.38, open: 0, brow: 0.28, browIn: 0.1, squint: 0, eye: 1 },
  concern: { smile: -0.15, open: 0, brow: 0.05, browIn: 0.75, squint: 0, eye: 0.88 },
  relief: { smile: 0.5, open: 0, brow: 0.1, browIn: 0.15, squint: 0.1, eye: 0.42 },
  peace: { smile: 0.55, open: 0, brow: 0, browIn: 0, squint: 0.1, eye: 0.12 },
  surprise: { smile: 0.55, open: 0.22, brow: 0.7, browIn: 0, squint: 0, eye: 1.15 },
} satisfies Record<string, Params>
