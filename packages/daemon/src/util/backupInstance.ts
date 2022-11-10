import {
  BackupRecordId,
  createTimerManager,
  InstancesRecord,
} from '@pockethost/common'
import { statSync } from 'fs'
import { resolve } from 'path'
import { chdir } from 'process'
import { Database } from 'sqlite3'
import { DAEMON_PB_DATA_DIR } from '../constants'
import { pexec } from '../migrate/pexec'
import { dbg } from './dbg'
import { ensureDirExists } from './ensureDirExists'

export const backupInstance = async (
  instance: InstancesRecord,
  backupId: BackupRecordId,
  progress?: (pct: number) => Promise<void>
) => {
  const instanceId = instance.id
  const dataRoot = resolve(DAEMON_PB_DATA_DIR, instanceId)
  const backupRoot = resolve(dataRoot, 'backup')
  const backupFile = resolve(backupRoot, `${backupId}.tgz`)
  dbg(`Backing up ${dataRoot}`)
  chdir(dataRoot)
  ensureDirExists(backupRoot)
  const db = new Database(`pb_data/data.db`)
  const backup = db.backup(`pb_data/data.db.bak`)
  const tm = createTimerManager({})
  await new Promise<void>((resolve, reject) => {
    const _work = async () => {
      const pct =
        backup.remaining === -1 ? 0 : 1 - backup.remaining / backup.pageCount
      console.log(pct, backup.completed, backup.failed)
      if (backup.failed) {
        reject()
        return
      }
      if (backup.completed) {
        backup.finish()
        resolve()
        return
      }
      await progress?.(pct)
      if (backup.idle) {
        backup.step(5)
      }
      setTimeout(_work, 100)
    }
    _work()
  })
  // await pexec(`sqlite3 pb_data/data.db '.backup data.bak'`)
  await pexec(`tar -czvf ${backupFile} pb_data`)
  const stats = statSync(backupFile)
  const bytes = stats.size
  return bytes
}
