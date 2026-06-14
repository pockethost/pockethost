import envPaths from 'env-paths'
import env from 'env-var'
import fse from 'fs-extra'
import { join } from 'path'

const { ensureDirSync } = fse

export const PHIO_HOME = (...paths: string[]) =>
  join(
    env.get('PHIO_HOME').default(envPaths(`phio`).config).asString(),
    ...paths
  )
ensureDirSync(PHIO_HOME())

export const PHIO_MOTHERSHIP_URL = (...paths: string[]) => {
  const url = new URL(
    env
      .get(`PHIO_MOTHERSHIP_URL`)
      .default(`https://pockethost-central.pockethost.io`)
      .asString()
  )
  url.pathname = join(url.pathname, ...paths)
  return url.toString()
}

export const PHIO_USERNAME = () => env.get('PHIO_USERNAME').asString() || ''
export const PHIO_PASSWORD = () => env.get('PHIO_PASSWORD').asString() || ''
export const PHIO_INSTANCE_NAME = () =>
  env.get('PHIO_INSTANCE_NAME').asString() || ''
