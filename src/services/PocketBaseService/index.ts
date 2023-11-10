import { APEX_DOMAIN, DEBUG, mkInstanceDataPath } from '$constants'
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
import { AsyncReturnType } from 'type-fest'
import { PocketbaseReleaseVersionService } from '../PocketbaseReleaseVersionService'
import { buildImage } from './buildImage'

export type PocketbaseCommand = 'serve' | 'migrate'
export type Env = { [_: string]: string }
export type SpawnConfig = {
  command: PocketbaseCommand
  name: string
  slug: string
  version?: string
  port?: number
  extraBinds?: string[]
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

  dbg(`Building docker image for instnace`)
  await buildImage(`Dockerfile`, INSTANCE_IMAGE_NAME)

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
      ...cfg,
    }
    const {
      version,
      command,
      name,
      slug,
      port,
      extraBinds,
      env,
      stderr,
      stdout,
    } = _cfg
    logger.breadcrumb(name).breadcrumb(slug)
    const iLogger = InstanceLogger(slug, 'exec')

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
        warn(line)
        iLogger.error(line)
      })
    }
    stderr.on('data', _stdErrData)
    const Binds = [`${mkInstanceDataPath(slug)}:/home/pocketbase`]
    Binds.push(`${binPath}:/home/pocketbase/pocketbase:ro`)

    if (extraBinds.length > 0) {
      Binds.push(...extraBinds)
    }

    const createOptions: ContainerCreateOptions = {
      Image: INSTANCE_IMAGE_NAME,
      Cmd: [
        `./pocketbase`,
        `serve`,
        `--http`,
        `0.0.0.0:8090`,
        DEBUG() ? `--debug` : '',
      ].filter((v) => !!v),
      Env: map(
        {
          ...env,
          PH_APEX_DOMAIN: APEX_DOMAIN(),
        },
        (v, k) => `${k}=${v}`,
      ),
      name: `${name}-${+new Date()}`,
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
      // User: 'pocketbase',
    }
    logger.info(`Spawning ${slug}`)
    dbg({ createOptions })

    let container: Container | undefined = undefined
    let started = false
    let stopped = false
    const exitCode = new Promise<number>(async (resolveExit) => {
      container = await new Promise<Container>((resolve) => {
        docker
          .run(
            `pockethost/pocketbase`,
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
                  `${slug} stopped unexpectedly with code ${StatusCode} and error ${err}`,
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
        error(`${slug} could not start container`)
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
      dbg(`Exiting process ${slug}`)
      await api.kill()
      dbg(`Process ${slug} exited`)
    })
    if (command === 'serve') {
      await tryFetch(url, {
        preflight: async () => {
          dbg({ stopped, started, container: !!container })
          if (stopped) throw new Error(`Container stopped`)
          return started && !!container
        },
      })
    }
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
