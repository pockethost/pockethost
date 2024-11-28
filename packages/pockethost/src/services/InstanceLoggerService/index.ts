import Bottleneck from 'bottleneck'
import { existsSync } from 'fs'
import { appendFile, cp, stat, truncate } from 'fs/promises'
import { Tail } from 'tail'
import {
  ensureInstanceDirectoryStructure,
  logger,
  LoggerService,
  mkInstanceDataPath,
  stringify,
} from '../..'

type UnsubFunc = () => void

export type InstanceLogWriterApi = {
  info: (msg: string) => void
  error: (msg: string) => void
}

export type InstanceLogReaderApi = {
  tail: (linesBack: number, data: (line: LogEntry) => void) => UnsubFunc
  shutdown: () => void
}

export type LogEntry = {
  message: string
  stream: 'stdout' | 'stderr'
  time: string
}

const MultiChannelLimiter = () => {
  const channels = new Map<string, Bottleneck>()
  setInterval(() => {
    for (const [channel, limiter] of channels.entries()) {
      if (limiter.empty()) {
        console.log(`Deleting empty limiter for ${channel}`)
        channels.delete(channel)
      }
    }
  }, 1000)

  return {
    schedule(channel: string, fn: () => Promise<void>) {
      if (!channels.has(channel)) {
        channels.set(channel, new Bottleneck({ maxConcurrent: 1 }))
      }
      return channels.get(channel)!.schedule(fn)!
    },
  }
}

const limiter = MultiChannelLimiter()

export function InstanceLogWriter(
  instanceId: string,
  volume: string,
  target: string,
) {
  const lgr = logger()
    .create(`InstanceLogWriter`)
    .breadcrumb({ instanceId, target })
  const { dbg, info, error, warn } = lgr

  ensureInstanceDirectoryStructure(instanceId, volume, lgr)

  const logFile = mkInstanceDataPath(
    volume,
    instanceId,
    `logs`,
    `${target}.log`,
  )

  const appendLogEntry = async (msg: string, stream: 'stdout' | 'stderr') =>
    limiter.schedule(logFile, async () => {
      try {
        if (existsSync(logFile)) {
          // Check file size
          const stats = await stat(logFile)
          const MAX_SIZE = 1024 // 10MB in bytes

          if (stats.size > MAX_SIZE) {
            await cp(logFile, `${logFile}.1`, {
              force: true,
            })
            await truncate(logFile, 0)
          }
        }

        dbg(msg)
        await appendFile(
          logFile,
          stringify({
            message: msg,
            stream,
            time: new Date().toISOString(),
          }) + '\n',
        )
      } catch (e) {
        error(`Failed to write log entry: ${e}`)
      }
    })

  const api = {
    info: (msg: string) => {
      return appendLogEntry(msg, 'stdout')
    },
    error: (msg: string) => {
      return appendLogEntry(msg, 'stderr')
    },
  }

  return api
}

export function InstanceLogReader(
  instanceId: string,
  volume: string,
  target: string,
) {
  const logger = LoggerService().create(instanceId).breadcrumb({ target })
  const { dbg, info, error, warn } = logger

  ensureInstanceDirectoryStructure(instanceId, volume, logger)

  const api = {
    tail: (linesBack: number, data: (line: LogEntry) => void): UnsubFunc => {
      const logFile = mkInstanceDataPath(
        volume,
        instanceId,
        `logs`,
        `${target}.log`,
      )

      let tid: any
      let unsub: any
      const check = () => {
        try {
          const tail = new Tail(logFile, { nLines: linesBack })

          tail.on('line', (line) => {
            try {
              const entry = JSON.parse(line)
              data(entry)
            } catch (e) {
              data({
                stream: 'stdout',
                message: line,
                time: new Date().toISOString(),
              })
            }
          })
          tail.on('error', (e) => {
            error(`Caught a tail error ${e}`)
          })

          unsub = () => tail.close()
        } catch (e) {
          if ((e as any).code === 'ENOENT') {
          } else {
            warn(e)
          }
          tid = setTimeout(check, 1000)
        }
      }
      check()

      return () => {
        clearTimeout(tid)
        unsub()
      }
    },
  }

  return api
}

// // Example usage
// const loggerInstance = InstanceLogger('123', 'my-target')
// loggerInstance.info('This is an info message')
// loggerInstance.error('This is an error message')
// const unsubscribe = loggerInstance.tail(10, (line) => {
//   console.log(line)
// })

// // Later when you want to stop listening to the tail:
// // unsubscribe();
