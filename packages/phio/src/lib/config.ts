import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { PHIO_HOME } from './constants'

const readJSONSync = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T
const writeJSONSync = (path: string, data: unknown) =>
  writeFileSync(path, JSON.stringify(data), 'utf8')

export type Config = {
  email: string
  pb_auth: string
}
export function config<T extends keyof Config>(
  k: T,
  v?: Config[T]
): Config[T] | undefined {
  const configPath = PHIO_HOME('config.json')
  const config = (() => {
    try {
      return readJSONSync<Partial<Config>>(configPath)
    } catch (e) {
      return {}
    }
  })()
  try {
    if (v !== undefined) {
      config[k] = v
      writeJSONSync(configPath, config)
      return v
    }
    return config[k]
  } catch (e) {
    console.error(`${e}`)
  }
}
