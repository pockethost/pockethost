import { execSync } from 'child_process'
import { globSync } from 'glob'
import { DATA_ROOT, logger } from '../../..'

export const compact = async () => {
  const { info, error } = logger()

  const files = [
    ...new Set(
      [`data`, `logs`].flatMap((db) =>
        globSync(`${DATA_ROOT()}/*/pb_data/${db}.db{-shm,-wal}`).map((f) =>
          f.replace(/-(?:shm|wal)$/, ''),
        ),
      ),
    ),
  ]

  info(`Compacting ${files.length} files`, { files })

  files.forEach((file) => {
    const { info, error } = logger().child(file)
    const cmd = `sqlite3 ${file} ".tables"`
    info(cmd)
    try {
      execSync(cmd)
      info(`Finished compacting`)
    } catch (e) {
      error(`Error compacting`, e)
    }
  })
  // console.log('Compaction complete')
  info(`Compaction complete`)
}
