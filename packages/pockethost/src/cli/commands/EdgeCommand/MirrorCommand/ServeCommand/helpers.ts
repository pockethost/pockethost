import { join } from 'path'
import { PH_EDGE_MIRROR_PORT } from '../../../../../constants'

export const mkEdgeMirrorUrl = (...paths: string[]) =>
  join(`http://localhost:${PH_EDGE_MIRROR_PORT()}`, ...paths)
