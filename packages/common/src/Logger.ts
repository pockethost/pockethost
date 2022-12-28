import { mkSingleton } from './mkSingleton'

export type Config = {
  raw?: boolean
  debug: boolean
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
    pfx: [''],
    ...config,
  }
  const { pfx } = _config

  const _pfx = (s: string) =>
    [s, ...pfx]
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

  const error = (...args: any[]) => {
    _log(true, _pfx(`ERROR`), ...args)
    console.error(`========================`)
    ;[..._buf.slice(_curIdx, MAX_BUF), ..._buf.slice(0, _curIdx)].forEach(
      (args) => {
        console.error(...args)
      }
    )
    console.error(`========================`)
  }

  const create = (s: string) =>
    createLogger({
      ..._config,
      pfx: [..._config.pfx, s],
    })

  return { raw, dbg, warn, info, error, create }
}

export const logger = mkSingleton((config: Config) => createLogger(config))
