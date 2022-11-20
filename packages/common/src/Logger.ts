export type Config = {
  debug: boolean
}

export type Logger = ReturnType<typeof createLogger>

export const createLogger = (config: Config) => {
  const { debug } = config
  const dbg = (...args: any[]) => {
    if (!debug) return
    console.log(`[DBG]`, ...args)
  }

  const warn = (...args: any[]) => {
    console.log(`[WARN]`, ...args)
  }

  const info = (...args: any[]) => {
    console.log(`[INFO]`, ...args)
  }

  const error = (...args: any[]) => {
    console.error(`[ERROR]`, ...args)
  }

  return { dbg, warn, info, error }
}
