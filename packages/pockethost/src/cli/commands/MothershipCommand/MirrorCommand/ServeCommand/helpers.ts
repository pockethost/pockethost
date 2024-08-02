import { join } from 'path'
import { PH_MOTHERSHIP_MIRROR_PORT } from '../../../../../constants'

export const mkMothershipMirrorUrl = (...paths: string[]) =>
  join(`http://localhost:${PH_MOTHERSHIP_MIRROR_PORT()}`, ...paths)
