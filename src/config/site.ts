/**
 * Усі видимі тексти, імена та шлях до запису — в одному місці.
 * Шлях до аудіо задається відносно базового шляху сайту (працює і в корені домену,
 * і в підпапці на GitHub Pages).
 */
export const SITE = {
  recipient: 'Віта',
  sender: 'Сергій',
  storyTitle: 'Тепло простих розмов',
  /** Підпис на сторінці альбому у вступі (родовий відмінок імені, не кличний). */
  albumDedication: 'для Віти',
  intro: {
    title: 'Віта, з Днем Вчителя!',
    subtitle: 'Для тебе — пісня і маленька історія про тепло простих розмов',
    button: 'Відкрити музичне привітання',
    signature: 'З теплом, Сергій',
  },
  chorusBanner: 'З Днем Вчителя!',
  final: {
    message: 'Віта, нехай у твоєму житті буде більше світла, миру й теплих розмов',
    signature: 'З теплом, Сергій',
    replay: 'Послухати ще раз',
  },
  /** Файл пісні: public/audio/vita-teacher-day.mp3 */
  audioFile: 'audio/vita-teacher-day.mp3',
} as const

export const audioUrl = () => `${import.meta.env.BASE_URL}${SITE.audioFile}`
