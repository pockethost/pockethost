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

export class ConsoleLogger implements Logger {
  private config: LoggerConfig

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevelName.Info,
      pfx: [],
      ...config,
    }
  }

  private log(level: LogLevelName, ...args: any[]) {
    if (isLevelGte(level, this.config.level)) {
      const prefix =
        this.config.pfx.length > 0 ? `[${this.config.pfx.join(':')}] ` : ''

      CONSOLE_METHODS[level](`${prefix}${level.toUpperCase()}:`, ...args)
    }
  }

  raw(...args: any[]) {
    this.log(LogLevelName.Raw, ...args)
  }
  trace(...args: any[]) {
    this.log(LogLevelName.Trace, ...args)
  }
  debug(...args: any[]) {
    this.log(LogLevelName.Debug, ...args)
  }
  dbg(...args: any[]) {
    this.debug(...args)
  }
  info(...args: any[]) {
    this.log(LogLevelName.Info, ...args)
  }
  warn(...args: any[]) {
    this.log(LogLevelName.Warn, ...args)
  }
  error(...args: any[]) {
    this.log(LogLevelName.Error, ...args)
  }
  criticalError(...args: any[]) {
    this.error('CRITICAL:', ...args)
  }

  create(name: string, configOverride?: Partial<LoggerConfig>): Logger {
    const newConfig = {
      ...this.config,
      pfx: [...this.config.pfx, name],
      ...configOverride,
    }
    return new ConsoleLogger(newConfig)
  }

  child(name: string): Logger {
    return this.create(name)
  }

  breadcrumb(s: object): Logger {
    console.log('Breadcrumb:', s)
    return this
  }

  abort(...args: any[]): never {
    this.log(LogLevelName.Abort, ...args)
    process.exit(1)
  }

  shutdown() {
    // No-op for console logger
  }

  setLevel(level: LogLevelName) {
    this.config.level = level
  }
}
