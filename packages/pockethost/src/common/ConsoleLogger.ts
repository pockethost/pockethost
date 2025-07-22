import { inspect } from 'util'
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

export function ConsoleLogger(initialConfig: Partial<LoggerConfig> = {}): Logger {
  let config: LoggerConfig = {
    level: LogLevelName.Info,
    pfx: [],
    breadcrumbs: [],
    context: {},
    ...initialConfig,
  }

  function log(level: LogLevelName, args: any[]) {
    if (isLevelGte(level, config.level)) {
      const prefix = config.pfx.length > 0 ? `[${config.pfx.join(':')}] ` : ''
      const formattedArgs = args.map((arg) =>
        typeof arg === 'object' && arg !== null ? inspect(arg, { depth: null, colors: true }) : arg
      )
      CONSOLE_METHODS[level](`${prefix}${level.toUpperCase()}:`, ...formattedArgs)
    }
  }

  const breadcrumbs: string[] = []
  const context: Record<string, string | number | undefined> = {}
  const withBreadcrumbs = (args: any[]) => {
    return [breadcrumbs.map((b) => `[${b}]`).join(' '), ...args]
  }

  const logger: Logger = {
    raw(...args: any[]) {
      log(LogLevelName.Raw, withBreadcrumbs(args))
    },
    trace(...args: any[]) {
      log(LogLevelName.Trace, withBreadcrumbs(args))
    },
    debug(...args: any[]) {
      log(LogLevelName.Debug, withBreadcrumbs(args))
    },
    dbg(...args: any[]) {
      logger.debug(...args)
    },
    info(...args: any[]) {
      log(LogLevelName.Info, withBreadcrumbs(args))
    },
    warn(...args: any[]) {
      log(LogLevelName.Warn, withBreadcrumbs(args))
    },
    error(...args: any[]) {
      log(LogLevelName.Error, withBreadcrumbs(args))
    },
    criticalError(...args: any[]) {
      logger.error('CRITICAL:', withBreadcrumbs(args))
    },
    create(name: string, configOverride?: Partial<LoggerConfig>): Logger {
      const newConfig = {
        ...config,
        breadcrumbs: [...breadcrumbs, name],
        context: { ...context },
        pfx: [...config.pfx, name],
        logger: logger,
        ...configOverride,
      }
      return ConsoleLogger(newConfig)
    },
    child(name: string): Logger {
      return logger.create(name)
    },
    breadcrumb(s: string): Logger {
      breadcrumbs.push(s)
      return logger
    },
    context(name: string | object, value?: string | number): Logger {
      if (typeof name === `object`) {
        Object.entries(name).forEach(([k, v]) => {
          context[k] = v
        })
      } else {
        context[name] = value
      }
      return logger
    },
    abort(...args: any[]): never {
      log(LogLevelName.Abort, withBreadcrumbs(args))
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
