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

function formatArg(arg: any): any {
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg, null, 2)
    } catch (e) {
      // Handle circular references or other JSON.stringify errors
      return String(arg)
    }
  }
  return arg
}

export function ConsoleLogger(initialConfig: Partial<LoggerConfig> = {}): Logger {
  const config: LoggerConfig = {
    level: LogLevelName.Info,
    breadcrumbs: [],
    context: {},
    ...initialConfig,
  }

  const { breadcrumbs, context } = config

  function log(level: LogLevelName, args: any[]) {
    if (isLevelGte(level, config.level)) {
      const formattedArgs = args.map(formatArg)
      CONSOLE_METHODS[level](`[${level.toUpperCase()}]`, ...withBreadcrumbs(formattedArgs))
    }
  }

  const withBreadcrumbs = (args: any[]) => {
    return [breadcrumbs.map((b) => `[${b}]`).join(' '), ...args]
  }

  const logger: Logger = {
    raw(...args: any[]) {
      log(LogLevelName.Raw, args)
    },
    trace(...args: any[]) {
      log(LogLevelName.Trace, args)
    },
    debug(...args: any[]) {
      log(LogLevelName.Debug, args)
    },
    dbg(...args: any[]) {
      logger.debug(...args)
    },
    info(...args: any[]) {
      log(LogLevelName.Info, args)
    },
    warn(...args: any[]) {
      log(LogLevelName.Warn, args)
    },
    error(...args: any[]) {
      log(LogLevelName.Error, args)
    },
    criticalError(...args: any[]) {
      logger.error('CRITICAL:', args)
    },
    create(name: string, configOverride?: Partial<LoggerConfig>): Logger {
      const newBreadcrumbs = [...breadcrumbs]
      if (!newBreadcrumbs.includes(name)) {
        newBreadcrumbs.push(name)
      }
      const newConfig = {
        ...config,
        breadcrumbs: newBreadcrumbs,
        context: { ...context },
        logger: logger,
        ...configOverride,
      }
      return ConsoleLogger(newConfig)
    },
    child(name: string): Logger {
      return logger.create(name)
    },
    breadcrumb(s: string): Logger {
      if (!breadcrumbs.includes(s)) {
        breadcrumbs.push(s)
      }
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
