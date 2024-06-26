import { config } from 'dotenv'
import envPaths from 'env-paths'
import { dirname, join } from 'path'
import { cwd } from 'process'
import { fileURLToPath } from 'url'
import { mkBoolean, mkCsvString, mkNumber, mkPath, mkString } from '../core'
import { InstanceFields, InstanceId } from './common'
import { DEBUG, IS_DEV } from './common/debug'
import { Settings } from './core/Settings'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const _PH_HOME = process.env.PH_HOME || envPaths(`pockethost`).data

config({ path: [join(_PH_HOME, '.env'), join(cwd(), `.env`)] })

export const _PH_PROJECT_DIR = join(__dirname, '..')
export const _APEX_DOMAIN = process.env.APEX_DOMAIN || 'pockethost.lvh.me'

export const settings = Settings({
  PH_PLUGINS: mkCsvString([
    `@pockethost/plugin-console-logger`,
    `@pockethost/plugin-launcher-spawn`,
    `@pockethost/plugin-auto-admin`,
  ]),

  PH_HOME: mkPath(_PH_HOME),
  PH_PROJECT_DIR: mkPath(_PH_PROJECT_DIR),

  PH_INTERNAL_HOST: mkString('localhost'),
  PH_APEX_DOMAIN: mkString(_APEX_DOMAIN),

  PH_PORT: mkNumber(3000),

  PH_DATA_DIR: mkPath(join(_PH_HOME, 'data'), { create: true }),
  PH_DEV: mkBoolean(IS_DEV()),
  PH_DEBUG: mkBoolean(DEBUG()),
  PH_INTERNAL_APP_SECRET: mkString(''),
})

/** Accessors */
export const PH_PLUGINS = () => settings.PH_PLUGINS

export const PH_HOME = (...paths: string[]) => join(settings.PH_HOME, ...paths)
export const PH_PROJECT_DIR = (...paths: string[]) =>
  join(settings.PH_PROJECT_DIR, ...paths)

export const APEX_DOMAIN = () => settings.PH_APEX_DOMAIN

export const PORT = () => settings.PH_PORT

export const DATA_DIR = (...paths: string[]) =>
  join(settings.PH_DATA_DIR, ...paths)
export const NODE_ENV = () => process.env.NODE_ENV
export const INSTANCE_DATA_DIR = (id: InstanceId, ...paths: string[]) =>
  join(DATA_DIR(), id, ...paths)
export const INTERNAL_HOST = () => settings.PH_INTERNAL_HOST
export const INTERNAL_APP_SECRET = () => settings.PH_INTERNAL_APP_SECRET
export const INTERNAL_APP_URL = (...paths: string[]) =>
  `${HTTP_PROTOCOL()}//${INTERNAL_HOST()}:${PORT()}/${INTERNAL_APP_PREFIX}/${join(
    ...paths,
  )}`
export const INTERNAL_APP_PREFIX = `_internal`
export const INTERNAL_APP_AUTH_HEADER = `x-pockethost-authorization`
export const HTTP_PROTOCOL = () => (PORT() === 443 ? 'https:' : 'http:')
export const PUBLIC_INSTANCE_URL = ({ subdomain }: Partial<InstanceFields>) => {
  const url = new URL(`${HTTP_PROTOCOL()}//${subdomain}.${APEX_DOMAIN()}`)
  url.port = `${PORT() === 80 || PORT() == 443 ? '' : PORT()}`
  return url
}
