import {
  APEX_DOMAIN,
  DOCKER_CONTAINER_HOST,
  mkContainerHomePath,
  mkInstanceDataPath,
  SYSLOGD_PORT,
} from '$constants'
import { PortService } from '$services'
import {
  createCleanupManager,
  LoggerService,
  mkSingleton,
  SingletonBaseConfig,
} from '$shared'
import { asyncExitHook, mkInternalUrl, SyslogLogger, tryFetch } from '$util'
import { map } from '@s-libs/micro-dash'
import Docker, { Container, ContainerCreateOptions } from 'dockerode'
import { existsSync } from 'fs'
import MemoryStream from 'memorystream'
import { gte } from 'semver'
import { EventEmitter } from 'stream'
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
  kill: () => Promise<void>
  exitCode: Promise<number>
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

  const _spawn = async (cfg: SpawnConfig) => {
    const cm = createCleanupManager()
    const logger = LoggerService().create('spawn')
    const { dbg, warn, error } = logger
    const port =
      cfg.port ||
      (await (async () => {
        const [defaultPort, freeDefaultPort] = await PortService().alloc()
        cm.add(freeDefaultPort)
        return defaultPort
      })())
    const _cfg: Required<SpawnConfig> = {
      version: maxVersion,
      port,
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
      extraBinds,
      env,
      stderr,
      stdout,
      dev,
    } = _cfg

    logger.breadcrumb(subdomain).breadcrumb(instanceId)
    const iLogger = SyslogLogger(instanceId, 'exec')
    cm.add(async () => {
      dbg(`Shutting down iLogger`)
      await iLogger.shutdown()
    })

    const _version = version || maxVersion // If _version is blank, we use the max version available
    const realVersion = await getVersion(_version)
    const binPath = realVersion.binPath
    if (!existsSync(binPath)) {
      throw new Error(
        `PocketBase binary (${binPath}) not found. Contact pockethost.io.`,
      )
    }

    enum Events {
      Exit = `exit`,
    }

    let started = false
    let stopped = false

    const container = await new Promise<{
      on: EventEmitter['on']
      kill: () => Promise<void>
    }>((resolve) => {
      const docker = new Docker()
      iLogger.info(`Starting instance`)
      const handleData = (data: Buffer) => {
        dbg(data.toString())
      }
      stdout.on('data', handleData)
      stderr.on('data', handleData)
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
          LogConfig: {
            Type: 'syslog',
            Config: {
              'syslog-address': `udp://${DOCKER_CONTAINER_HOST()}:${SYSLOGD_PORT()}`,
              tag: instanceId,
            },
          },
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

      const emitter = docker
        .run(
          INSTANCE_IMAGE_NAME,
          [''], // Supplied by createOptions
          [stdout, stderr],
          createOptions,
          (err, data) => {
            stopped = true
            stderr.off(`data`, handleData)
            stdout.off(`data`, handleData)
            const StatusCode = (() => {
              if (!data?.StatusCode) return 0
              return parseInt(data.StatusCode, 10)
            })()
            dbg({ err, data })
            // Filter out Docker status codes
            /*
            https://stackoverflow.com/questions/31297616/what-is-the-authoritative-list-of-docker-run-exit-codes
            https://tldp.org/LDP/abs/html/exitcodes.html
            https://docs.docker.com/engine/reference/run/#exit-status
            125, 126, 127 - Docker
            137 - SIGKILL (expected)
            */
            if ((StatusCode > 0 && StatusCode !== 137) || err) {
              iLogger.error(
                `Unexpected stop with code ${StatusCode} and error ${err}`,
              )
              error(
                `${instanceId} stopped unexpectedly with code ${StatusCode} and error ${err}`,
              )
              emitter.emit(Events.Exit, StatusCode || 999)
            } else {
              emitter.emit(Events.Exit, 0)
            }
          },
        )
        .on('start', (container: Container) => {
          dbg(`Got started container`, container)
          started = true
          resolve({
            on: emitter.on.bind(emitter),
            kill: () => container.stop({ signal: `SIGKILL` }).catch(error),
          })
        })
    }).catch((e) => {
      error(`Error starting container`, e)
      cm.shutdown()
      throw e
    })

    const exitCode = new Promise<number>(async (resolveExit) => {
      container.on(Events.Exit, (code) => {
        unsub()
        resolveExit(code)
      })
    })

    exitCode.then((code) => {
      iLogger.info(`Process exited with code ${code}`)
      dbg(`Instance exited with ${code}`)
      cm.shutdown().catch(error)
    })
    const url = mkInternalUrl(port)
    logger.breadcrumb(url)
    dbg(`Making exit hook for ${url}`)
    const unsub = asyncExitHook(async () => {
      await api.kill()
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
      exitCode,
      kill: async () => {
        dbg(`Killing`)
        iLogger.info(`Stopping instance`)
        await container.kill()
      },
    }

    return api
  }

  return {
    spawn: _spawn,
  }
}

export const PocketbaseService = mkSingleton(createPocketbaseService)
