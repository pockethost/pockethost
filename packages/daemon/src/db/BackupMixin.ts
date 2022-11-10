import {
  BackupRecord,
  BackupRecordId,
  BackupRecord_Create,
  BackupRecord_Update,
  BackupStatus,
  InstanceId,
  InstancesRecord,
} from '@pockethost/common'
import { safeCatch } from '../util/safeAsync'
import { MixinContext } from './PbClient'

export type BackupApi = ReturnType<typeof createBackupMixin>

export const createBackupMixin = (context: MixinContext) => {
  const { client, rawDb } = context

  const createBackup = safeCatch(
    `createBackup`,
    async (instanceId: InstanceId) => {
      const instance = await client
        .collection('instances')
        .getOne<InstancesRecord>(instanceId)
      if (!instance) {
        throw new Error(`Expected ${instanceId} to be a valid instance`)
      }
      const { platform, version } = instance
      const rec: BackupRecord_Create = {
        instanceId,
        status: BackupStatus.New,
        platform,
        version,
      }
      const created = await client
        .collection('backups')
        .create<BackupRecord>(rec)
      return created
    }
  )

  const updateBackup = safeCatch(
    `updateBackup`,
    async (backupId: BackupRecordId, fields: BackupRecord_Update) => {
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

  return {
    createBackup,
    updateBackup,
    resetBackups,
  }
}
