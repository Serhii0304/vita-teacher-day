import { audioUrl } from '../config/site'
import { AudioPlayer } from './AudioPlayer'

/** Один аудіоелемент на всю сторінку: повторні натискання не дублюють звук. */
let instance: AudioPlayer | null = null

export function getEngine(): AudioPlayer {
  if (!instance) instance = new AudioPlayer(audioUrl())
  return instance
}
