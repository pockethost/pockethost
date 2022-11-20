import {
  assertTruthy,
  JobCommands,
  JobPayloadBase,
  JobRecord,
  JobStatus,
} from '@pockethost/common'
import { isObject } from '@s-libs/micro-dash'
import Bottleneck from 'bottleneck'
import { default as knexFactory } from 'knex'
import pocketbaseEs from 'pocketbase'
import { AsyncReturnType } from 'type-fest'
import { PocketbaseClientApi } from '../db/PbClient'
import { dbg, error } from '../util/logger'

export type JobServiceApi = AsyncReturnType<typeof createJobService>

export type KnexApi = ReturnType<typeof knexFactory>
export type CommandModuleInitializer = (
  register: JobServiceApi['registerCommand'],
  client: pocketbaseEs,
  knex: KnexApi
) => void

export type JobHandler<TPayload> = (
  unsafeJob: JobRecord<Partial<TPayload>>
) => Promise<void>

export const createJobService = async (client: PocketbaseClientApi) => {
  const limiter = new Bottleneck({ maxConcurrent: 1 })

  const jobHandlers: {
    [_ in JobCommands]?: JobHandler<any>
  } = {}

  const run = async (job: JobRecord<any>) =>
    limiter.schedule(async () => {
      try {
        await client.setJobStatus(job, JobStatus.Queued)
        const { payload } = job
        assertTruthy(isObject(payload), `Payload must be an object`)
        const unsafePayload = payload as Partial<JobPayloadBase>
        const { cmd } = unsafePayload
        assertTruthy(cmd, `Payload must contain command`)
        const handler = jobHandlers[cmd]
        if (!handler) {
          throw new Error(`Job handler ${cmd} is not registered`)
        }
        dbg(`Running job ${job.id}`, job)
        await client.setJobStatus(job, JobStatus.Running)
        await handler(job)
        await client.setJobStatus(job, JobStatus.FinishedSuccess)
      } catch (e) {
        await client.rejectJob(job, `${e}`).catch((e) => {
          error(`job ${job.id} failed to reject with ${e}`)
        })
      }
    })

  const unsub = await client.onNewJob(run)
  await client.resetJobs()
  await client.resetBackups()
  const jobs = await client.incompleteJobs()
  jobs.forEach(run)

  const shutdown = () => {
    unsub()
  }

  const registerCommand = <TPayload>(
    commandName: JobCommands,
    handler: JobHandler<TPayload>
  ) => {
    if (jobHandlers[commandName]) {
      throw new Error(`${commandName} job handler already registered.`)
    }
    jobHandlers[commandName] = handler
  }

  return {
    registerCommand,
    shutdown,
  }
}
