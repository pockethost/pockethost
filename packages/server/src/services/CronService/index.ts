import {
  BACKUP_TOKEN_HEADER,
  DAEMON_PORT,
  InstanceFields,
  InstanceId,
  InstanceLogWriter,
  LoggerService,
  mkBackupToken,
  mkInstanceHostname,
  mkSingleton,
  MothershipAdminClientService,
  PH_BACKUP_TOKEN_SECRET,
  PH_DISABLE_INSTANCE_WEBHOOKS,
  SingletonBaseConfig,
} from '@'
import Bottleneck from 'bottleneck'
import { CronJob } from 'cron'
import { MothershipMirrorService } from '../MothershipMirrorService'
import { isCatchUpDue } from './catchUp'
import { daemonRequest } from './daemonRequest'

/** How long one webhook call may run. Long enough for a backup; the open request keeps the instance awake. */
const WEBHOOK_TIMEOUT_MS = 30 * 60 * 1000

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

  // Calls can now run for up to WEBHOOK_TIMEOUT_MS, so leave room for a few long ones without holding up the rest.
  const limiter = new Bottleneck({ maxConcurrent: 50 })
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
    // Webhooks run on the edge that runs the instance.
    if (!mirror.isMine(instance)) return
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
          const path = `/${webhook.endpoint.split('/').filter(Boolean).join('/')}`
          const host = mkInstanceHostname(instance)
          // Query strings can carry secrets, so logs show the path only.
          const logPath = path.split('?')[0]
          dbg(`Firing webhook ${host}${logPath}`)
          try {
            const { status, body } = await daemonRequest({
              port: DAEMON_PORT(),
              host,
              path,
              timeoutMs: WEBHOOK_TIMEOUT_MS,
              // Every webhook carries the instance's backup token, so pointing one at /api/ph/backup schedules backups.
              headers: PH_BACKUP_TOKEN_SECRET()
                ? { [BACKUP_TOKEN_HEADER]: mkBackupToken(instance.id, PH_BACKUP_TOKEN_SECRET()) }
                : {},
            })

            webhook.lastFired = {
              timestamp: Date.now(),
              response: { status, body },
            }

            if (status < 200 || status >= 300) {
              dbg(`Webhook ${host}${logPath} returned status ${status}: ${body}`)
              userInstanceLogger.error(`Webhook ${webhook.endpoint} returned HTTP ${status}: ${body}`)
            }
          } catch (e) {
            // Connection failures and timeouts
            const message = e instanceof Error ? e.message : String(e)
            webhook.lastFired = {
              timestamp: Date.now(),
              response: { status: 500, body: message },
            }
            error(`Error firing webhook ${host}${logPath}: ${message}`)
            userInstanceLogger.error(`Webhook ${webhook.endpoint} failed: ${message}`)
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
