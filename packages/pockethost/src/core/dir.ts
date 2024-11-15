import { existsSync, mkdirSync } from 'fs'
import { Logger } from '../common'
import { mkInstanceDataPath } from '../constants'

export function ensureInstanceDirectoryStructure(
  instanceId: string,
  logger: Logger,
) {
  const { dbg } = logger
  ;['pb_data', 'pb_migrations', 'pb_public', 'logs', 'pb_hooks'].forEach(
    (dir) => {
      const path = mkInstanceDataPath(instanceId, dir)
      if (!existsSync(path)) {
        dbg(`Creating ${path}`)
        mkdirSync(path, { recursive: true })
      }
    },
  )
}
