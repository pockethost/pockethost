import { exec } from 'child_process'
import { globSync } from 'glob'
import { DATA_ROOT } from '../../../../core'

export const compact = async () => {
  const files = [`data`, `logs`].flatMap((db) =>
    globSync(`${DATA_ROOT()}/*/pb_data/${db}.db{-shm,-wal}`),
  )

  files.map(async (file) => {
    console.log(`Compacting ${file}`)
    exec(`sqlite3 ${file} ".tables"`)
  })
  console.log(`Compaction complete`)
}
