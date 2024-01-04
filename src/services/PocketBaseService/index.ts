import {
  APEX_DOMAIN,
  mkContainerHomePath,
  mkInstanceDataPath,
} from '$constants'
import { InstanceLogger, PortService } from '$services'
import {
  LoggerService,
  SingletonBaseConfig,
  createCleanupManager,
  createTimerManager,
  mkSingleton,
} from '$shared'
import { assert, asyncExitHook, mkInternalUrl, tryFetch } from '$util'
import { map } from '@s-libs/micro-dash'
import Docker, { Container, ContainerCreateOptions } from 'dockerode'
import { existsSync } from 'fs'
import MemoryStream from 'memorystream'
import { gte } from 'semver'
import { AsyncReturnType } from 'type-fest'
import { PocketbaseReleaseVersionService } from '../PocketbaseReleaseVersionService'

export type Env = { [_: string]: string }
export type SpawnConfig = {
  subdomain: string
  instanceId: string
  version?: string
  port?: number
  extraBinds?: string[]
  env?: Env
  stdout?: MemoryStream
  stderr?: MemoryStream
  dev?: boolean
}
export type PocketbaseServiceApi = AsyncReturnType<
  typeof createPocketbaseService
>

export type PocketbaseServiceConfig = SingletonBaseConfig & {}

export type PocketbaseProcess = {
  url: string
  pid: () => string
  kill: () => Promise<void>
  exitCode: Promise<number | null>
}

const INSTANCE_IMAGE_NAME = `pockethost-instance`

export const createPocketbaseService = async (
  config: PocketbaseServiceConfig,
) => {
  const _serviceLogger = LoggerService().create('PocketbaseService')
  const { dbg, error, warn, abort } = _serviceLogger

  const { getLatestVersion, getVersion } =
    await PocketbaseReleaseVersionService()
  const maxVersion = getLatestVersion()

  const tm = createTimerManager({})

  const _spawn = async (cfg: SpawnConfig) => {
    const cm = createCleanupManager()
    const logger = LoggerService().create('spawn')
    const { dbg, warn, error } = logger
    const defaultPort = await (async () => {
      if (cfg.port) return cfg.port
      const [defaultPort, freeDefaultPort] = await PortService().alloc()
      cm.add(freeDefaultPort)
      return defaultPort
    })()
    const _cfg: Required<SpawnConfig> = {
      version: maxVersion,
      port: defaultPort,
      extraBinds: [],
      env: {},
      stderr: new MemoryStream(),
      stdout: new MemoryStream(),
      dev: false,
      ...cfg,
    }
    const {
      version,
      subdomain,
      instanceId,
      port,
      extraBinds,
      env,
      stderr,
      stdout,
      dev,
    } = _cfg

    logger.breadcrumb(subdomain).breadcrumb(instanceId)
    const iLogger = InstanceLogger(instanceId, 'exec')

    const _version = version || maxVersion // If _version is blank, we use the max version available
    const realVersion = await getVersion(_version)
    const binPath = realVersion.binPath
    if (!existsSync(binPath)) {
      throw new Error(
        `PocketBase binary (${binPath}) not found. Contact pockethost.io.`,
      )
    }

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
        error(line)
        iLogger.error(line)
      })
    }
    stderr.on('data', _stdErrData)
    const Binds = [
      `${mkInstanceDataPath(instanceId)}:${mkContainerHomePath()}`,
      `${binPath}:${mkContainerHomePath(`pocketbase`)}:ro`,
    ]

    if (extraBinds.length > 0) {
      Binds.push(...extraBinds)
    }

    const createOptions: ContainerCreateOptions = {
      Image: INSTANCE_IMAGE_NAME,
      Env: map(
        {
          ...env,
          DEV: dev && gte(realVersion.version, `0.20.1`),
          PH_APEX_DOMAIN: APEX_DOMAIN(),
        },
        (v, k) => `${k}=${v}`,
      ),
      name: `${subdomain}-${+new Date()}`,
      HostConfig: {
        AutoRemove: true,
        PortBindings: {
          '8090/tcp': [{ HostPort: `${port}` }],
        },
        Binds,
        Ulimits: [
          {
            Name: 'nofile',
            Soft: 1024,
            Hard: 4096,
          },
        ],
      },
      Tty: false,
      ExposedPorts: {
        [`8090/tcp`]: {},
      },
      // User: 'pockethost',
    }

    createOptions.Cmd = ['node', `index.mjs`]
    createOptions.WorkingDir = `/bootstrap`

    createOptions.Cmd = ['./pocketbase', `serve`, `--http`, `0.0.0.0:8090`]
    if (dev) {
      createOptions.Cmd.push(`--dev`)
    }
    createOptions.WorkingDir = `/home/pockethost`

    logger.info(`Spawning ${instanceId}`)

    dbg({ createOptions })

    let container: Container | undefined = undefined
    let started = false
    let stopped = false
    const exitCode = new Promise<number>(async (resolveExit) => {
      container = await new Promise<Container>((resolve) => {
        docker
          .run(
            INSTANCE_IMAGE_NAME,
            [''], // Supplied by createOptions
            [stdout, stderr],
            createOptions,
            (err, data) => {
              const { StatusCode } = data || {}
              dbg({ err, data })
              container = undefined
              stopped = true
              unsub()
              // Filter out Docker status codes https://stackoverflow.com/questions/31297616/what-is-the-authoritative-list-of-docker-run-exit-codes
              if ((StatusCode > 0 && StatusCode < 125) || err) {
                iLogger.error(
                  `Unexpected stop with code ${StatusCode} and error ${err}`,
                )
                error(
                  `${instanceId} stopped unexpectedly with code ${StatusCode} and error ${err}`,
                )
                resolveExit(StatusCode || 999)
              } else {
                resolveExit(0)
              }
            },
          )
          .on('container', (container: Container) => {
            dbg(`Got container`, container)
            started = true
            resolve(container)
          })
      })
      if (!container) {
        iLogger.error(`Could not start container`)
        error(`${instanceId} could not start container`)
        resolveExit(999)
      }
    })
    exitCode.then((code) => {
      iLogger.info(`Process exited with code ${code}`)
    })
    const url = mkInternalUrl(port)
    logger.breadcrumb(url)
    dbg(`Making exit hook for ${url}`)
    const unsub = asyncExitHook(async () => {
      dbg(`Exiting process ${instanceId}`)
      await api.kill()
      dbg(`Process ${instanceId} exited`)
    })
    await tryFetch(`${url}/api/health`, {
      preflight: async () => {
        dbg({ stopped, started, container: !!container })
        if (stopped) throw new Error(`Container stopped`)
        return started && !!container
      },
    })
    const api: PocketbaseProcess = {
      url,
      pid: () => {
        assert(container)
        return container.id
      },
      exitCode,
      kill: async () => {
        dbg(`Killing`)
        unsub()
        if (!container) {
          dbg(`Already exited`)
          return
        }
        iLogger.info(`Stopping instance`)
        dbg(`Stopping instance`)
        await container.stop({ signal: `SIGKILL` }).catch(error)
        dbg(`Instance stopped`)
        const code = await exitCode
        dbg(`Instance exited with ${code}`)
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
    dbg(`Shutting down timers`)
    tm.shutdown()
  })

  return {
    spawn: _spawn,
  }
}

export const PocketbaseService = mkSingleton(createPocketbaseService)
