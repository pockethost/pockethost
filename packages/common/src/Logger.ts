import chalk from 'chalk'
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

  const _log = (
    fn: 'log' | 'warn' | 'error' | 'trace' | 'debug' = 'log',
    shouldDisplay: boolean,
    ...args: any[]
  ) => {
    if (_buf.length < MAX_BUF) {
      _buf.push(args)
    } else {
      _buf[_curIdx] = args
      _curIdx++
      if (_curIdx === MAX_BUF) _curIdx = 0
    }
    if (shouldDisplay)
      console[fn](
        ...args.map((arg) => {
          const t = typeof arg
          if (t === 'string' && !!arg.match(/\n/)) {
            return JSON.stringify(arg)
          }
          if (t === 'function') {
            return `<<function ${JSON.stringify(arg.toString())}>>`
          }
          if (t === 'object') {
            return JSON.stringify(arg)
          }
          return arg
        })
      )
  }

  const raw = (...args: any[]) => {
    _log('log', _config.raw, _pfx('RAW'), ...args)
  }

  const dbg = (...args: any[]) => {
    _log('debug', _config.debug, _pfx(chalk.blueBright('DBG')), ...args)
  }

  const warn = (...args: any[]) => {
    _log('warn', true, _pfx(chalk.yellow(chalk.cyanBright('WARN'))), ...args)
  }

  const info = (...args: any[]) => {
    _log('log', true, _pfx(chalk.gray(`INFO`)), ...args)
  }

  const trace = (...args: any[]) => {
    _log('trace', _config.trace, _pfx(`TRACE`), ...args)
  }

  const error = (...args: any[]) => {
    _log('error', true, _pfx(chalk.bgRed(`ERROR`)), ...args)
    if (!errorTrace) return
    console.error(`========== ERROR TRACEBACK BEGIN ==============`)
    ;[..._buf.slice(_curIdx, MAX_BUF), ..._buf.slice(0, _curIdx)].forEach(
      (args) => {
        console.error(...args)
      }
    )
    console.error(`========== ERROR TRACEBACK END ==============`)
  }

  const abort = (...args: any[]): never => {
    _log('error', true, _pfx(chalk.bgRed(`ABORT`)), ...args)
    throw new Error(`Fatal error: ${JSON.stringify(args)}`)
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
  const child = (extra: any) => create(JSON.stringify(extra))

  const api = {
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
    abort,
    shutdown() {
      dbg(`Logger shutting down`)
    },
  }
  return api
}

export const logger = mkSingleton((config: Config) => createLogger(config))
