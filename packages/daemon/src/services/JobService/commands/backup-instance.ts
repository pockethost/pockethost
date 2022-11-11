import {
  assertTruthy,
  BackupRecord,
  BackupRecordId,
  BackupRecord_Create,
  BackupRecord_Update,
  BackupStatus,
  createTimerManager,
  InstanceId,
  InstancesRecord,
} from '@pockethost/common'
import pocketbaseEs from 'pocketbase'
import { JobHandler, KnexApi } from '..'
import { safeCatch } from '../../../util/safeAsync'

export const CMD_BACKUP_INSTANCE = 'backup-instance'

export type InstanceBackupJobPayload = {
  cmd: typeof CMD_BACKUP_INSTANCE
  instanceId: InstanceId
}

export type CommandFactory<TPayload> = (
  client: pocketbaseEs,
  knex: KnexApi
) => Promise<JobHandler<TPayload>>

const createBackupHandler: CommandFactory<InstanceBackupJobPayload> = async (
  client,
  knex
) => {
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
        status: BackupStatus.Queued,
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
    knex('backups')
      .whereNotIn('status', [
        BackupStatus.FinishedError,
        BackupStatus.FinishedSuccess,
      ])
      .delete()
  )

  const getNextBackupJob = safeCatch(`getNextBackupJob`, async () => {
    return client
      .collection('backups')
      .getList<BackupRecord>(1, 1, {
        filter: `status = '${BackupStatus.Queued}'`,
      })
      .then((recs) => {
        return recs.items[0] || null
      })
  })

  await resetBackups()

  const tm = createTimerManager({})
  tm.everyAsync(async () => {
    const backupRec = await getNextBackupJob()
    if (!backupRec) {
      dbg(`No backups requested`)
      return
    }
    const instance = await getInstance(backupRec.instanceId)
    try {
      await updateBackup(backupRec.id, {
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

  return async (unsafeJob) => {
    const unsafePayload = unsafeJob.payload
    const { instanceId } = unsafePayload
    assertTruthy(instanceId, `Expected instanceId here`)
    const instance = await client.collection('instances').getOne(instanceId)
    assertTruthy(instance, `Instance ${instanceId} not found`)
    assertTruthy(
      instance.uid === unsafeJob.userId,
      `Instance ${instanceId} is not owned by user ${unsafeJob.userId}`
    )
    await createBackup(instance.id)
  }
}
