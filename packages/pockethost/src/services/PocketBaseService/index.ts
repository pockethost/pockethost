import {
  APEX_DOMAIN,
  asyncExitHook,
  createCleanupManager,
  DOCKER_INSTANCE_IMAGE_NAME,
  InstanceLogWriter,
  isDockerContainerNotFound,
  isPlatformDockerFailure,
  isSystemError,
  isUserError,
  Logger,
  LoggerService,
  mkContainerHomePath,
  mkInstanceDataPath,
  mkInternalUrl,
  mkSingleton,
  PH_CONTAINER_LAUNCH_WARN_MS,
  PH_CONTAINER_STOP_TIMEOUT_SEC,
  PH_MAX_CONCURRENT_DOCKER_LAUNCHES,
  PocketBaseBinaryService,
  SingletonBaseConfig,
  systemError,
  userError,
} from '@'
import Bottleneck from 'bottleneck'
import Docker, { Container, ContainerCreateOptions } from 'dockerode'
import { existsSync } from 'fs'
import { PassThrough } from 'node:stream'
import { gte } from 'semver'
import { EventEmitter } from 'stream'
import { AsyncReturnType } from 'type-fest'

export type Env = { [_: string]: string }
export type SpawnConfig = {
  subdomain: string
  instanceId: string
  version?: string
  extraBinds?: string[]
  env?: Env
  stdout?: PassThrough
  stderr?: PassThrough
  dev?: boolean
  logger: Logger
}
export type PocketbaseServiceApi = AsyncReturnType<typeof createPocketbaseService>

export type PocketbaseServiceConfig = SingletonBaseConfig & {}

export type PocketbaseProcess = {
  url: string
  kill: () => Promise<void>
  exitCode: Promise<number>
  stopped: () => boolean
  started: () => boolean
}

export const createPocketbaseService = async (config: PocketbaseServiceConfig) => {
  const _serviceLogger = (config.logger ?? LoggerService()).create('PocketbaseService')
  const { dbg, error, warn, abort } = _serviceLogger

  const pb = PocketBaseBinaryService()
  const maxVersion = pb.versions()[0]
  if (!maxVersion) {
    throw new Error(`No max version found for PocketBase`)
  }

  // Limit concurrent spawns to mitigate thundering herd issues
  const limiter = new Bottleneck({ maxConcurrent: PH_MAX_CONCURRENT_DOCKER_LAUNCHES() })

  const _spawn = async (cfg: SpawnConfig) => {
    const cm = createCleanupManager()
    const logger = (cfg.logger ?? config.logger ?? LoggerService()).create('spawn')
    const { dbg, info, warn, error } = logger

    const _cfg: Required<SpawnConfig> = {
      version: maxVersion,
      extraBinds: [],
      env: {},
      stderr: new PassThrough(),
      stdout: new PassThrough(),
      dev: false,
      ...cfg,
    }
    const { version, subdomain, instanceId, extraBinds, env, stderr, stdout, dev } = _cfg

    logger.breadcrumb(subdomain).breadcrumb(instanceId)
    const iLogger = InstanceLogWriter(instanceId, 'exec', logger)

    const _version = version || maxVersion // If _version is blank, we use the max version available
    const realVersion = pb.maxSatisfyingVersion(_version)
    if (!realVersion) {
      throw userError(`No PocketBase version satisfying ${_version}`)
    }
    const binPath = pb.getBinaryPath(realVersion)
    if (!existsSync(binPath)) {
      throw systemError(`PocketBase binary (${binPath}) not found. Contact pockethost.io.`)
    }

    enum Events {
      Exit = `exit`,
    }

    let started = false
    let stopped = false
    let stopping = false

    // Add timing for container startup
    const containerStartTime = Date.now()
    dbg(`[${instanceId}] Starting Docker container creation at ${new Date(containerStartTime).toISOString()}`)

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
        `${mkInstanceDataPath(instanceId)}:${mkContainerHomePath()}`,
        `${binPath}:${mkContainerHomePath(`pocketbase`)}:ro`,
      ]

      if (extraBinds.length > 0) {
        Binds.push(...extraBinds)
      }

      const createOptions: ContainerCreateOptions = {
        Image: DOCKER_INSTANCE_IMAGE_NAME(),
        Env: Object.entries({
          ...env,
          DEV: dev && gte(realVersion, `0.20.1`),
          PH_APEX_DOMAIN: APEX_DOMAIN(),
        }).map(([k, v]) => `${k}=${v}`),
        name: `${subdomain}-${+new Date()}`,
        HostConfig: {
          Init: true,
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

      logger.dbg(`Spawning ${instanceId}`, { createOptions })

      const emitter = docker
        .run(
          DOCKER_INSTANCE_IMAGE_NAME(),
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
              const stopMsg = `${instanceId} stopped unexpectedly with code ${castStatusCode} and error ${err}`
              const platformFailure = isPlatformDockerFailure(castStatusCode, err)
              if (platformFailure) {
                iLogger.error(`Unexpected stop with code ${castStatusCode} and error ${err}`)
                error(stopMsg)
              } else {
                dbg(stopMsg)
              }
              emitter.emit(Events.Exit, castStatusCode)
              const stopErr = new Error(stopMsg)
              reject(platformFailure ? systemError(stopErr) : userError(stopErr))
            } else {
              emitter.emit(Events.Exit, 0)
            }
          }
        )
        .on('start', async (dockerContainer: Container) => {
          const containerReadyTime = Date.now()
          const startupDuration = containerReadyTime - containerStartTime

          dbg(`[${instanceId}] Docker container started at ${new Date(containerReadyTime).toISOString()}`)
          info(`[${instanceId}] Container startup time: ${startupDuration}ms (${(startupDuration / 1000).toFixed(2)}s)`)
          if (startupDuration > PH_CONTAINER_LAUNCH_WARN_MS()) {
            warn(`Container ${instanceId} launch took ${startupDuration}ms`)
          }

          dbg(`Got started container`, dockerContainer)
          started = true

          try {
            // Get container info to retrieve the assigned port
            const containerInfo = await dockerContainer.inspect()
            const ports = containerInfo.NetworkSettings?.Ports?.['8090/tcp']

            if (!ports || !ports[0] || !ports[0].HostPort) {
              throw systemError('Could not get port binding from container')
            }

            const portBinding = parseInt(ports[0].HostPort, 10)
            if (isNaN(portBinding)) {
              throw systemError(`Invalid port binding: ${ports[0].HostPort}`)
            }

            resolve({
              on: emitter.on.bind(emitter),
              kill: () =>
                dockerContainer.stop({ signal: `SIGINT`, t: PH_CONTAINER_STOP_TIMEOUT_SEC() }).catch((e) => {
                  if (isDockerContainerNotFound(e)) return
                  error(e)
                  return dockerContainer.kill().catch((killErr) => {
                    if (!isDockerContainerNotFound(killErr)) error(killErr)
                  })
                }),
              portBinding,
            })
          } catch (e) {
            if (isDockerContainerNotFound(e)) {
              reject(userError(`${instanceId} container exited during startup`))
              return
            }
            error(`Failed to get port binding: ${e}`)
            try {
              await dockerContainer.stop()
            } catch (stopError) {
              if (!isDockerContainerNotFound(stopError)) {
                error(`Failed to stop container after port binding error: ${stopError}`)
              }
            }
            reject(e)
          }
        })
    }).catch((e) => {
      if (isUserError(e)) {
        dbg(`Error starting container: ${e}`)
      } else {
        error(`Error starting container: ${e}`)
      }
      cm.shutdown()
      if (isUserError(e) || isSystemError(e)) {
        throw e
      }
      throw systemError(e instanceof Error ? e : new Error(String(e)))
    })

    let removeExitHook: (() => void) | undefined

    const exitCode = new Promise<number>((resolveExit) => {
      container.on(Events.Exit, (code) => {
        removeExitHook?.()
        resolveExit(code)
      })
    })

    exitCode.then((code) => {
      iLogger.info(`Process exited with code ${code}`)
      dbg(`Instance exited with ${code}`)
      cm.shutdown().catch(error)
    })

    const url = mkInternalUrl(container.portBinding)
    logger.breadcrumb(url)

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

    dbg(`Making exit hook for ${url}`)
    removeExitHook = asyncExitHook(async () => {
      await api.kill()
    })

    return api
  }

  return {
    spawn: (cfg: SpawnConfig) => limiter.schedule(() => _spawn(cfg)),
  }
}

export const PocketbaseService = mkSingleton(createPocketbaseService)
