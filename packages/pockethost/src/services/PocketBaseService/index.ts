import {
  APEX_DOMAIN,
  createCleanupManager,
  DOCKER_INSTANCE_IMAGE_NAME,
  getContainerPortBinding,
  instanceContainerName,
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
  stopInstanceContainer,
  systemError,
  userError,
} from '@'
import Bottleneck from 'bottleneck'
import Docker, { Container, ContainerCreateOptions } from 'dockerode'
import { existsSync } from 'fs'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { gte } from 'semver'
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
export type AttachConfig = {
  instanceId: string
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

enum ContainerEvents {
  Exit = `exit`,
}

type ContainerRuntime = {
  on: EventEmitter['on']
  kill: () => Promise<void>
  portBinding: number
}

const removeExistingContainer = async (docker: Docker, name: string) => {
  try {
    const existing = docker.getContainer(name)
    const info = await existing.inspect()
    if (info.State.Running) {
      await existing.stop({ signal: `SIGINT`, t: PH_CONTAINER_STOP_TIMEOUT_SEC() })
    }
    await existing.remove({ force: true })
  } catch (e) {
    if (!isDockerContainerNotFound(e)) throw e
  }
}

const mkContainerKill = (dockerContainer: Container, logger: Logger) => () =>
  dockerContainer.stop({ signal: `SIGINT`, t: PH_CONTAINER_STOP_TIMEOUT_SEC() }).catch((e) => {
    if (isDockerContainerNotFound(e)) return
    logger.error(e)
    return dockerContainer.kill().catch((killErr) => {
      if (!isDockerContainerNotFound(killErr)) logger.error(killErr)
    })
  })

const mkPocketbaseProcess = (
  container: ContainerRuntime,
  instanceId: string,
  iLogger: ReturnType<typeof InstanceLogWriter>,
  logger: Logger,
  cm: ReturnType<typeof createCleanupManager>,
  state: { started: boolean; stopped: boolean; stopping: boolean }
): PocketbaseProcess => {
  const { dbg, warn, error } = logger

  const exitCode = new Promise<number>((resolveExit) => {
    container.on(ContainerEvents.Exit, (code) => {
      resolveExit(typeof code === 'number' ? code : 0)
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
    stopped: () => state.stopped,
    started: () => state.started,
    kill: async () => {
      if (state.stopping) {
        warn(`${instanceId} already stopping`)
        return
      }
      state.stopping = true
      dbg(`Killing`)
      iLogger.info(`Stopping instance`)
      await container.kill()
    },
  }

  return api
}

export const createPocketbaseService = async (config: PocketbaseServiceConfig) => {
  const _serviceLogger = (config.logger ?? LoggerService()).create('PocketbaseService')
  const { dbg, error } = _serviceLogger

  const pb = PocketBaseBinaryService()
  const maxVersion = pb.versions()[0]
  if (!maxVersion) {
    throw new Error(`No max version found for PocketBase`)
  }

  const limiter = new Bottleneck({ maxConcurrent: PH_MAX_CONCURRENT_DOCKER_LAUNCHES() })

  const _attach = async (cfg: AttachConfig) => {
    const cm = createCleanupManager()
    const logger = (cfg.logger ?? config.logger ?? LoggerService()).create('attach')
    const { dbg, info, warn } = logger
    const { instanceId } = cfg

    logger.breadcrumb(instanceId)
    const iLogger = InstanceLogWriter(instanceId, 'exec', logger)

    const state = { started: false, stopped: false, stopping: false }
    const emitter = new EventEmitter()
    const docker = new Docker()
    const dockerContainer = docker.getContainer(instanceContainerName(instanceId))

    let containerInfo
    try {
      containerInfo = await dockerContainer.inspect()
    } catch (e) {
      if (isDockerContainerNotFound(e)) {
        throw userError(`${instanceId} container not found`)
      }
      throw e
    }

    if (!containerInfo.State.Running) {
      throw userError(`${instanceId} container is not running`)
    }

    const portBinding = getContainerPortBinding(containerInfo)
    if (!portBinding) {
      throw systemError(`Could not get port binding from preserved container ${instanceId}`)
    }

    state.started = true
    info(`[${instanceId}] Reattached to preserved container on port ${portBinding}`)

    dockerContainer
      .wait()
      .then((data) => {
        state.stopped = true
        emitter.emit(ContainerEvents.Exit, data.StatusCode ?? 0)
      })
      .catch((e) => {
        if (!isDockerContainerNotFound(e)) error(e)
        state.stopped = true
        emitter.emit(ContainerEvents.Exit, 0)
      })

    const container: ContainerRuntime = {
      on: emitter.on.bind(emitter),
      kill: mkContainerKill(dockerContainer, logger),
      portBinding,
    }

    return mkPocketbaseProcess(container, instanceId, iLogger, logger, cm, state)
  }

  const _stop = async (instanceId: string) => {
    await stopInstanceContainer(instanceId, PH_CONTAINER_STOP_TIMEOUT_SEC())
  }

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

    const _version = version || maxVersion
    const realVersion = pb.maxSatisfyingVersion(_version)
    if (!realVersion) {
      throw userError(`No PocketBase version satisfying ${_version}`)
    }
    const binPath = pb.getBinaryPath(realVersion)
    if (!existsSync(binPath)) {
      throw systemError(`PocketBase binary (${binPath}) not found. Contact pockethost.io.`)
    }

    const state = { started: false, stopped: false, stopping: false }
    const containerStartTime = Date.now()
    dbg(`[${instanceId}] Starting Docker container creation at ${new Date(containerStartTime).toISOString()}`)

    const container = await new Promise<ContainerRuntime>((resolve, reject) => {
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

      const containerName = instanceContainerName(instanceId)
      const createOptions: ContainerCreateOptions = {
        Image: DOCKER_INSTANCE_IMAGE_NAME(),
        Env: Object.entries({
          ...env,
          DEV: dev && gte(realVersion, `0.20.1`),
          PH_APEX_DOMAIN: APEX_DOMAIN(),
        }).map(([k, v]) => `${k}=${v}`),
        name: containerName,
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

      createOptions.Cmd = ['./pocketbase', `serve`, `--http`, `0.0.0.0:8090`]
      if (dev) {
        createOptions.Cmd.push(`--dev`)
      }
      createOptions.WorkingDir = `/home/pockethost`

      logger.dbg(`Spawning ${instanceId}`, { createOptions })

      void (async () => {
        await removeExistingContainer(docker, containerName)
        const emitter = docker
          .run(DOCKER_INSTANCE_IMAGE_NAME(), [''], [stdout, stderr], createOptions, (err, data) => {
            state.stopped = true
            stderr.removeAllListeners(`data`)
            stdout.removeAllListeners(`data`)
            const StatusCode = (() => {
              if (!data?.StatusCode) return 0
              return parseInt(data.StatusCode, 10)
            })()
            dbg({ err, data })
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
              emitter.emit(ContainerEvents.Exit, castStatusCode)
              const stopErr = new Error(stopMsg)
              reject(platformFailure ? systemError(stopErr) : userError(stopErr))
            } else {
              emitter.emit(ContainerEvents.Exit, 0)
            }
          })
          .on('start', async (dockerContainer: Container) => {
            const containerReadyTime = Date.now()
            const startupDuration = containerReadyTime - containerStartTime

            dbg(`[${instanceId}] Docker container started at ${new Date(containerReadyTime).toISOString()}`)
            info(
              `[${instanceId}] Container startup time: ${startupDuration}ms (${(startupDuration / 1000).toFixed(2)}s)`
            )
            if (startupDuration > PH_CONTAINER_LAUNCH_WARN_MS()) {
              warn(`Container ${instanceId} launch took ${startupDuration}ms`)
            }

            state.started = true

            try {
              const portBinding = await (async () => {
                const containerInfo = await dockerContainer.inspect()
                const binding = getContainerPortBinding(containerInfo)
                if (!binding) {
                  throw systemError('Could not get port binding from container')
                }
                return binding
              })()

              resolve({
                on: emitter.on.bind(emitter),
                kill: mkContainerKill(dockerContainer, logger),
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
      })().catch(reject)
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

    return mkPocketbaseProcess(container, instanceId, iLogger, logger, cm, state)
  }

  return {
    spawn: (cfg: SpawnConfig) => limiter.schedule(() => _spawn(cfg)),
    attach: (cfg: AttachConfig) => limiter.schedule(() => _attach(cfg)),
    stop: (instanceId: string) => limiter.schedule(() => _stop(instanceId)),
  }
}

export const PocketbaseService = mkSingleton(createPocketbaseService)
