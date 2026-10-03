/**
 * Текст пісні «Тепло простих розмов» — звичайним українським правописом.
 * Службові назви секцій живуть тільки в даних; у субтитри потрапляє лише `text`.
 * Повторні приспіви мають окремі ідентифікатори (c1-*, c2-*, f-*).
 */
export interface LyricLine {
  id: string
  section: SectionId
  text: string
}

export type SectionId =
  | 'intro'
  | 'verse1'
  | 'chorus1'
  | 'verse2'
  | 'chorus2'
  | 'interlude'
  | 'bridge'
  | 'final'
  | 'outro'
  | 'ending'

const CHORUS = [
  'З Днем Вчителя, Віта, я тебе вітаю!',
  'Миру, радості й здоров’я щиро побажаю.',
  'Хай тобі вертається все віддане тепло,',
  'Щоб і в серці, і у домі сонячно було.',
]

const chorus = (prefix: string, section: SectionId): LyricLine[] =>
  CHORUS.map((text, i) => ({ id: `${prefix}-${i + 1}`, section, text }))

export const LYRICS: LyricLine[] = [
  { id: 'v1-1', section: 'verse1', text: 'За вікном шкільним кружляє листя знову,' },
  { id: 'v1-2', section: 'verse1', text: 'І лунає в коридорах сміх дітей.' },
  { id: 'v1-3', section: 'verse1', text: 'Ти для кожного знаходиш добре слово,' },
  { id: 'v1-4', section: 'verse1', text: 'Відкриваєш їм красу простих речей.' },
  { id: 'v1-5', section: 'verse1', text: 'А коли до тебе вечір завітає,' },
  { id: 'v1-6', section: 'verse1', text: 'Хай турботи потихеньку відійдуть.' },
  { id: 'v1-7', section: 'verse1', text: 'Хай і серце вчительське відпочиває,' },
  { id: 'v1-8', section: 'verse1', text: 'Хай тебе шанують, чують, бережуть.' },
  ...chorus('c1', 'chorus1'),
  { id: 'v2-1', section: 'verse2', text: 'Так непросто в цьому світі відшукати' },
  { id: 'v2-2', section: 'verse2', text: 'Тих, кому відкриєш серце без прикрас,' },
  { id: 'v2-3', section: 'verse2', text: 'З ким і успіх, і невдачу розділяти,' },
  { id: 'v2-4', section: 'verse2', text: 'Хто за сотнею історій чує нас.' },
  { id: 'v2-5', section: 'verse2', text: 'Ми говоримо — й години непомітно' },
  { id: 'v2-6', section: 'verse2', text: 'Пропливають, мов хмаринки за вікном.' },
  { id: 'v2-7', section: 'verse2', text: 'Від простих розмов стає на серці світло,' },
  { id: 'v2-8', section: 'verse2', text: 'І звичайний вечір повниться теплом.' },
  ...chorus('c2', 'chorus2'),
  { id: 'b-1', section: 'bridge', text: 'Сподіваюсь, станем ближчими з тобою,' },
  { id: 'b-2', section: 'bridge', text: 'І для щирих слів завжди знайдеться час,' },
  { id: 'b-3', section: 'bridge', text: 'Щоб ділитися і радістю, й журбою,' },
  { id: 'b-4', section: 'bridge', text: 'Щоб життя ще більше поєднало нас.' },
  ...chorus('f', 'final'),
  { id: 'o-1', section: 'outro', text: 'З Днем Вчителя, Віта…' },
  { id: 'o-2', section: 'outro', text: 'Хай тобі буде тепло.' },
]

/**
 * Субтитри показуються змістовими блоками по одному–два рядки.
 * Межі блоків збігаються з музичними фразами запису.
 */
export const LYRIC_BLOCKS: string[][] = [
  ['v1-1', 'v1-2'],
  ['v1-3', 'v1-4'],
  ['v1-5', 'v1-6'],
  ['v1-7', 'v1-8'],
  ['c1-1', 'c1-2'],
  ['c1-3', 'c1-4'],
  ['v2-1', 'v2-2'],
  ['v2-3', 'v2-4'],
  ['v2-5', 'v2-6'],
  ['v2-7', 'v2-8'],
  ['c2-1', 'c2-2'],
  ['c2-3', 'c2-4'],
  ['b-1', 'b-2'],
  ['b-3', 'b-4'],
  ['f-1', 'f-2'],
  ['f-3', 'f-4'],
  ['o-1'],
  ['o-2'],
]

/** Строфи для вікна «Текст пісні» (без службових позначок). */
export const STANZAS: string[][] = [
  ['v1-1', 'v1-2', 'v1-3', 'v1-4'],
  ['v1-5', 'v1-6', 'v1-7', 'v1-8'],
  ['c1-1', 'c1-2', 'c1-3', 'c1-4'],
  ['v2-1', 'v2-2', 'v2-3', 'v2-4'],
  ['v2-5', 'v2-6', 'v2-7', 'v2-8'],
  ['c2-1', 'c2-2', 'c2-3', 'c2-4'],
  ['b-1', 'b-2', 'b-3', 'b-4'],
  ['f-1', 'f-2', 'f-3', 'f-4'],
  ['o-1', 'o-2'],
]

export const LYRIC_BY_ID: Record<string, LyricLine> = Object.fromEntries(LYRICS.map((l) => [l.id, l]))
