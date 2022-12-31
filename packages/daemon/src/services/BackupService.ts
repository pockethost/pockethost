import {
  assertTruthy,
  BackupFields,
  BackupInstancePayload,
  BackupInstancePayloadSchema,
  BackupInstanceResult,
  BackupStatus,
  createTimerManager,
  logger,
  mkSingleton,
  RestoreInstancePayload,
  RestoreInstancePayloadSchema,
  RestoreInstanceResult,
  RpcCommands,
} from '@pockethost/common'
import Bottleneck from 'bottleneck'
import { clientService } from '../clientService/clientService'
import { backupInstance } from '../util/backupInstance'
import { rpcService } from './RpcService'

export const backupService = mkSingleton(async () => {
  const { dbg } = logger().create('BackupService')
  const client = await clientService()

  const { registerCommand } = await rpcService()

  registerCommand<BackupInstancePayload, BackupInstanceResult>(
    RpcCommands.BackupInstance,
    BackupInstancePayloadSchema,
    async (job) => {
      const { payload } = job
      const { instanceId } = payload
      const instance = await client.getInstance(instanceId)
      assertTruthy(instance, `Instance ${instanceId} not found`)
      assertTruthy(
        instance.uid === job.userId,
        `Instance ${instanceId} is not owned by user ${job.userId}`
      )
      const backup = await client.createBackup(instance.id)
      return { backupId: backup.id }
    }
  )

  registerCommand<RestoreInstancePayload, RestoreInstanceResult>(
    RpcCommands.RestoreInstance,
    RestoreInstancePayloadSchema,
    async (job) => {
      const { payload } = job
      const { backupId } = payload
      const backup = await client.getBackupJob(backupId)
      assertTruthy(backup, `Backup ${backupId} not found`)
      const instance = await client.getInstance(backup.instanceId)
      assertTruthy(instance, `Instance ${backup.instanceId} not found`)
      assertTruthy(
        instance.uid === job.userId,
        `Backup ${backupId} is not owned by user ${job.userId}`
      )

      /**
       * Restore strategy:
       *
       * 1. Place instance in maintenance mode
       * 2. Shut down instance
       * 3. Back up
       * 4. Restore
       * 5. Lift maintenance mode
       */
      const restore = await client.createBackup(instance.id)
      return { restoreId: restore.id }
    }
  )

  const tm = createTimerManager({})
  const limiter = new Bottleneck({ maxConcurrent: 1 })
  tm.repeat(async () => {
    const backupRec = await client.getNextBackupJob()
    if (!backupRec) {
      // dbg(`No backups requested`)
      return true
    }
    const instance = await client.getInstance(backupRec.instanceId)
    const _update = (fields: Partial<BackupFields>) =>
      limiter.schedule(() => client.updateBackup(backupRec.id, fields))
    try {
      await _update({
        status: BackupStatus.Running,
      })
      let progress = backupRec.progress || {}
      const bytes = await backupInstance(
        instance.id,
        backupRec.id,
        (_progress) => {
          progress = { ...progress, ..._progress }
          dbg(_progress)
          return _update({
            progress,
          })
        }
      )
      await _update({
        bytes,
        status: BackupStatus.FinishedSuccess,
      })
    } catch (e) {
      const message = (() => {
        const s = `${e}`
        if (s.match(/ENOENT/)) {
          return `Backup failed because instance has never been used. Go to the instance admin to use the instance for the first time.`
        }
        return s
      })()
      await _update({
        status: BackupStatus.FinishedError,
        message,
      })
    }
    return true
  }, 1000)

  const shutdown = () => {
    tm.shutdown()
  }
  return {
    shutdown,
  }
})
