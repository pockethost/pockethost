import { mkSingleton } from './mkSingleton'

export type Config = {
  raw?: boolean
  debug: boolean
  trace?: boolean
  errorTrace?: boolean
  pfx?: string[]
}

export type Logger = ReturnType<typeof createLogger>

const MAX_BUF = 1000
let _curIdx = 0
const _buf: any = []

export const createLogger = (config: Partial<Config>) => {
  const _config: Required<Config> = {
    raw: false,
    debug: true,
    trace: false,
    errorTrace: false,
    pfx: [''],
    ...config,
  }
  const { pfx, errorTrace } = _config

  const _pfx = (s: string) =>
    [new Date().toISOString(), s, ...pfx]
      .filter((v) => !!v)
      .map((p) => `[${p}]`)
      .join(' ')

  const _log = (shouldDisplay: boolean, ...args: any[]) => {
    if (_buf.length < MAX_BUF) {
      _buf.push(args)
    } else {
      _buf[_curIdx] = args
      _curIdx++
      if (_curIdx === MAX_BUF) _curIdx = 0
    }
    if (shouldDisplay) console.log(...args)
  }

  const raw = (...args: any[]) => {
    _log(_config.raw, _pfx('RAW'), ...args)
  }

  const dbg = (...args: any[]) => {
    _log(_config.debug, _pfx('DBG'), ...args)
  }

  const warn = (...args: any[]) => {
    _log(true, _pfx('WARN'), ...args)
  }

  const info = (...args: any[]) => {
    _log(true, _pfx(`INFO`), ...args)
  }

  const trace = (...args: any[]) => {
    _log(_config.trace, _pfx(`TRACE`), ...args)
  }

  const error = (...args: any[]) => {
    _log(true, _pfx(`ERROR`), ...args)
    if (!errorTrace) return
    console.error(`========== ERROR TRACEBACK BEGIN ==============`)
    ;[..._buf.slice(_curIdx, MAX_BUF), ..._buf.slice(0, _curIdx)].forEach(
      (args) => {
        console.error(...args)
      }
    )
    console.error(`========== ERROR TRACEBACK END ==============`)
  }

  const create = (s: string, configOverride?: Partial<Config>) =>
    createLogger({
      ..._config,
      ...configOverride,
      pfx: [..._config.pfx, s],
    })

  const breadcrumb = (s?: string) => (s ? pfx.push(s) : null)

  // Compatibility func
  const child = (extra: any) => create(JSON.stringify(extra))

  return {
    raw,
    dbg,
    warn,
    info,
    error,
    create,
    child,
    trace,
    debug: dbg,
    breadcrumb,
    shutdown() {
      dbg(`Logger shutting down`)
    },
  }
}

export const logger = mkSingleton((config: Config) => createLogger(config))
