import { DOCKER_INSTANCE_IMAGE_NAME, mkContainerHomePath } from '@'
import { map } from '@s-libs/micro-dash'
import Docker, { Container, ContainerCreateOptions } from 'dockerode'
import MemoryStream from 'memorystream'

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

export const spawnPocketBaseContainer = async (cfg: PocketBaseContainerSpawnConfig) => {
  const {
    binPath,
    args,
    binds,
    env = {},
    port,
    autoRemove = false,
    name,
    onStdout,
    onStderr,
    onExit,
  } = cfg

  const docker = new Docker()
  const pocketbasePath = mkContainerHomePath('pocketbase')
  const stdout = new MemoryStream()
  const stderr = new MemoryStream()

  stdout.on('data', (data) => onStdout?.(data.toString()))
  stderr.on('data', (data) => onStderr?.(data.toString()))

  const stopContainer = async (target: Container) => {
    try {
      await target.stop({ signal: 'SIGINT' })
    } catch {
      await target.stop({ signal: 'SIGKILL' }).catch(() => undefined)
    }
  }

  if (name) {
    try {
      const existing = docker.getContainer(name)
      const info = await existing.inspect()
      if (info.State.Running) {
        await stopContainer(existing)
      }
      await existing.remove({ force: true })
    } catch {
      // no existing container
    }
  }

  const createOptions: ContainerCreateOptions = {
    Image: DOCKER_INSTANCE_IMAGE_NAME(),
    Env: map(env, (v, k) => `${k}=${v}`),
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

  return {
    kill: async () => {
      await stopContainer(container)
    },
  }
}
