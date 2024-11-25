import { map } from '@s-libs/micro-dash'
import Docker, { Container, ContainerCreateOptions } from 'dockerode'
import { existsSync } from 'fs'
import MemoryStream from 'memorystream'
import { gte } from 'semver'
import { EventEmitter } from 'stream'
import { AsyncReturnType } from 'type-fest'
import {
  APEX_DOMAIN,
  LoggerService,
  SingletonBaseConfig,
  asyncExitHook,
  createCleanupManager,
  mkContainerHomePath,
  mkInstanceDataPath,
  mkInternalUrl,
  mkSingleton,
} from '../..'
import { GobotService } from '../GobotService'
import { InstanceLogWriter } from '../InstanceLoggerService'

export type Env = { [_: string]: string }
export type SpawnConfig = {
  subdomain: string
  instanceId: string
  volume: string
  version?: string
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
  stopped: () => boolean
  started: () => boolean
}

export const DOCKER_INSTANCE_IMAGE_NAME = `benallfree/pockethost-instance`

export const createPocketbaseService = async (
  config: PocketbaseServiceConfig,
) => {
  const _serviceLogger = LoggerService().create('PocketbaseService')
  const { dbg, error, warn, abort } = _serviceLogger

  const { gobot } = GobotService()
  const bot = await gobot(`pocketbase`, { os: 'linux' })
  const maxVersion = (await bot.versions())[0]
  if (!maxVersion) {
    throw new Error(`No max version found for PocketBase`)
  }

  const _spawn = async (cfg: SpawnConfig) => {
    const cm = createCleanupManager()
    const logger = LoggerService().create('spawn')
    const { dbg, warn, error, info } = logger

    const _cfg: Required<SpawnConfig> = {
      version: maxVersion,
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
      volume,
      extraBinds,
      env,
      stderr,
      stdout,
      dev,
    } = _cfg

    logger.breadcrumb({ subdomain, instanceId })
    const iLogger = InstanceLogWriter(instanceId, volume, 'exec')

    const _version = version || maxVersion // If _version is blank, we use the max version available
    const realVersion = await bot.maxSatisfyingVersion(_version)
    if (!realVersion) {
      throw new Error(`No PocketBase version satisfying ${_version}`)
    }
    const binPath = await bot.getBinaryFilePath(realVersion)
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
    let stopping = false

    const container = await new Promise<{
      on: EventEmitter['on']
      kill: () => Promise<void>
      portBinding: number
    }>((resolve, reject) => {
      const docker = new Docker()
      iLogger.info(`Starting instance`)
      stdout.on('data', (data) => {
        iLogger.info(data.toString())
        dbg(data.toString())
      })
      stderr.on('data', (data) => {
        iLogger.error(data.toString())
        dbg(data.toString())
      })
      const Binds = [
        `${mkInstanceDataPath(volume, instanceId)}:${mkContainerHomePath()}`,
        `${binPath}:${mkContainerHomePath(`pocketbase`)}:ro`,
      ]

      if (extraBinds.length > 0) {
        Binds.push(...extraBinds)
      }

      const createOptions: ContainerCreateOptions = {
        Image: DOCKER_INSTANCE_IMAGE_NAME,
        Env: map(
          {
            ...env,
            DEV: dev && gte(realVersion, `0.20.1`),
            PH_APEX_DOMAIN: APEX_DOMAIN(),
          },
          (v, k) => `${k}=${v}`,
        ),
        name: `${subdomain}-${+new Date()}`,
        HostConfig: {
          AutoRemove: true,
          PortBindings: {
            '8090/tcp': [{ HostPort: `0` }],
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
      }

      createOptions.Cmd = ['node', `index.mjs`]
      createOptions.WorkingDir = `/bootstrap`

      createOptions.Cmd = ['./pocketbase', `serve`, `--http`, `0.0.0.0:8090`]
      if (dev) {
        createOptions.Cmd.push(`--dev`)
      }
      createOptions.WorkingDir = `/home/pockethost`

      info(`Spawning ${instanceId}`)

      dbg({ createOptions })

      console.log(`*** running container`)
      const emitter = docker
        .run(
          DOCKER_INSTANCE_IMAGE_NAME,
          [''], // Supplied by createOptions
          [stdout, stderr],
          createOptions,
          (err, data) => {
            stopped = true
            stderr.removeAllListeners(`data`)
            stdout.removeAllListeners(`data`)
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
              const castStatusCode = StatusCode || 999
              iLogger.error(
                `Unexpected stop with code ${castStatusCode} and error ${err}`,
              )
              error(
                `${instanceId} stopped unexpectedly with code ${castStatusCode} and error ${err}`,
              )
              emitter.emit(Events.Exit, castStatusCode)
              reject(
                new Error(
                  `${instanceId} stopped unexpectedly with code ${castStatusCode} and error ${err}`,
                ),
              )
            } else {
              emitter.emit(Events.Exit, 0)
            }
          },
        )
        .on('start', async (container: Container) => {
          dbg(`Got started container`, container)
          started = true

          try {
            // Get container info to retrieve the assigned port
            const containerInfo = await container.inspect()
            const ports = containerInfo.NetworkSettings?.Ports?.['8090/tcp']

            if (!ports || !ports[0] || !ports[0].HostPort) {
              throw new Error('Could not get port binding from container')
            }

            const portBinding = parseInt(ports[0].HostPort, 10)
            if (isNaN(portBinding)) {
              throw new Error(`Invalid port binding: ${ports[0].HostPort}`)
            }

            resolve({
              on: emitter.on.bind(emitter),
              kill: () =>
                container.stop({ signal: `SIGINT` }).catch((e) => {
                  error(e)
                  return container.stop({ signal: `SIGKILL` }).catch(error)
                }),
              portBinding,
            })
          } catch (e) {
            error(`Failed to get port binding: ${e}`)
            reject(e)
            try {
              await container.stop()
            } catch (stopError) {
              error(
                `Failed to stop container after port binding error: ${stopError}`,
              )
            }
          }
        })
        .on('error', (e) => {
          error(`Error starting container: ${e}`)
          cm.shutdown()
        })
    }).catch((e) => {
      error(`Error starting container: ${e}`)
      cm.shutdown()
      throw e
    })
    console.log(`*** got container`)

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

    const url = mkInternalUrl(container.portBinding)
    logger.breadcrumb({ url })
    dbg(`Making exit hook for ${url}`)
    const unsub = asyncExitHook(async () => {
      await api.kill()
    })

    const api: PocketbaseProcess = {
      url,
      exitCode,
      stopped: () => stopped,
      started: () => started,
      kill: async () => {
        if (stopping) {
          warn(`${instanceId} already stopping`)
          return
        }
        stopping = true
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
