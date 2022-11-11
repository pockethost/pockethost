import { BackupStatus, createTimerManager } from '@pockethost/common'
import Bottleneck from 'bottleneck'
import { PocketbaseClientApi } from '../db/PbClient'
import { backupInstance } from '../util/backupInstance'
import { dbg } from '../util/dbg'

export const createBackupService = async (client: PocketbaseClientApi) => {
  const limiter = new Bottleneck({ maxConcurrent: 1 })

  const tm = createTimerManager({})
  tm.everyAsync(async () => {
    const backupRec = await client.getNextBackupJob()
    if (!backupRec) {
      dbg(`No backups requested`)
      return
    }
    const instance = await client.getInstance(backupRec.instanceId)
    try {
      await client.updateBackup(backupRec.id, {
        status: BackupStatus.Running,
      })
      let progress = backupRec.progress || {}
      const bytes = await backupInstance(
        instance,
        backupRec.id,
        (_progress) => {
          progress = { ...progress, ..._progress }
          dbg(_progress)
          return client.updateBackup(backupRec.id, {
            progress,
          })
        }
      )
      await client.updateBackup(backupRec.id, {
        bytes,
        status: BackupStatus.FinishedSuccess,
      })
    } catch (e) {
      await client.updateBackup(backupRec.id, {
        status: BackupStatus.FinishedError,
        message: `${e}`,
      })
    }
  }, 1000)

  const shutdown = () => {
    tm.shutdown()
  }
  return {
    shutdown,
  }
}
