import {
  assertTruthy,
  BackupStatus,
  InstanceBackupJobPayload,
  JobCommands,
  JobPayloadBase,
  JobRecord,
  JobStatus,
  JOB_COMMANDS,
} from '@pockethost/common'
import { includes, isObject } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { PocketbaseClientApi } from './db/PbClient'
import { backupInstance } from './util/backupInstance'
import { dbg, error } from './util/dbg'

export const createJobManager = async (client: PocketbaseClientApi) => {
  const limiter = new Bottleneck({ maxConcurrent: 1 })

  const JOB_HANDLERS: {
    [_ in JobCommands]: (
      unsafeJob: JobRecord<Partial<JobPayloadBase>>
    ) => Promise<void>
  } = {
    [JobCommands.BackupInstance]: async (
      unsafeJob: JobRecord<Partial<InstanceBackupJobPayload>>
    ) => {
      const unsafePayload = unsafeJob.payload
      const { instanceId } = unsafePayload
      assertTruthy(instanceId, `Expected instanceId here`)
      const instance = await client.getInstance(instanceId)
      assertTruthy(instance, `Instance ${instanceId} not found`)
      assertTruthy(
        instance.uid === unsafeJob.userId,
        `Instance ${instanceId} is not owned by user ${unsafeJob.userId}`
      )
      const backupRec = await client.createBackup(instance.id)
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
    },
  }

  const run = async (job: JobRecord<any>) =>
    limiter.schedule(async () => {
      try {
        await client.setJobStatus(job, JobStatus.Queued)
        const { payload } = job
        assertTruthy(isObject(payload), `Payload must be an object`)
        const unsafePayload = payload as Partial<JobPayloadBase>
        const { cmd } = unsafePayload
        assertTruthy(cmd, `Payload must contain command`)
        assertTruthy(
          includes(JOB_COMMANDS, cmd),
          `Payload command not recognized`
        )
        const handler = JOB_HANDLERS[cmd]
        console.log(`Running job ${job.id}`, job)
        await client.setJobStatus(job, JobStatus.Running)
        await handler(job)
        await client.setJobStatus(job, JobStatus.FinishedSuccess)
      } catch (e) {
        await client.rejectJob(job, `${e}`).catch((e) => {
          error(`job ${job.id} failed to reject with ${e}`)
        })
      }
    })

  client.onNewJob(run)
  await client.resetJobs()
  await client.resetBackups()
  const jobs = await client.incompleteJobs()
  jobs.forEach(run)
}
