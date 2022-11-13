import {
  assertTruthy,
  BackupStatus,
  createTimerManager,
  InstanceBackupJobPayload,
  InstanceRestoreJobPayload,
  JobCommands,
} from '@pockethost/common'
import { PocketbaseClientApi } from '../db/PbClient'
import { backupInstance } from '../util/backupInstance'
import { dbg } from '../util/dbg'
import { JobServiceApi } from './JobService'

export const createBackupService = async (
  client: PocketbaseClientApi,
  jobService: JobServiceApi
) => {
  jobService.registerCommand<InstanceBackupJobPayload>(
    JobCommands.BackupInstance,
    async (unsafeJob) => {
      const unsafePayload = unsafeJob.payload
      const { instanceId } = unsafePayload
      assertTruthy(instanceId, `Expected instanceId here`)
      const instance = await client.getInstance(instanceId)
      assertTruthy(instance, `Instance ${instanceId} not found`)
      assertTruthy(
        instance.uid === unsafeJob.userId,
        `Instance ${instanceId} is not owned by user ${unsafeJob.userId}`
      )
      await client.createBackup(instance.id)
    }
  )

  jobService.registerCommand<InstanceRestoreJobPayload>(
    JobCommands.RestoreInstance,
    async (unsafeJob) => {
      const unsafePayload = unsafeJob.payload
      const { backupId } = unsafePayload
      assertTruthy(backupId, `Expected backupId here`)
      const backup = await client.getBackupJob(backupId)
      assertTruthy(backup, `Backup ${backupId} not found`)
      const instance = await client.getInstance(backup.instanceId)
      assertTruthy(instance, `Instance ${backup.instanceId} not found`)
      assertTruthy(
        instance.uid === unsafeJob.userId,
        `Backup ${backupId} is not owned by user ${unsafeJob.userId}`
      )
      await client.createBackup(instance.id)
    }
  )

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
