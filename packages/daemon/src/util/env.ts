import { boolean } from 'boolean'
import { env as _env } from 'process'

export const env = (name: string, _default: string = '') => {
  const v = _env[name]
  if (!v) return _default
  return v
}

export const envi = (name: string, _default: number) =>
  parseInt(env(name, _default.toString()))

export const envb = (name: string, _default: boolean) =>
  boolean(env(name, _default.toString()))
