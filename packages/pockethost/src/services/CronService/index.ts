import {
  InstanceFields,
  InstanceId,
  LoggerService,
  mkInstanceUrl,
  mkSingleton,
  MothershipAdminClientService,
  SingletonBaseConfig,
} from '@'
import Bottleneck from 'bottleneck'
import { CronJob } from 'cron'
import { MothershipMirrorService } from '../MothershipMirrorService'

export type CronServiceConfig = SingletonBaseConfig & {}

export const CronService = mkSingleton(async (config: Partial<CronServiceConfig>) => {
  const mirror = await MothershipMirrorService()
  const logger = (config.logger ?? LoggerService()).create(`CronService`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  const { client } = await MothershipAdminClientService()

  const limiter = new Bottleneck({ maxConcurrent: 10 })
  const jobs: Map<InstanceId, Set<CronJob>> = new Map()

  const removeJobsForInstanceId = (instanceId: InstanceId) => {
    if (jobs.has(instanceId)) {
      dbg(`Stopping jobs for instance ${instanceId}`)
      jobs.get(instanceId)?.forEach((job) => {
        job.stop()
      })
      dbg(`Deleted jobs for instance ${instanceId}`)
      jobs.delete(instanceId)
    }
  }

  const upsertInstance = async (instance: InstanceFields) => {
    removeJobsForInstanceId(instance.id)
    const newJobs = new Set<CronJob>()
    const { webhooks } = instance
    if (!webhooks) {
      dbg(`Instance ${instance.id} has no webhooks`)
      return
    }
    dbg(`Instance has ${instance.webhooks?.length} webhooks`)
    dbg(`Instance has ${jobs.get(instance.id)?.size} jobs`)
    dbg(`Creating new jobs for instance ${instance.id}`)
    webhooks.forEach((webhook) => {
      if (!webhook.value) return
      dbg(`Creating new job for webhook ${webhook.endpoint} (${webhook.value}) for instance ${instance.id}`)
      const job = new CronJob(
        `*/5 * * * * *`, //webhook.value, // cronTime
        () => {
          dbg(`Firing webhook ${webhook.endpoint} (${webhook.value}) for instance ${instance.id}`)
          limiter.schedule(async () => {
            const url = mkInstanceUrl(instance, ...webhook.endpoint.split('/').filter(Boolean))
            dbg(`Firing webhook ${url}`)
            try {
              const response = await fetch(url, {})
              const body = await response.text()

              // fetch only throws for network errors, not HTTP error status codes
              // so 404, 500, etc. will be handled here without throwing
              webhook.lastFired = {
                timestamp: Date.now(),
                response: {
                  status: response.status,
                  body: body,
                },
              }

              // Optionally log non-2xx responses
              if (!response.ok) {
                warn(`Webhook ${url} returned status ${response.status}: ${body}`)
              }
            } catch (e) {
              // This catch block only handles network errors (connection failed, etc.)
              webhook.lastFired = {
                timestamp: Date.now(),
                response: {
                  status: 500,
                  body: e instanceof Error ? e.message : String(e),
                },
              }
              error(`Network error firing webhook ${url}: ${e}`)
            }
            dbg(`Updating instance ${instance.id} with webhooks`, instance.webhooks)
            client.updateInstance(instance.id, {
              webhooks: instance.webhooks,
            })
          })
        }
      )
      job.start()
      newJobs.add(job)
    })
    jobs.set(instance.id, newJobs)
    dbg(`Created ${newJobs.size} jobs for instance ${instance.id}`)
  }

  mirror.onInstanceUpserted((instance) => {
    dbg(`Instance upserted: ${instance.id}`)
    upsertInstance(instance)
  })

  mirror.onInstanceDeleted((instanceId) => {
    dbg(`Instance deleted: ${instanceId}`)
    removeJobsForInstanceId(instanceId)
  })

  dbg(`Upserting instances`)
  for (const instance of mirror.getInstances()) {
    upsertInstance(instance)
  }

  return {}
})
