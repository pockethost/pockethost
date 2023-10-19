import { mkInstanceDataPath } from '$constants'
import * as fs from 'fs'
import * as winston from 'winston'

type UnsubFunc = () => void

const loggers: { [key: string]: winston.Logger } = {}

function createOrGetLogger(instanceId: string, target: string): winston.Logger {
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

  loggers[loggerKey] = logger
  return logger
}

export function InstanceLogger(instanceId: string, target: string) {
  const logger = createOrGetLogger(instanceId, target)

  return {
    info: (msg: string) => {
      logger.info(msg)
    },
    error: (msg: string) => {
      logger.error(msg)
    },
    tail: (linesBack: number, data: (line: string) => void): UnsubFunc => {
      const stream = logger.stream({ start: -linesBack })
      const listener = (log: winston.LogEntry) => {
        data(JSON.stringify(log))
      }
      stream.on('log', listener)

      // Return an unsubscribe function to remove the listener when done
      return () => {
        stream.removeListener('log', listener)
      }
    },
  }
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
