import {
  InstanceFields,
  InstanceId,
  InstanceLogWriter,
  LoggerService,
  mkInstanceUrl,
  mkSingleton,
  MothershipAdminClientService,
  PH_DISABLE_INSTANCE_WEBHOOKS,
  SingletonBaseConfig,
} from '@'
import Bottleneck from 'bottleneck'
import { CronJob } from 'cron'
import { MothershipMirrorService } from '../MothershipMirrorService'
import { isCatchUpDue } from './catchUp'

export type CronServiceConfig = SingletonBaseConfig & {}

export const CronService = mkSingleton(async (config: Partial<CronServiceConfig>) => {
  const mirror = await MothershipMirrorService()
  const logger = (config.logger ?? LoggerService()).create(`CronService`)
  // logger.setLevel(LogLevelName.Debug)
  const { dbg, error, info } = logger
  info(`Starting`)

  if (PH_DISABLE_INSTANCE_WEBHOOKS()) {
    info(`Instance webhooks disabled (PH_DISABLE_INSTANCE_WEBHOOKS)`)
    return {}
  }

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

  /** `catchUp` is set only on startup: a webhook that missed a run while the daemon was down fires once now. */
  const upsertInstance = async (instance: InstanceFields, catchUp = false) => {
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
    const userInstanceLogger = InstanceLogWriter(instance.id, `exec`, logger)
    webhooks.forEach((webhook) => {
      if (!webhook.value) return
      dbg(`Creating new job for webhook ${webhook.endpoint} (${webhook.value}) for instance ${instance.id}`)
      const fire = () => {
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

            if (!response.ok) {
              dbg(`Webhook ${url} returned status ${response.status}: ${body}`)
              userInstanceLogger.error(`Webhook ${webhook.endpoint} returned HTTP ${response.status}: ${body}`)
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
      const job = new CronJob(webhook.value, fire)
      job.start()
      newJobs.add(job)
      if (catchUp && isCatchUpDue(webhook.value, webhook.lastFired?.timestamp, Date.now())) {
        info(
          `Catching up missed webhook ${webhook.endpoint.split(`?`)[0]} (${webhook.value}) for instance ${instance.id}`
        )
        fire()
      }
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

  await mirror.whenReady

  dbg(`Upserting instances`)
  for (const instance of mirror.getInstances()) {
    upsertInstance(instance, true)
  }

  return {}
})
