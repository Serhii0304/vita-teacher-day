/**
 * Кольори персонажів та комплекти одягу.
 * Обличчя, зачіски й пропорції однакові в усіх сценах — змінюється лише одяг і світло.
 */
export interface SkinHair {
  skin: string
  skinLight: string
  skinShade: string
  skinDeep: string
  blush: string
  lip: string
  lipDark: string
  hair: string
  hairLight: string
  hairDeep: string
  iris: string
  brow: string
  lash: string
  temple?: string
}

export interface Outfit {
  id: string
  /** Верх: основний колір, світліший, тінь. */
  top: string
  topLight: string
  topShade: string
  /** Видима частина спідньої речі (блуза/сорочка у вирізі). */
  under: string
  underShade: string
  /** Рукави (зазвичай як top). */
  sleeve: string
  sleeveShade: string
  cuff: string
  /** Ноги: брюки або колготки. */
  legs: string
  legsShade: string
  /** Спідниця / поли пальта (якщо є). */
  skirt?: string
  skirtShade?: string
  skirtLen?: number
  /** Взуття. */
  shoe: string
  shoeLight: string
  boot?: boolean
  /** Шарф (якщо є). */
  scarf?: string
  scarfShade?: string
  /** Стиль верху. */
  style: 'cardigan' | 'knit' | 'coat' | 'sweater' | 'coatMan'
  /** Комір сорочки. */
  collar?: string
}

export const VITA_LOOK: SkinHair = {
  skin: '#f0c9a9',
  skinLight: '#f8dcc3',
  skinShade: '#d7a383',
  skinDeep: '#b97d62',
  blush: '#e8988a',
  lip: '#c9757a',
  lipDark: '#9e4f57',
  hair: '#2b1c17',
  hairLight: '#6a4433',
  hairDeep: '#160e0b',
  iris: '#5a3a26',
  brow: '#3a2620',
  lash: '#24160f',
}

export const SERHII_LOOK: SkinHair = {
  skin: '#e7b996',
  skinLight: '#f2cfb1',
  skinShade: '#c9926f',
  skinDeep: '#a8735a',
  blush: '#dc8f7b',
  lip: '#b9786a',
  lipDark: '#8a4f45',
  hair: '#3b2a22',
  hairLight: '#6e5244',
  hairDeep: '#21160f',
  iris: '#4e3a2a',
  brow: '#35251d',
  lash: '#2a1c15',
  temple: '#8f8780',
}

/* ---------- Жінка ---------- */

export const W_TEACHER: Outfit = {
  id: 'w-teacher',
  style: 'cardigan',
  top: '#c98e8c',
  topLight: '#dcaaa5',
  topShade: '#a96d6e',
  under: '#f6eadb',
  underShade: '#dfcdb8',
  sleeve: '#c98e8c',
  sleeveShade: '#a56a6b',
  cuff: '#b97a7b',
  legs: '#e2b496',
  legsShade: '#c99577',
  skirt: '#2f5b5d',
  skirtShade: '#1f4345',
  skirtLen: 0.42,
  shoe: '#5b3a2c',
  shoeLight: '#84593f',
  collar: '#fbf3e7',
}

export const W_HOME: Outfit = {
  id: 'w-home',
  style: 'knit',
  top: '#ecdcc4',
  topLight: '#f7ecdb',
  topShade: '#cdb898',
  under: '#ecdcc4',
  underShade: '#cdb898',
  sleeve: '#e8d6bc',
  sleeveShade: '#c8b190',
  cuff: '#dccaae',
  legs: '#7f8c86',
  legsShade: '#5f6c67',
  shoe: '#c9a58a',
  shoeLight: '#e0c2a8',
}

export const W_AUTUMN: Outfit = {
  id: 'w-autumn',
  style: 'coat',
  top: '#bb8a5d',
  topLight: '#d4a576',
  topShade: '#966641',
  under: '#efe2cf',
  underShade: '#d6c4ab',
  sleeve: '#b8875a',
  sleeveShade: '#8f6240',
  cuff: '#a5764d',
  legs: '#3c3a40',
  legsShade: '#29272c',
  skirt: '#b8875a',
  skirtShade: '#8f6240',
  skirtLen: 0.08,
  shoe: '#4a3123',
  shoeLight: '#6f4a35',
  boot: true,
  scarf: '#c98a8a',
  scarfShade: '#a66b6d',
}

/* ---------- Чоловік ---------- */

export const M_SMART: Outfit = {
  id: 'm-smart',
  style: 'sweater',
  top: '#2f5650',
  topLight: '#467068',
  topShade: '#203d39',
  under: '#cfdbe6',
  underShade: '#a9bccc',
  sleeve: '#2f5650',
  sleeveShade: '#213f3a',
  cuff: '#cfdbe6',
  legs: '#3d3f46',
  legsShade: '#2a2c31',
  shoe: '#5a3826',
  shoeLight: '#7d5236',
  collar: '#e1e9f0',
}

export const M_HOME: Outfit = {
  ...M_SMART,
  id: 'm-home',
  legs: '#4a4d55',
  legsShade: '#33353b',
}

export const M_AUTUMN: Outfit = {
  id: 'm-autumn',
  style: 'coatMan',
  top: '#34404f',
  topLight: '#4b5a6c',
  topShade: '#232c37',
  under: '#2f5650',
  underShade: '#203d39',
  sleeve: '#34404f',
  sleeveShade: '#252e39',
  cuff: '#2c3643',
  legs: '#3a3b40',
  legsShade: '#27282c',
  skirt: '#34404f',
  skirtShade: '#252e39',
  skirtLen: -0.12,
  shoe: '#4b2f20',
  shoeLight: '#6c4630',
  scarf: '#9a8f86',
  scarfShade: '#7a7068',
  collar: '#e1e9f0',
}
