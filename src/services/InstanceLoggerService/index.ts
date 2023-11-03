import { DEBUG, mkInstanceDataPath } from '$constants'
import { LoggerService, createCleanupManager } from '$shared'
import * as fs from 'fs'
import { Tail } from 'tail'
import * as winston from 'winston'

type UnsubFunc = () => void

const loggers: {
  [key: string]: {
    info: (msg: string) => void
    error: (msg: string) => void
    tail: (
      linesBack: number,
      data: (line: winston.LogEntry) => void,
    ) => UnsubFunc
  }
} = {}

export function InstanceLogger(instanceId: string, target: string) {
  const loggerKey = `${instanceId}_${target}`
  if (loggers[loggerKey]) {
    return loggers[loggerKey]!
  }

  const logDirectory = mkInstanceDataPath(instanceId, `logs`)
  console.log(`Creating ${logDirectory}`)
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true })
  }

  const logFile = mkInstanceDataPath(instanceId, `logs`, `${target}.log`)

  const logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf((info) => {
        return JSON.stringify({
          stream: info.level === 'info' ? 'stdout' : 'stderr',
          time: info.timestamp,
          message: info.message,
        })
      }),
    ),
    transports: [
      new winston.transports.File({
        filename: logFile,
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10,
        tailable: true,
        zippedArchive: true,
      }),
    ],
  })

  const { error, warn } = LoggerService()
    .create('InstanceLogger')
    .breadcrumb(instanceId)
    .breadcrumb(target)

  const api = {
    info: (msg: string) => {
      logger.info(msg)
    },
    error: (msg: string) => {
      logger.error(msg)
    },
    tail: (
      linesBack: number,
      data: (line: winston.LogEntry) => void,
    ): UnsubFunc => {
      const logFile = mkInstanceDataPath(instanceId, `logs`, `${target}.log`)

      const cm = createCleanupManager()
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

          cm.add(() => tail.unwatch())
        } catch (e) {
          warn(e)
          tid = setTimeout(check, 1000)
        }
      }
      check()

      return () => {
        cm.shutdown()
      }
    },
  }
  if (DEBUG()) {
    const { dbg } = LoggerService().create(`Logger`).breadcrumb(instanceId)
    api.tail(0, (entry) => {
      dbg(entry.message)
    })
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
