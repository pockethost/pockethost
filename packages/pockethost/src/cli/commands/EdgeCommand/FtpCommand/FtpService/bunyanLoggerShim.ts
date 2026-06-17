import type { Logger } from '@'
import { isExpectedVfsClientError } from '../../../../services/InstanceFileAccess/errors'

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Error)

const formatError = (err: Error) => err.stack ?? err.message

const fieldsSuffix = (fields?: Record<string, unknown>) => {
  if (!fields || Object.keys(fields).length === 0) return ''
  return ` ${JSON.stringify(fields)}`
}

/** Normalize bunyan-style log calls from ftp-srv into a single readable line. */
export const normalizeBunyanArgs = (args: unknown[]): string => {
  if (args.length === 0) return ''

  const [a0, a1, a2] = args

  if (a0 instanceof Error) {
    const msg = typeof a1 === 'string' ? a1 : 'error'
    const extra = typeof a1 === 'string' && isPlainObject(a2) ? a2 : isPlainObject(a1) ? a1 : undefined
    return `${msg}: ${formatError(a0)}${fieldsSuffix(extra)}`
  }

  if (isPlainObject(a0) && typeof a1 === 'string') {
    return `${a1}${fieldsSuffix(a0)}`
  }

  if (typeof a0 === 'string' && isPlainObject(a1)) {
    return `${a0}${fieldsSuffix(a1)}`
  }

  if (typeof a0 === 'string') {
    return a0
  }

  if (Array.isArray(a0)) {
    return JSON.stringify(a0)
  }

  try {
    return JSON.stringify(a0)
  } catch {
    return String(a0)
  }
}

export type BunyanLikeLogger = {
  child: (fields: Record<string, unknown>) => BunyanLikeLogger
  trace: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/** Ftp-srv expects a bunyan logger (child(fields), error(err, msg), etc.). */
export const createBunyanLoggerShim = (base: Logger): BunyanLikeLogger => {
  const mk = (log: Logger): BunyanLikeLogger => ({
    child(fields) {
      const label = Object.entries(fields)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
      return mk(log.child(label))
    },
    trace(...args) {
      log.trace(normalizeBunyanArgs(args))
    },
    debug(...args) {
      log.debug(normalizeBunyanArgs(args))
    },
    info(...args) {
      log.info(normalizeBunyanArgs(args))
    },
    warn(...args) {
      log.warn(normalizeBunyanArgs(args))
    },
    error(...args) {
      const err = args.find((arg): arg is Error => arg instanceof Error)
      if (err && isExpectedVfsClientError(err)) {
        log.debug(`client rejected: ${err.message}`)
        return
      }
      log.error(normalizeBunyanArgs(args))
    },
  })

  return mk(base.create('ftp-srv'))
}
