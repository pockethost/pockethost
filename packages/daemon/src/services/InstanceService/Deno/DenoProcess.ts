import { DAEMON_PB_DATA_DIR, DENO_PATH } from '$constants'
import { InstanceFields, Logger, StreamNames } from '@pockethost/common'
import { keys } from '@s-libs/micro-dash'
import { spawn } from 'child_process'
import { join } from 'path'
import { AsyncReturnType } from 'type-fest'
import { mkInternalAddress, mkInternalUrl } from '../../../util/internal'
import { instanceLoggerService } from '../../InstanceLoggerService'

export type DenoProcessConfig = {
  path: string
  port: number
  instance: InstanceFields
  logger: Logger
}

export type DenoApi = AsyncReturnType<typeof createDenoProcess>

export const createDenoProcess = async (config: DenoProcessConfig) => {
  const { logger } = config
  const _denoLogger = logger.create(`DenoProcess.ts`)
  const { dbg, error } = _denoLogger

  const { instance, port, path } = config
  const internalUrl = mkInternalUrl(port)
  const instanceAddress = mkInternalAddress(port)

  const secrets = instance.secrets || {}

  const cmd = DENO_PATH
  //  deno  index.ts
  const allowEnv = ['POCKETBASE_URL', ...keys(instance.secrets)].join(',')
  const args = [
    `run`,
    `--allow-env=${allowEnv}`,
    `--allow-net=${instanceAddress}`,
    path,
  ]

  const denoLogger = await instanceLoggerService().get(instance.id, {
    parentLogger: _denoLogger,
  })

  const denoWrite = (
    message: string,
    stream: StreamNames = StreamNames.Info
  ) => {
    dbg(`[${instance.id}:${path}:${stream}] ${message}`)
    return denoLogger.write(message, stream)
  }
  const env = {
    /**
     * MAJOR SECURITY WARNING. DO NOT PASS process.env OR THE INSTANCE WILL
     * GET FULL ADMIN CONTROL
     */
    POCKETBASE_URL: internalUrl,
    ...secrets,
    NO_COLOR: '1',
  }
  denoWrite(`Worker starting`, StreamNames.System)
  dbg(`Worker starting`, cmd, args, env)
  const denoProcess = spawn(cmd, args, { env })
  const filter = (buf: Buffer) => {
    return buf
      .toString()
      .replaceAll(join(DAEMON_PB_DATA_DIR, instance.id), instance.subdomain)
  }
  denoProcess.stderr.on('data', (buf: Buffer) => {
    denoWrite(filter(buf), StreamNames.Error)
  })
  denoProcess.stdout.on('data', (buf: Buffer) => {
    denoWrite(filter(buf))
  })
  const shutdownSignal = new Promise<void>((resolve) => {
    denoProcess.on('exit', async (code, signal) => {
      if (code) {
        await denoWrite(
          `Unexpected 'deno' exit code: ${code}.`,
          StreamNames.Error
        )
      } else {
        await denoWrite(
          `Worker has exited with code ${code}`,
          StreamNames.System
        )
      }
      resolve()
    })
  })

  return {
    shutdown: async () => {
      dbg(`Shutting down Deno`)
      denoProcess.kill()
      await shutdownSignal
    },
  }
}
