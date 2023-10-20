import {
  DAEMON_PB_HOOKS_DIR,
  DAEMON_PB_MIGRATIONS_DIR,
  mkInstanceDataPath,
  PUBLIC_DEBUG,
} from '$constants'
import { port as getPort, InstanceLogger, updaterService } from '$services'
import {
  assert,
  AsyncContext,
  asyncExitHook,
  mkInternalUrl,
  tryFetch,
} from '$util'
import {
  createCleanupManager,
  createTimerManager,
  InvocationPid,
  mkSingleton,
  SingletonBaseConfig,
} from '@pockethost/common'
import { map } from '@s-libs/micro-dash'
import Docker, { Container, ContainerCreateOptions } from 'dockerode'
import { existsSync } from 'fs'
import MemoryStream from 'memorystream'
import { dirname } from 'path'
import { gte } from 'semver'
import { AsyncReturnType } from 'type-fest'

export type PocketbaseCommand = 'serve' | 'migrate'
export type Env = { [_: string]: string }
export type SpawnConfig = {
  command: PocketbaseCommand
  name: string
  slug: string
  version?: string
  port?: number
  isMothership?: boolean
  env?: Env
  stdout?: MemoryStream
  stderr?: MemoryStream
}
export type PocketbaseServiceApi = AsyncReturnType<
  typeof createPocketbaseService
>

export type PocketbaseServiceConfig = SingletonBaseConfig & {}

export type PocketbaseProcess = {
  url: string
  pid: () => InvocationPid
  kill: () => Promise<void>
  exited: Promise<number | null>
}

export const createPocketbaseService = async (
  config: PocketbaseServiceConfig,
) => {
  const { logger } = config
  const _serviceLogger = logger.create('PocketbaseService')
  const { dbg, error, warn, abort } = _serviceLogger

  const { getLatestVersion, getVersion } = await updaterService()
  const maxVersion = getLatestVersion()

  const tm = createTimerManager({})

  const _spawn = async (cfg: SpawnConfig, context?: AsyncContext) => {
    const cm = createCleanupManager()
    const logger = (context?.logger || _serviceLogger).create('spawn')
    const { dbg, warn, error } = logger
    const defaultPort = await (async () => {
      if (cfg.port) return cfg.port
      const [defaultPort, freeDefaultPort] = await getPort.alloc()
      cm.add(freeDefaultPort)
      return defaultPort
    })()
    const _cfg: Required<SpawnConfig> = {
      version: maxVersion,
      port: defaultPort,
      isMothership: false,
      env: {},
      stderr: new MemoryStream(),
      stdout: new MemoryStream(),
      ...cfg,
    }
    const {
      version,
      command,
      name,
      slug,
      port,
      isMothership,
      env,
      stderr,
      stdout,
    } = _cfg
    const iLogger = InstanceLogger(slug, 'exec')

    const _version = version || maxVersion // If _version is blank, we use the max version available
    const realVersion = await getVersion(_version)
    const binPath = realVersion.binPath
    if (!existsSync(binPath)) {
      throw new Error(
        `PocketBase binary (${binPath}) not found. Contact pockethost.io.`,
      )
    }

    const bin = `/host_bin/pocketbase`

    const args = [
      bin,
      command,
      `--dir`,
      `/host_data/pb_data`,
      `--publicDir`,
      `/host_data/pb_public`,
    ]
    if (PUBLIC_DEBUG) {
      args.push(`--debug`)
    }
    if (gte(realVersion.version, `0.9.0`)) {
      args.push(`--migrationsDir`)
      args.push(`/host_data/pb_migrations`)
    }
    if (gte(realVersion.version, `0.17.0`)) {
      args.push(`--hooksDir`)
      args.push(`/host_data/pb_hooks`)
    }
    if (command === 'serve') {
      args.push(`--http`)
      args.push(`0.0.0.0:8090`)
    }

    let isRunning = true

    const docker = new Docker()
    iLogger.info(`Starting instance`)

    const _stdoutData = (data: Buffer) => {
      const lines = data.toString().split(/\n/)
      lines.forEach((line) => {
        iLogger.info(line)
      })
    }
    stdout.on('data', _stdoutData)
    const _stdErrData = (data: Buffer) => {
      const lines = data.toString().split(/\n/)
      lines.forEach((line) => {
        iLogger.error(line)
      })
    }
    stderr.on('data', _stdErrData)
    const createOptions: ContainerCreateOptions = {
      Image: `pockethost/pocketbase`,
      Cmd: args,
      Env: map(env, (v, k) => `${k}=${v}`),
      name: `${name}-${+new Date()}`,
      HostConfig: {
        AutoRemove: true,
        CpuPercent: 10,
        PortBindings: {
          '8090/tcp': [{ HostPort: `${port}` }],
        },
        Binds: [
          `${dirname(binPath)}:/host_bin`,
          `${mkInstanceDataPath(slug)}:/host_data`,
          `${
            isMothership
              ? DAEMON_PB_MIGRATIONS_DIR
              : mkInstanceDataPath(slug, `pb_migrations`)
          }:/host_data/pb_migrations`,
          `${
            isMothership
              ? DAEMON_PB_HOOKS_DIR
              : mkInstanceDataPath(slug, `pb_hooks`)
          }:/host_data/pb_hooks`,
        ],
      },
      Tty: false,
      ExposedPorts: {
        [`8090/tcp`]: {},
      },
    }
    logger.info(`Spawning ${slug}`)
    dbg({ args, createOptions })

    let container: Container | undefined = undefined
    const exited = new Promise<number>(async (resolveExit) => {
      container = await new Promise<Container>((resolve) => {
        docker
          .run(
            `pockethost/pocketbase`,
            [''], // Supplied by createOptions
            [stdout, stderr],
            createOptions,
            (err, data) => {
              const { StatusCode } = data || {}
              iLogger.info(`${slug} closed with code ${StatusCode}`)
              dbg({ err, data })
              isRunning = false
              container = undefined
              unsub()
              if (StatusCode > 0 || err) {
                iLogger.error(
                  `Unexpected stop with code ${StatusCode} and error ${err}`,
                )
                error(`${slug} stopped unexpectedly with code ${err}`, data)
                resolveExit(StatusCode || 999)
              } else {
                resolveExit(0)
              }
            },
          )
          .on('container', (container: Container) => {
            dbg(`Got container`, container)
            resolve(container)
          })
      })
      if (!container) {
        iLogger.error(`Could not start container`)
        error(`${slug} could not start container`)
        resolveExit(999)
      }
    })

    const url = mkInternalUrl(port)
    if (command === 'serve') {
      await tryFetch(url, {
        preflight: async () => isRunning,
        logger: _serviceLogger,
      })
    }
    const unsub = asyncExitHook(async () => {
      dbg(`Exiting process ${slug}`)
      await api.kill()
    })
    const api: PocketbaseProcess = {
      url,
      pid: () => {
        assert(container)
        return container.id
      },
      exited,
      kill: async () => {
        unsub()
        if (!container) {
          dbg(`Already exited`)
          return
        }
        iLogger.info(`Stopping instance`)
        await container.stop()
        iLogger.info(`Instance stopped`)
        stderr.off('data', _stdErrData)
        stdout.off('data', _stdoutData)

        container = undefined
        await cm.shutdown()
      },
    }

    return api
  }

  asyncExitHook(async () => {
    dbg(`Shutting down pocketbaseService`)
    tm.shutdown()
  })

  return {
    spawn: _spawn,
  }
}

export const pocketbaseService = mkSingleton(createPocketbaseService)
