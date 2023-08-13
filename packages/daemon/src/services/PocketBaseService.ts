import { DAEMON_PB_DATA_DIR, DAEMON_PB_MIGRATIONS_DIR } from '$constants'
import { mkInternalAddress, mkInternalUrl, tryFetch } from '$util'
import { createCleanupManager, createTimerManager } from '@pockethost/common'
import {
  mkSingleton,
  SingletonBaseConfig,
} from '@pockethost/common/src/mkSingleton'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import getPort from 'get-port'
import { gte } from 'semver'
import { AsyncReturnType } from 'type-fest'
import { AsyncContext } from '../util/AsyncContext'
import { updaterService } from './UpdaterService/UpdaterService'

export type PocketbaseCommand = 'serve' | 'migrate'
export type SpawnConfig = {
  command: PocketbaseCommand
  slug: string
  version?: string
  port?: number
  isMothership?: boolean
  onUnexpectedStop: (
    code: number | null,
    stdout: string[],
    stderr: string[]
  ) => void
}
export type PocketbaseServiceApi = AsyncReturnType<
  typeof createPocketbaseService
>

export type PocketbaseServiceConfig = SingletonBaseConfig & {}

export type PocketbaseProcess = {
  url: string
  pid: number | undefined
  kill: () => Promise<boolean>
  exited: Promise<number | null>
}

function pidIsRunning(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return false
  }
}

export const createPocketbaseService = async (
  config: PocketbaseServiceConfig
) => {
  const { logger } = config
  const _serviceLogger = logger.create('PocketbaseService')
  const { dbg, error, warn, abort } = _serviceLogger

  const { getLatestVersion, getVersion } = await updaterService()
  const maxVersion = getLatestVersion()

  const cm = createCleanupManager()
  const tm = createTimerManager({})

  const _spawn = async (cfg: SpawnConfig, context?: AsyncContext) => {
    const logger = (context?.logger || _serviceLogger).create('spawn')
    const { dbg, warn, error } = logger
    const _cfg: Required<SpawnConfig> = {
      version: maxVersion,
      port: await getPort(),
      isMothership: false,
      ...cfg,
    }
    const { version, command, slug, port, onUnexpectedStop, isMothership } =
      _cfg
    const _version = version || maxVersion // If _version is blank, we use the max version available
    const realVersion = await getVersion(_version)
    const bin = realVersion.binPath
    if (!existsSync(bin)) {
      throw new Error(
        `PocketBase binary (${bin}) not found. Contact pockethost.io.`
      )
    }

    const args = [
      command,
      `--dir`,
      `${DAEMON_PB_DATA_DIR}/${slug}/pb_data`,
      `--publicDir`,
      `${DAEMON_PB_DATA_DIR}/${slug}/pb_public`,
    ]
    if (gte(realVersion.version, `0.9.0`)) {
      args.push(`--migrationsDir`)
      args.push(
        isMothership
          ? DAEMON_PB_MIGRATIONS_DIR
          : `${DAEMON_PB_DATA_DIR}/${slug}/pb_migrations`
      )
    }
    if (command === 'serve') {
      args.push(`--http`)
      args.push(mkInternalAddress(port))
    }

    let isRunning = true

    dbg(`Spawning ${slug}`, { bin, args, cli: [bin, ...args].join(' ') })
    const ls = spawn(bin, args)
    cm.add(() => {
      ls.kill()
    })

    const stdout: string[] = []
    ls.stdout.on('data', (data: Buffer) => {
      dbg(`${slug} stdout: ${data}`)
      stdout.push(data.toString())
      if (stdout.length > 100) stdout.pop()
    })

    const stderr: string[] = []
    ls.stderr.on('data', (data: Buffer) => {
      warn(`${slug} stderr: ${data}`)
      stderr.push(data.toString())
      if (stderr.length > 100) stderr.pop()
    })

    ls.on('close', (code) => {
      dbg(`${slug} closed with code ${code}`)
    })

    const exited = new Promise<number | null>((resolve) => {
      ls.on('exit', (code) => {
        dbg(`${slug} exited with code ${code}`)
        isRunning = false
        if (code || stderr.length > 0) {
          onUnexpectedStop?.(code, stdout, stderr)
        }
        resolve(code)
      })
    })

    ls.on('error', (err) => {
      dbg(`${slug} had error ${err}`)
    })

    const url = mkInternalUrl(port)
    if (command === 'serve') {
      await tryFetch(url, {
        preflight: async () => isRunning,
        logger: _serviceLogger,
      })
    }
    const api: PocketbaseProcess = {
      url,
      exited,
      pid: ls.pid,
      kill: async () => {
        const { pid } = ls
        if (!pid) {
          throw new Error(
            `Attempt to kill a PocketBase process that was never running.`
          )
        }
        const p = new Promise<boolean>((resolve, reject) => {
          let cid: NodeJS.Timeout
          const tid = setTimeout(() => {
            clearTimeout(cid)
            reject(new Error(`Timeout waiting for pid:${pid} to die`))
          }, 1000)
          const _check = () => {
            dbg(`Checking to see if pid:${pid} is running`)
            if (pidIsRunning(pid)) {
              dbg(`pid:${pid} is still running`)
              ls.kill()
              cid = setTimeout(_check, 50)
            } else {
              dbg(`pid:${pid} is not running`)
              clearTimeout(tid)

              resolve(true)
            }
          }
          _check()
        })
        return p
      },
    }
    return api
  }

  const shutdown = () => {
    dbg(`Shutting down pocketbaseService`)
    tm.shutdown()
    cm.shutdown()
  }

  return {
    spawn: _spawn,
    shutdown,
  }
}

export const pocketbaseService = mkSingleton(createPocketbaseService)
