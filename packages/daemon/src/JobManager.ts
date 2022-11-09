import { JobRecord } from '@pockethost/common'
import Bottleneck from 'bottleneck'
import { PocketbaseClientApi } from './db/PbClient'

export const createJobManager = async (client: PocketbaseClientApi) => {
  const limiter = new Bottleneck({ maxConcurrent: 1 })
  const run = async (job: JobRecord<any>) =>
    limiter.schedule(async () => {
      console.log(`Running job ${job.id}`, job)
    })

  client.onNewJob(run)
  await client.resetJobs()
  const jobs = await client.incompleteJobs()
  jobs.forEach(run)
}
