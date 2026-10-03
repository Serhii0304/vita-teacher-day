import type { SceneEntry } from '../stage/StoryStage'
import { BookScene } from './BookScene'
import { ClassroomScene } from './ClassroomScene'
import { Chorus1Scene } from './Chorus1Scene'
import { EveningScene } from './EveningScene'
import { GardenScene } from './GardenScene'
import { PhoneScene } from './PhoneScene'
import { WindowsScene } from './WindowsScene'

export const SCENES: SceneEntry[] = [
  { id: 'book', Component: BookScene },
  { id: 'classroom', Component: ClassroomScene },
  { id: 'evening', Component: EveningScene },
  { id: 'chorus1', Component: Chorus1Scene },
  { id: 'phone', Component: PhoneScene },
  { id: 'windows', Component: WindowsScene },
  { id: 'garden', Component: GardenScene },
]
