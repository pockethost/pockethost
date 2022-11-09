import {
  BackupRecord,
  BackupRecordId,
  BackupRecord_In,
  BackupStatus,
  InstanceId,
} from '@pockethost/common'
import { safeCatch } from '../util/safeAsync'
import { MixinContext } from './PbClient'

export type BackupApi = ReturnType<typeof createBackupMixin>

export const createBackupMixin = (context: MixinContext) => {
  const { client, rawDb } = context

  const createBackup = safeCatch(
    `createBackup`,
    async (instanceId: InstanceId) => {
      const rec: BackupRecord_In = {
        instanceId,
        status: BackupStatus.New,
      }
      const created = await client
        .collection('backups')
        .create<BackupRecord>(rec)
      return created
    }
  )

  const updateBackup = safeCatch(
    `updateBackup`,
    async (backupId: BackupRecordId, fields: Partial<BackupRecord>) => {
      await client.collection('backups').update(backupId, fields)
    }
  )
  return {
    createBackup,
    updateBackup,
  }
}
