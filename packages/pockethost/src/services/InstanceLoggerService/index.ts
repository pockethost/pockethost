import * as fs from 'fs'
import { appendFile } from 'fs/promises'
import { Tail } from 'tail'
import { LoggerService, mkInstanceDataPath, stringify } from '../../../core'

type UnsubFunc = () => void

export type InstanceLoggerApi = {
  info: (msg: string) => void
  error: (msg: string) => void
  tail: (linesBack: number, data: (line: LogEntry) => void) => UnsubFunc
  shutdown: () => void
}

export type LogEntry = {
  message: string
  stream: 'stdout' | 'stderr'
  time: string
}

export type InstanceLoggerOptions = {}

const loggers: {
  [key: string]: InstanceLoggerApi
} = {}

export function InstanceLogger(
  instanceId: string,
  target: string,
  options: Partial<InstanceLoggerOptions> = {},
) {
  const { dbg, info, error, warn } = LoggerService()
    .create(instanceId)
    .breadcrumb({ target })

  const logDirectory = mkInstanceDataPath(instanceId, `logs`)
  if (!fs.existsSync(logDirectory)) {
    dbg(`Creating ${logDirectory}`)
    fs.mkdirSync(logDirectory, { recursive: true })
  }

  const logFile = mkInstanceDataPath(instanceId, `logs`, `${target}.log`)

  const appendLogEntry = (msg: string, stream: 'stdout' | 'stderr') => {
    appendFile(
      logFile,
      stringify({
        message: msg,
        stream,
        time: new Date().toISOString(),
      }) + '\n',
    )
  }

  const api = {
    info: (msg: string) => {
      info(msg)
      appendLogEntry(msg, 'stdout')
    },
    error: (msg: string) => {
      error(msg)
      appendLogEntry(msg, 'stderr')
    },
    tail: (linesBack: number, data: (line: LogEntry) => void): UnsubFunc => {
      const logFile = mkInstanceDataPath(instanceId, `logs`, `${target}.log`)

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
          warn(e)
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
