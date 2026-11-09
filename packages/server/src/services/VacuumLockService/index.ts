import {
  InstanceId,
  InstanceStatus,
  LoggerService,
  mkSingleton,
  MothershipAdminClientService,
  PH_DAEMON_VACUUM_WAIT_MS,
  PH_DAEMON_VACUUM_WAIT_RETRY_MS,
  SingletonBaseConfig,
} from '@'
import { randomBytes } from 'crypto'
import express from 'express'
import { AsyncReturnType } from 'type-fest'
import { getRunningInstanceIds } from '../../core/runningInstanceIds'
import { proxyService } from '../ProxyService'
import { waitUntilVacuumUnlocked } from './vacuumWait'

const LOCK_TTL_MS = 30 * 60 * 1000
const SWEEP_INTERVAL_MS = 60_000

type LockEntry = {
  token: string
  acquiredAt: number
}

type LockGrant = {
  instanceId: string
  token: string
}

type LockDenial = {
  instanceId: string
  reason: string
}

const mkToken = () => randomBytes(16).toString(`hex`)

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const requireSecret = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!process.env.PH_SECRET || req.header(`x-pockethost-secret`) !== process.env.PH_SECRET) {
    res.status(401).json({ error: `unauthorized` })
    return
  }
  next()
}

export type VacuumLockServiceApi = AsyncReturnType<typeof VacuumLockService>
export const VacuumLockService = mkSingleton(async (config: SingletonBaseConfig) => {
  const { dbg, info, warn } = (config.logger ?? LoggerService()).create(`VacuumLockService`)

  const locks = new Map<string, LockEntry>()
  let isLive: (id: string) => boolean = () => true

  const { client } = await MothershipAdminClientService()
  const syncInstanceStatus = (instanceId: InstanceId, status: InstanceStatus) => {
    client
      .updateInstance(instanceId, { status })
      .then(() => {
        dbg(`Set ${instanceId} status to ${status}`)
      })
      .catch((e: unknown) => {
        warn(`Could not set ${instanceId} status to ${status}`, { e })
      })
  }

  info(`Initialized`)
  locks.clear()

  const sweepStaleLocks = () => {
    const now = Date.now()
    for (const [instanceId, entry] of locks) {
      if (now - entry.acquiredAt > LOCK_TTL_MS) {
        locks.delete(instanceId)
        syncInstanceStatus(instanceId, InstanceStatus.Idle)
        dbg(`TTL cleared stale lock for ${instanceId}`)
      }
    }
  }

  const sweeper = setInterval(sweepStaleLocks, SWEEP_INTERVAL_MS)
  sweeper.unref?.()

  const tryGrantLock = (instanceId: string): LockGrant | LockDenial => {
    if (locks.has(instanceId)) {
      return { instanceId, reason: `already locked` }
    }

    if (isLive(instanceId)) {
      return { instanceId, reason: `instance live or starting` }
    }

    if (getRunningInstanceIds().has(instanceId)) {
      return { instanceId, reason: `docker container running` }
    }

    const token = mkToken()
    locks.set(instanceId, { token, acquiredAt: Date.now() })
    syncInstanceStatus(instanceId, InstanceStatus.Vacuuming)
    dbg(`Granted lock for ${instanceId}`)
    return { instanceId, token }
  }

  const router = express.Router()
  router.use(express.json())

  router.post(`/lock`, requireSecret, (req, res) => {
    const instanceIds = (req.body as { instanceIds?: string[] })?.instanceIds
    if (!Array.isArray(instanceIds)) {
      res.status(400).json({ error: `instanceIds array required` })
      return
    }

    const granted: LockGrant[] = []
    const denied: LockDenial[] = []

    for (const instanceId of instanceIds) {
      if (!instanceId || typeof instanceId !== `string`) continue
      const result = tryGrantLock(instanceId)
      if (`token` in result) {
        granted.push(result)
      } else {
        denied.push(result)
      }
    }

    res.json({ granted, denied })
  })

  router.post(`/unlock`, requireSecret, (req, res) => {
    const entries = (req.body as { locks?: Array<{ instanceId: string; token: string }> })?.locks
    if (!Array.isArray(entries)) {
      res.status(400).json({ error: `locks array required` })
      return
    }

    const released: string[] = []
    const failed: string[] = []

    for (const { instanceId, token } of entries) {
      if (!instanceId || !token) continue
      const entry = locks.get(instanceId)
      if (entry?.token === token) {
        locks.delete(instanceId)
        syncInstanceStatus(instanceId, InstanceStatus.Idle)
        released.push(instanceId)
        dbg(`Released lock for ${instanceId}`)
      } else {
        failed.push(instanceId)
      }
    }

    res.json({ released, failed })
  })
  ;(await proxyService()).use(`/_api/daemon/vacuum`, router)

  return {
    registerIsLive: (fn: (id: string) => boolean) => {
      isLive = fn
    },
    isLocked: (instanceId: string) => locks.has(instanceId),
    waitUntilUnlocked: (
      instanceId: InstanceId,
      options: { isAborted?: () => boolean; graceMs?: number; retryMs?: number } = {}
    ) =>
      waitUntilVacuumUnlocked({
        isLocked: () => locks.has(instanceId),
        sleep,
        graceMs: options.graceMs ?? PH_DAEMON_VACUUM_WAIT_MS(),
        retryMs: options.retryMs ?? PH_DAEMON_VACUUM_WAIT_RETRY_MS(),
        isAborted: options.isAborted,
      }),
  }
})
