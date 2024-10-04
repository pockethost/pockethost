import { ioc } from '.'
import { ConsoleLogger } from './ConsoleLogger'

export type LoggerConfig = {
  level: LogLevelName
  pfx: string[]
}

export const isLevelLte = (a: LogLevelName, b: LogLevelName) => {
  return LogLevels[a] <= LogLevels[b]
}

export const isLevelGt = (a: LogLevelName, b: LogLevelName) => {
  return LogLevels[a] > LogLevels[b]
}

export const isLevelGte = (a: LogLevelName, b: LogLevelName) => {
  return LogLevels[a] >= LogLevels[b]
}

export enum LogLevelName {
  Trace = 'trace',
  Raw = 'raw',
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Abort = 'abort',
}

export const LEVEL_NAMES = [
  LogLevelName.Trace,
  LogLevelName.Raw,
  LogLevelName.Debug,
  LogLevelName.Info,
  LogLevelName.Warn,
  LogLevelName.Error,
  LogLevelName.Abort,
]

export const LogLevels = {
  [LogLevelName.Trace]: 0,
  [LogLevelName.Raw]: 1,
  [LogLevelName.Debug]: 2,
  [LogLevelName.Info]: 3,
  [LogLevelName.Warn]: 4,
  [LogLevelName.Error]: 5,
  [LogLevelName.Abort]: 6,
} as const

export type Logger = {
  raw: (...args: any[]) => void
  dbg: (...args: any[]) => void
  warn: (...args: any[]) => void
  info: (...args: any[]) => void
  error: (...args: any[]) => void
  criticalError: (...args: any[]) => void
  create: (name: string, configOverride?: Partial<LoggerConfig>) => Logger
  child: (name: string) => Logger
  trace: (...args: any[]) => void
  debug: (...args: any[]) => void
  breadcrumb: (s: object) => Logger
  abort: (...args: any[]) => never
  shutdown: () => void
  setLevel: (level: LogLevelName) => void
}

export const logger = () => {
  try {
    return ioc<Logger>('logger')
  } catch (e) {
    console.warn('No logger found, using default console logger')
    return ioc('logger', new ConsoleLogger({ level: LogLevelName.Debug }))
  }
}

export const LoggerService = logger
