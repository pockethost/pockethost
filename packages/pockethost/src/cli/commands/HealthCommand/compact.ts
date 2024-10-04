import { exec } from 'child_process'
import { globSync } from 'glob'
import { DATA_ROOT } from '../../../../core'
import { logger } from '../../../common/Logger'

export const compact = async () => {
  const { info } = logger()

  const files = [`data`, `logs`].flatMap((db) =>
    globSync(`${DATA_ROOT()}/*/pb_data/${db}.db{-shm,-wal}`),
  )

  files.map(async (file) => {
    info(`Compacting ${file}`)
    exec(`sqlite3 ${file} ".tables"`)
  })
  info(`Compaction complete`)
}
