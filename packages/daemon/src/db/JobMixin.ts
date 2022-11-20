import { JobRecord, JobStatus } from '@pockethost/common'
import { safeCatch } from '../util/promiseHelper'
import { MixinContext } from './PbClient'

export enum RecordSubscriptionActions {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

export const createJobMixin = (context: MixinContext) => {
  const { client, rawDb } = context
  const onNewJob = safeCatch(
    `onNewJob`,
    async (cb: (e: JobRecord<any>) => void) => {
      const unsub = await client
        .collection('jobs')
        .subscribe<JobRecord<any>>('*', (e) => {
          if (e.action !== RecordSubscriptionActions.Create) return
          cb(e.record)
        })
      return unsub
    }
  )

  const resetJobs = safeCatch(`resetJobs`, async () =>
    rawDb('jobs')
      .whereNotIn('status', [
        JobStatus.FinishedError,
        JobStatus.FinishedSuccess,
      ])
      .update({
        status: JobStatus.New,
      })
  )

  const incompleteJobs = safeCatch(`incompleteJobs`, async () => {
    return client.collection('jobs').getFullList<JobRecord<any>>(100, {
      filter: `status != '${JobStatus.FinishedError}' && status != '${JobStatus.FinishedSuccess}'`,
    })
  })

  const rejectJob = safeCatch(
    `rejectJob`,
    async (job: JobRecord<any>, message: string) => {
      return client
        .collection('jobs')
        .update(job.id, { status: JobStatus.FinishedError, message })
    }
  )

  const setJobStatus = safeCatch(
    `setJobStatus`,
    async (job: JobRecord<any>, status: JobStatus) => {
      return client.collection('jobs').update(job.id, { status })
    }
  )

  return { incompleteJobs, resetJobs, onNewJob, rejectJob, setJobStatus }
}
