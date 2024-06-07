import { boolean } from 'boolean'
import { existsSync } from 'fs'
import { env as _env } from 'process'

export const env = (name: string, _default = '') => {
  const v = _env[name]
  if (!v) return _default
  return v
}

export const envi = (name: string, _default: number) =>
  parseInt(env(name, _default.toString()))

export const envb = (name: string, _default: boolean) =>
  boolean(env(name, _default.toString()))

export const envfile = (name: string, _default = '') => {
  const v = env(name, _default)
  if (!v) {
    throw new Error(`${name} environment variable must be specified`)
  }
  if (!existsSync(v)) {
    throw new Error(`${name} (${v}) path must exist`)
  }
  return v
}

export const envrequired = (name: string, _default = '') => {
  const v = env(name, _default)
  if (!v) {
    throw new Error(`${name} environment variable must be specified`)
  }
  return v
}
