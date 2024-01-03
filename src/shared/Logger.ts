/// <require "node">

import chalk from 'chalk'
import stringify from 'json-stringify-safe'
import { mergeConfig } from '../util/mergeConfig'
import { mkSingleton } from './mkSingleton'

export type Config = {
  level: LogLevelName
  pfx: string[]
}

export type Logger = ReturnType<typeof createLogger>

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

export const LogLevelConsoleMap = {
  [LogLevelName.Trace]: console.trace,
  [LogLevelName.Raw]: console.log,
  [LogLevelName.Debug]: console.debug,
  [LogLevelName.Info]: console.info,
  [LogLevelName.Warn]: console.warn,
  [LogLevelName.Error]: console.error,
  [LogLevelName.Abort]: console.error,
} as const

export const LogLevels = {
  [LogLevelName.Trace]: 0,
  [LogLevelName.Raw]: 1,
  [LogLevelName.Debug]: 2,
  [LogLevelName.Info]: 3,
  [LogLevelName.Warn]: 4,
  [LogLevelName.Error]: 5,
  [LogLevelName.Abort]: 6,
} as const

export const createLogger = (config: Partial<Config>) => {
  const _config = mergeConfig<Config>(
    {
      level: LogLevelName.Debug,
      pfx: [''],
    },
    config,
  )
  const { pfx } = _config

  const setLevel = (level: LogLevelName) => {
    _config.level = level
  }

  const _pfx = (s: string) =>
    [new Date().toISOString(), s, ...pfx]
      .filter((v) => !!v)
      .map((p) => `[${p}]`)
      .join(' ')

  const _log = (levelIn: LogLevelName, ...args: any[]) => {
    if (isLevelGte(levelIn, _config.level)) {
      const pfx = args.shift()
      while (args.length > 0) {
        let arg = args.shift()
        const t = typeof arg
        if (t === 'string' && !!arg.match(/\n/)) {
          args.unshift(...arg.split(/\n/))
          continue
        }
        if (t === 'object') {
          args.unshift(...stringify(arg, null, 2).split(/\n/))
          continue
        }
        if (t === 'function') {
          arg = `<<function ${stringify(arg.toString())}>>`
        }
        LogLevelConsoleMap[levelIn](...[pfx, arg])
      }
    }
  }

  const raw = (...args: any[]) => {
    _log(LogLevelName.Raw, _pfx('RAW'), ...args)
  }

  const trace = (...args: any[]) => {
    _log(LogLevelName.Trace, _pfx(`TRACE`), ...args)
  }

  const dbg = (...args: any[]) => {
    _log(LogLevelName.Debug, _pfx(chalk.blueBright('DBG')), ...args)
  }

  const info = (...args: any[]) => {
    _log(
      LogLevelName.Info,
      _pfx(
        isLevelGt(LogLevelName.Info, _config.level) ? chalk.gray(`INFO`) : '',
      ),
      ...args,
    )
  }

  const warn = (...args: any[]) => {
    _log(
      LogLevelName.Warn,
      _pfx(chalk.yellow(chalk.cyanBright('WARN'))),
      ...args,
    )
  }

  const error = (...args: any[]) => {
    _log(LogLevelName.Error, ...[_pfx(chalk.bgRed(`ERROR`)), ...args])
  }

  const criticalError = (...args: any[]) => {
    _log(LogLevelName.Error, ...[_pfx(chalk.bgRed(`ERROR`)), ...args])
    new Error().stack?.split(/\n/).forEach((line) => {
      _log(LogLevelName.Debug, _pfx(chalk.bgRed(`ERROR`)), line)
    })
  }

  const abort = (...args: any[]): never => {
    _log(LogLevelName.Abort, true, ...[_pfx(chalk.bgRed(`ABORT`)), ...args])
    throw new Error(`Fatal error: ${stringify(args)}`)
  }

  const create = (s: string, configOverride?: Partial<Config>) =>
    createLogger({
      ..._config,
      ...configOverride,
      pfx: [..._config.pfx, s],
    })

  const breadcrumb = (s: string) => {
    pfx.push(s)
    return api
  }

  // Compatibility func
  const child = (extra: any) => create(stringify(extra))

  const api = {
    raw,
    dbg,
    warn,
    info,
    error,
    criticalError,
    create,
    child,
    trace,
    debug: dbg,
    breadcrumb,
    abort,
    shutdown() {
      dbg(`Logger shutting down`)
    },
    setLevel,
  }
  return api
}

export const LoggerService = mkSingleton((config: Partial<Config> = {}) =>
  createLogger(config),
)
