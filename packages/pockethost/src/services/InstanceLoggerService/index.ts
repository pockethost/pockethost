import { mkInstanceDataPath } from '$constants'
import {
  LoggerService,
  createCleanupManager,
  mergeConfig,
  stringify,
} from '$public'
import { asyncExitHook } from '$util'
import * as fs from 'fs'
import { Tail } from 'tail'
import * as winston from 'winston'

type UnsubFunc = () => void

export type InstanceLoggerApi = {
  info: (msg: string) => void
  error: (msg: string) => void
  tail: (linesBack: number, data: (line: winston.LogEntry) => void) => UnsubFunc
  shutdown: () => void
}

export type InstanceLoggerOptions = {
  ttl: number
}

const loggers: {
  [key: string]: InstanceLoggerApi
} = {}

export function InstanceLogger(
  instanceId: string,
  target: string,
  options: Partial<InstanceLoggerOptions> = {},
) {
  const { dbg, info } = LoggerService().create(instanceId).breadcrumb(target)
  const { ttl } = mergeConfig<InstanceLoggerOptions>({ ttl: 0 }, options)

  dbg({ ttl })

  const loggerKey = `${instanceId}_${target}`
  if (loggers[loggerKey]) {
    dbg(`Logger exists, using cache`)
    return loggers[loggerKey]!
  }

  const logDirectory = mkInstanceDataPath(instanceId, `logs`)
  if (!fs.existsSync(logDirectory)) {
    dbg(`Creating ${logDirectory}`)
    fs.mkdirSync(logDirectory, { recursive: true })
  }

  const logFile = mkInstanceDataPath(instanceId, `logs`, `${target}.log`)

  const cm = createCleanupManager()

  const fileTransport = new winston.transports.File({
    filename: logFile,
    maxsize: 100 * 1024 * 1024, // 100MB
    maxFiles: 10,
    tailable: true,
    zippedArchive: true,
  })
  const logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf((info) => {
        return stringify({
          stream: info.level === 'info' ? 'stdout' : 'stderr',
          time: info.timestamp,
          message: info.message,
        })
      }),
    ),
    transports: [fileTransport],
  })

  cm.add(() => {
    dbg(`Deleting and closing`)
    delete loggers[loggerKey]
    fileTransport.close?.()
    logger.close()
  })

  const { error, warn } = LoggerService()
    .create('InstanceLogger')
    .breadcrumb(instanceId)
    .breadcrumb(target)

  const resetTtl = (() => {
    let tid: ReturnType<typeof setTimeout>

    return () => {
      if (!ttl) return
      clearTimeout(tid)
      tid = setTimeout(() => {
        dbg(`Logger timeout`)
        api.shutdown()
      }, ttl)
    }
  })()

  const api = {
    info: (msg: string) => {
      resetTtl()
      dbg(`info: `, msg)
      logger.info(msg)
    },
    error: (msg: string) => {
      resetTtl()
      dbg(`error: `, msg)
      logger.error(msg)
    },
    tail: (
      linesBack: number,
      data: (line: winston.LogEntry) => void,
    ): UnsubFunc => {
      if (ttl) {
        throw new Error(`Cannot tail with ttl active`)
      }
      const logFile = mkInstanceDataPath(instanceId, `logs`, `${target}.log`)

      let tid: any
      cm.add(() => clearTimeout(tid))
      const check = () => {
        try {
          const tail = new Tail(logFile, { nLines: linesBack })

          tail.on('line', (line) => {
            try {
              const entry = JSON.parse(line)
              data(entry)
            } catch (e) {
              data({
                level: 'info',
                message: line,
                time: new Date().toISOString(),
              })
            }
          })
          tail.on('error', (e) => {
            error(`Caught a tail error ${e}`)
          })

          cm.add(() => tail.unwatch())
        } catch (e) {
          warn(e)
          tid = setTimeout(check, 1000)
        }
      }
      check()

      const unsub = asyncExitHook(() => cm.shutdown())

      return () => {
        cm.shutdown()
        unsub()
      }
    },
    shutdown: () => cm.shutdown(),
  }

  loggers[loggerKey] = api
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
