export type Config = {
  debug: boolean
  pfx: string[]
}

export type Logger = ReturnType<typeof createLogger>

export const createLogger = (config: Partial<Config>) => {
  const _config: Config = {
    debug: true,
    pfx: [''],
    ...config,
  }
  const { debug, pfx } = _config
  const _pfx = (s: string) =>
    [s, ...pfx]
      .filter((v) => !!v)
      .map((p) => `[${p}]`)
      .join(' ')

  const dbg = (...args: any[]) => {
    if (!debug) return
    console.log(_pfx('DBG'), ...args)
  }

  const warn = (...args: any[]) => {
    console.log(_pfx('WARN'), ...args)
  }

  const info = (...args: any[]) => {
    console.log(_pfx(`INFO`), ...args)
  }

  const error = (...args: any[]) => {
    console.error(_pfx(`ERROR`), ...args)
  }

  const create = (s: string) =>
    createLogger({
      ..._config,
      pfx: [..._config.pfx, s],
    })

  return { dbg, warn, info, error, create }
}
