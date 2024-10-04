import { LogLevelName, Logger, LoggerConfig, isLevelGte } from './Logger'

const CONSOLE_METHODS = {
  [LogLevelName.Trace]: console.trace,
  [LogLevelName.Raw]: console.log,
  [LogLevelName.Debug]: console.debug,
  [LogLevelName.Info]: console.info,
  [LogLevelName.Warn]: console.warn,
  [LogLevelName.Error]: console.error,
  [LogLevelName.Abort]: console.error,
}

export function ConsoleLogger(
  initialConfig: Partial<LoggerConfig> = {},
): Logger {
  let config: LoggerConfig = {
    level: LogLevelName.Info,
    pfx: [],
    ...initialConfig,
  }

  function log(level: LogLevelName, ...args: any[]) {
    if (isLevelGte(level, config.level)) {
      const prefix = config.pfx.length > 0 ? `[${config.pfx.join(':')}] ` : ''
      CONSOLE_METHODS[level](`${prefix}${level.toUpperCase()}:`, ...args)
    }
  }

  const logger: Logger = {
    raw(...args: any[]) {
      log(LogLevelName.Raw, ...args)
    },
    trace(...args: any[]) {
      log(LogLevelName.Trace, ...args)
    },
    debug(...args: any[]) {
      log(LogLevelName.Debug, ...args)
    },
    dbg(...args: any[]) {
      logger.debug(...args)
    },
    info(...args: any[]) {
      log(LogLevelName.Info, ...args)
    },
    warn(...args: any[]) {
      log(LogLevelName.Warn, ...args)
    },
    error(...args: any[]) {
      log(LogLevelName.Error, ...args)
    },
    criticalError(...args: any[]) {
      logger.error('CRITICAL:', ...args)
    },
    create(name: string, configOverride?: Partial<LoggerConfig>): Logger {
      const newConfig = {
        ...config,
        pfx: [...config.pfx, name],
        ...configOverride,
      }
      return ConsoleLogger(newConfig)
    },
    child(name: string): Logger {
      return logger.create(name)
    },
    breadcrumb(s: object): Logger {
      console.log('Breadcrumb:', s)
      return logger
    },
    abort(...args: any[]): never {
      log(LogLevelName.Abort, ...args)
      process.exit(1)
    },
    shutdown() {
      // No-op for console logger
    },
    setLevel(level: LogLevelName) {
      config.level = level
    },
  }

  return logger
}
