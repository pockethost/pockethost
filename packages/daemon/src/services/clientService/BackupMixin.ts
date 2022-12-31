import {
  BackupFields,
  BackupFields_Create,
  BackupFields_Update,
  BackupRecordId,
  BackupStatus,
  InstanceFields,
  InstanceId,
  logger,
} from '@pockethost/common'
import { safeCatch } from '../../util/promiseHelper'
import { MixinContext } from './PbClient'

export type BackupApi = ReturnType<typeof createBackupMixin>

export const createBackupMixin = (context: MixinContext) => {
  const { dbg } = logger().create('BackupMixin')

  const { client, rawDb } = context

  const createBackup = safeCatch(
    `createBackup`,
    async (instanceId: InstanceId) => {
      const instance = await client
        .collection('instances')
        .getOne<InstanceFields>(instanceId)
      if (!instance) {
        throw new Error(`Expected ${instanceId} to be a valid instance`)
      }
      const { platform, version } = instance
      const rec: BackupFields_Create = {
        instanceId,
        status: BackupStatus.Queued,
        platform,
        version,
      }
      const created = await client
        .collection('backups')
        .create<BackupFields>(rec)
      return created
    }
  )

  const updateBackup = safeCatch(
    `updateBackup`,
    async (backupId: BackupRecordId, fields: BackupFields_Update) => {
      await client.collection('backups').update(backupId, fields)
    }
  )

  const resetBackups = safeCatch(`resetBackups`, async () =>
    rawDb('backups')
      .whereNotIn('status', [
        BackupStatus.FinishedError,
        BackupStatus.FinishedSuccess,
      ])
      .delete()
  )

  const getNextBackupJob = safeCatch(`getNextBackupJob`, async () => {
    return client
      .collection('backups')
      .getList<BackupFields>(1, 1, {
        filter: `status = '${BackupStatus.Queued}'`,
      })
      .then((recs) => {
        return recs.items[0] || null
      })
  })

  const getBackupJob = safeCatch(
    `getBackupJob`,
    async (backupId: BackupRecordId) => {
      return client.collection('backups').getOne<BackupFields>(backupId)
    }
  )

  return {
    createBackup,
    updateBackup,
    resetBackups,
    getNextBackupJob,
    getBackupJob,
  }
}
