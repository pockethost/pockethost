import {
  DOCKER_INSTANCE_IMAGE_NAME,
  isDockerContainerNotFound,
  mkContainerHomePath,
  PH_CONTAINER_STOP_TIMEOUT_SEC,
} from '@'
import Docker, { Container, ContainerCreateOptions } from 'dockerode'
import { execFileSync, spawn } from 'node:child_process'
import { PassThrough } from 'node:stream'

export type PocketBaseContainerSpawnConfig = {
  binPath: string
  args: string[]
  binds: string[]
  env?: Record<string, string>
  port?: number
  autoRemove?: boolean
  name?: string
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
  onExit?: (code: number) => void
}

export const rmNamedContainerSync = (containerName: string) => {
  try {
    execFileSync('docker', ['rm', '-f', containerName], { stdio: 'ignore' })
  } catch {
    // best effort on exit
  }
}

export const spawnPocketBaseContainer = async (cfg: PocketBaseContainerSpawnConfig) => {
  const { binPath, args, binds, env = {}, port, autoRemove = false, name, onStdout, onStderr, onExit } = cfg

  const docker = new Docker()
  const pocketbasePath = mkContainerHomePath('pocketbase')
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const stopTimeoutSec = PH_CONTAINER_STOP_TIMEOUT_SEC()

  stdout.on('data', (data) => onStdout?.(data.toString()))
  stderr.on('data', (data) => onStderr?.(data.toString()))

  const spawnParentExitWatchdog = (nodePid: number, expectedPpid: number, containerName: string) => {
    spawn(
      'sh',
      [
        '-c',
        'while kill -0 "$1" 2>/dev/null; do current=$(ps -o ppid= -p "$1" 2>/dev/null | tr -d " "); if [ "$current" != "$2" ]; then docker rm -f "$3" 2>/dev/null; exit 0; fi; sleep 0.25; done; docker rm -f "$3" 2>/dev/null',
        'ph-docker-watch',
        String(nodePid),
        String(expectedPpid),
        containerName,
      ],
      { detached: true, stdio: 'ignore' }
    ).unref()
  }

  const stopContainer = async (target: Container) => {
    try {
      await target.remove({ force: true })
    } catch (e) {
      if (isDockerContainerNotFound(e)) return
      try {
        await target.stop({ signal: 'SIGINT', t: stopTimeoutSec })
      } catch (stopErr) {
        if (isDockerContainerNotFound(stopErr)) return
        await target.kill().catch((killErr) => {
          if (!isDockerContainerNotFound(killErr)) throw killErr
        })
      }
      await target.remove({ force: true }).catch((removeErr) => {
        if (!isDockerContainerNotFound(removeErr)) throw removeErr
      })
    }
  }

  if (name) {
    try {
      const existing = docker.getContainer(name)
      const info = await existing.inspect()
      if (info.State.Running) {
        await stopContainer(existing)
      } else {
        await existing.remove({ force: true })
      }
    } catch {
      // no existing container
    }
  }

  const createOptions: ContainerCreateOptions = {
    Image: DOCKER_INSTANCE_IMAGE_NAME(),
    Env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
    name,
    HostConfig: {
      Init: true,
      AutoRemove: autoRemove,
      Binds: [...binds, `${binPath}:${pocketbasePath}:ro`],
      Ulimits: [
        {
          Name: 'nofile',
          Soft: 1024,
          Hard: 4096,
        },
      ],
      ...(port
        ? {
            PortBindings: {
              [`${port}/tcp`]: [{ HostPort: `${port}` }],
            },
          }
        : {}),
    },
    Tty: false,
    ...(port
      ? {
          ExposedPorts: {
            [`${port}/tcp`]: {},
          },
        }
      : {}),
    Cmd: ['./pocketbase', ...args],
    WorkingDir: mkContainerHomePath(),
  }

  const emitter = docker.run(DOCKER_INSTANCE_IMAGE_NAME(), [''], [stdout, stderr], createOptions, (err, data) => {
    if (err) {
      onStderr?.(String(err))
    }
    const statusCode = data?.StatusCode ?? (err ? 1 : 0)
    onExit?.(statusCode)
  })

  const container = await new Promise<Container>((resolve, reject) => {
    emitter.once('start', resolve)
    emitter.once('error', reject)
  })

  if (name) {
    spawnParentExitWatchdog(process.pid, process.ppid, name)
  }

  return {
    kill: async () => {
      await stopContainer(container)
    },
  }
}
