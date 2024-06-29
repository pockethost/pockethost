import { forEach, keys, omit, uniq } from '@s-libs/micro-dash'
import { parse } from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { info } from '../cli'
import { PH_HOME, settings } from '../constants'

const envFile = () => {
  const envFile = PH_HOME(`.env`)
  if (!existsSync(envFile)) {
    writeFileSync(envFile, '')
  }
  return envFile
}

export const setConfig = (name: string, value: string) => {
  if (value === '=') throw new Error(`Invalid value ${value}`)

  const values = _parse()
  values[name] = value
  writeFileSync(
    envFile(),
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  )
  process.env[name] = value
  info(`Set ${name}=${value}`)
  info(`Written to ${envFile()}`)
}

export const unsetConfig = (name: string) => {
  const values = _parse()
  delete values[name]
  writeFileSync(
    envFile(),
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  )
  info(`Unset ${name}`)
  info(`Written to ${envFile()}`)
}

export const listConfig = () => {
  const values = _parse()

  if (keys(values).length > 0) {
    info()
    info(`Config values from ${envFile()}:`)
    forEach(values, (v, k) => {
      info(`\t${k}=${v}`)
    })
    info()
  } else {
    info(`No config values found in ${envFile()}`)
  }

  const defaults = omit(settings, keys(values) as any)
  if (keys(defaults).length > 0) {
    info(`Default values:`)
    forEach(settings, (v, k) => {
      if (k in values) return
      info(`\t${k}=${v}`)
    })
  } else {
    info(`No default values because all values are defined in ${envFile()}`)
  }
}

export const appendConfig = (name: string, value: string) => {
  const values = _parse()
  values[name] = uniq([
    ...(values[name]
      ?.split(/,/)
      .map((v) => v.trim())
      .filter((v) => !!v) || []),
    value,
  ]).join(`,`)
  writeFileSync(
    envFile(),
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  )
  info(`Added ${value} to ${name}`)
  info(`Written to ${envFile()}`)
}

export const filterConfig = (name: string, value: string) => {
  const values = _parse()
  values[name] = uniq([
    ...(values[name]
      ?.split(/,/)
      .map((v) => v.trim())
      .filter((v) => v !== value) || []),
  ]).join(`,`)
  writeFileSync(
    envFile(),
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  )
  info(`Filtered ${value} from ${name}`)
  info(`Written to ${envFile()}`)
}

export const _parse = () =>
  parse(readFileSync(envFile(), { encoding: 'utf8' }).toString())
