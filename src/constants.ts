import {
  InstanceFields,
  InstanceId,
  IoCManager,
  mkSingleton,
  UserFields,
} from '$shared'
import {
  HandlerFactory,
  mkBoolean,
  mkCsvString,
  mkNumber,
  mkPath,
  mkString,
  SettingsService,
} from '$src/util/Settings'
import { forEach } from '@s-libs/micro-dash'
import dotenv from 'dotenv'
import { findUpSync } from 'find-up'
import { dirname, join, resolve } from 'path'
import { LogEntry } from 'winston'

const loadedEnvs = dotenv.config({ path: `.env` })

export const _PH_HOME = join(process.env.HOME || resolve(`~`), `.pockethost`)
export const _PH_PROJECT_ROOT = dirname(findUpSync('package.json')!)
export const _PH_BUILD_ROOT = join(_PH_PROJECT_ROOT, 'dist')
export const _IS_DEV = process.env.NODE_ENV === 'development'

console.log({ _PH_HOME, _PH_PROJECT_ROOT, _PH_BUILD_ROOT })

export const SETTINGS = {
  UPGRADE_MODE: mkBoolean(false),

  PH_HOME: mkPath(_PH_HOME),
  PH_PROJECT_ROOT: mkPath(_PH_PROJECT_ROOT),
  PH_BUILD_ROOT: mkPath(_PH_BUILD_ROOT, { required: false }),

  DEBUG: mkBoolean(_IS_DEV),

  HTTP_PROTOCOL: mkString('https:'),
  APP_URL: mkString(`https://app.pockethost.io`),
  BLOG_URL: mkString(`https://pockethost.io`),
  APEX_DOMAIN: mkString(`pockethost.io`),

  IPCIDR_LIST: mkCsvString([`127.0.0.1/32`]),
  DAEMON_PORT: mkNumber(3000),
  DAEMON_PB_IDLE_TTL: mkNumber(1000 * 60 * 5), // 5 minutes

  MOTHERSHIP_URL: mkString(`https://pockethost-central.pockethost.io`),
  MOTHERSHIP_NAME: mkString(`pockethost-central`),
  MOTHERSHIP_INTERNAL_HOST: mkString(`localhost`),
  MOTHERSHIP_ADMIN_USERNAME: mkString(),
  MOTHERSHIP_ADMIN_PASSWORD: mkString(),
  MOTHERSHIP_MIGRATIONS_DIR: mkPath(
    join(_PH_PROJECT_ROOT, 'src', 'mothership-app', 'migrations'),
  ),
  MOTHERSHIP_HOOKS_DIR: mkPath(
    join(_PH_PROJECT_ROOT, 'src', 'mothership-app', `pb_hooks`, `src`),
  ),
  MOTHERSHIP_APP_DIR: mkPath(
    join(_PH_PROJECT_ROOT, 'src', 'mothership-app', `ph_app`),
    {
      required: false,
    },
  ),
  MOTHERSHIP_SEMVER: mkString(''),
  MOTHERSHIP_PORT: mkNumber(8091),

  INITIAL_PORT_POOL_SIZE: mkNumber(20),
  DATA_ROOT: mkPath(join(_PH_HOME, 'data')),
  NODE_ENV: mkString(`production`),
  IS_DEV: mkBoolean(_IS_DEV),
  TRACE: mkBoolean(false),
  PH_BIN_CACHE: mkPath(join(_PH_HOME, '.pbincache')),

  PH_FTP_PORT: mkNumber(21),
  SSL_KEY: mkPath(join(_PH_HOME, `pockethost.key`)),
  SSL_CERT: mkPath(join(_PH_HOME, `pockethost.crt`)),
  PH_FTP_PASV_IP: mkString(`0.0.0.0`),
  PH_FTP_PASV_PORT_MIN: mkNumber(10000),
  PH_FTP_PASV_PORT_MAX: mkNumber(20000),

  EDGE_APEX_DOMAIN: mkString(`pockethost.lvh.me`),
  EDGE_MAX_ACTIVE_INSTANCES: mkNumber(20),
  EDGE_SECRET_KEY: mkString(),

  INSTANCE_APP_HOOKS_DIR: mkPath(
    join(_PH_BUILD_ROOT, `instance-app`, `pb_hooks`),
    { create: true },
  ),
  INSTANCE_APP_MIGRATIONS_DIR: mkPath(
    join(_PH_BUILD_ROOT, `instance-app`, `migrations`),
    { create: true },
  ),

  DISCORD_POCKETSTREAM_URL: mkString(''),
}
;(() => {
  let passed = true
  forEach(loadedEnvs.parsed, (v, k) => {
    if (!(k in SETTINGS)) {
      passed = false
      console.error(`.env key ${k} is not a known setting.`)
    }
  })
  if (!passed) {
    // throw new Error(`Exiting due to .env errors`)
  }
})()

export type Settings = ReturnType<typeof DefaultSettingsService>
export type SettingsDefinition = {
  [_ in keyof Settings]: HandlerFactory<Settings[_]>
}

export const DefaultSettingsService = mkSingleton(
  (settings: typeof SETTINGS) => {
    const _settings = SettingsService(settings)

    ioc.register('settings', _settings)

      logConstants()

    return _settings
  },
)

export type MothershipProvider = {
  getAllInstances(): Promise<InstanceFields[]>
  getInstanceById(id: InstanceId): Promise<[InstanceFields, UserFields] | []>
  getInstanceBySubdomain(
    subdomain: InstanceFields['subdomain'],
  ): Promise<[InstanceFields, UserFields] | []>
  updateInstance(id: InstanceId, fields: Partial<InstanceFields>): Promise<void>
}

type UnsubFunc = () => void

export type InstanceLogProvider = (
  instanceId: InstanceId,
  target: string,
) => {
  info(msg: string): void
  error(msg: string): void
  tail(linesBack: number, data: (line: LogEntry) => void): UnsubFunc
}

export const ioc = new IoCManager<{
  settings: Settings
  mothership: MothershipProvider
  instanceLogger: InstanceLogProvider
}>()

export const settings = () => ioc.service('settings')
export const mothership = () => ioc.service('mothership')
export const instanceLogger = () => ioc.service('instanceLogger')

/**
 * Accessors
 */
export const UPGRADE_MODE = () => settings().UPGRADE_MODE

export const PH_HOME = () => settings().PH_HOME
export const PH_PROJECT_ROOT = () => settings().PH_PROJECT_ROOT
export const PH_BUILD_ROOT = () => settings().PH_BUILD_ROOT

export const DEBUG = () => settings().DEBUG

export const HTTP_PROTOCOL = () => settings().HTTP_PROTOCOL
export const APP_URL = () => settings().APP_URL
export const BLOG_URL = () => settings().BLOG_URL
export const APEX_DOMAIN = () => settings().APEX_DOMAIN

export const IPCIDR_LIST = () => settings().IPCIDR_LIST
export const DAEMON_PORT = () => settings().DAEMON_PORT
export const DAEMON_PB_IDLE_TTL = () => settings().DAEMON_PB_IDLE_TTL

export const MOTHERSHIP_URL = () => settings().MOTHERSHIP_URL
export const MOTHERSHIP_INTERNAL_HOST = () =>
  settings().MOTHERSHIP_INTERNAL_HOST
export const MOTHERSHIP_NAME = () => settings().MOTHERSHIP_NAME
export const MOTHERSHIP_ADMIN_USERNAME = () =>
  settings().MOTHERSHIP_ADMIN_USERNAME
export const MOTHERSHIP_ADMIN_PASSWORD = () =>
  settings().MOTHERSHIP_ADMIN_PASSWORD
export const MOTHERSHIP_MIGRATIONS_DIR = () =>
  settings().MOTHERSHIP_MIGRATIONS_DIR
export const MOTHERSHIP_HOOKS_DIR = () => settings().MOTHERSHIP_HOOKS_DIR
export const MOTHERSHIP_APP_DIR = () => settings().MOTHERSHIP_APP_DIR
export const MOTHERSHIP_SEMVER = () => settings().MOTHERSHIP_SEMVER
export const MOTHERSHIP_PORT = () => settings().MOTHERSHIP_PORT

export const INITIAL_PORT_POOL_SIZE = () => settings().INITIAL_PORT_POOL_SIZE
export const DATA_ROOT = () => settings().DATA_ROOT
export const NODE_ENV = () => settings().NODE_ENV
export const IS_DEV = () => settings().IS_DEV
export const TRACE = () => settings().TRACE
export const PH_BIN_CACHE = () => settings().PH_BIN_CACHE

export const PH_FTP_PORT = () => settings().PH_FTP_PORT
export const SSL_KEY = () => settings().SSL_KEY
export const SSL_CERT = () => settings().SSL_CERT
export const PH_FTP_PASV_IP = () => settings().PH_FTP_PASV_IP
export const PH_FTP_PASV_PORT_MIN = () => settings().PH_FTP_PASV_PORT_MIN
export const PH_FTP_PASV_PORT_MAX = () => settings().PH_FTP_PASV_PORT_MAX

export const EDGE_APEX_DOMAIN = () => settings().EDGE_APEX_DOMAIN
export const EDGE_MAX_ACTIVE_INSTANCES = () =>
  settings().EDGE_MAX_ACTIVE_INSTANCES
export const EDGE_SECRET_KEY = () => settings().EDGE_SECRET_KEY

export const INSTANCE_APP_HOOK_DIR = () => settings().INSTANCE_APP_HOOKS_DIR
export const INSTANCE_APP_MIGRATIONS_DIR = () =>
  settings().INSTANCE_APP_MIGRATIONS_DIR

export const DISCORD_POCKETSTREAM_URL = () =>
  settings().DISCORD_POCKETSTREAM_URL

/**
 * Helpers
 */
export const MOTHERSHIP_DATA_ROOT = () => INSTANCE_DATA_ROOT(MOTHERSHIP_NAME())
export const MOTHERSHIP_INTERNAL_URL = (path = '') =>
  `http://${MOTHERSHIP_INTERNAL_HOST()}:${MOTHERSHIP_PORT()}${path}`
export const INSTANCE_DATA_ROOT = (id: InstanceId) => join(DATA_ROOT(), id)
export const INSTANCE_DATA_DB = (id: InstanceId) =>
  join(DATA_ROOT(), id, `pb_data`, `data.db`)
export const mkContainerHomePath = (...path: string[]) =>
  join(`/home/pockethost`, ...path.filter((v) => !!v))
export const mkAppUrl = (path = '') => `${APP_URL()}${path}`
export const mkBlogUrl = (path = '') => `${BLOG_URL()}${path}`
export const mkDocUrl = (path = '') => mkBlogUrl(join('/docs', path))
export const mkEdgeSubdomain = (subdomain: string) =>
  `${settings().HTTP_PROTOCOL}//${subdomain}.${settings().EDGE_APEX_DOMAIN}`
export const mkEdgeUrl = (subdomain: string, path = '') =>
  `${mkEdgeSubdomain(subdomain)}${path}`
export const mkInstanceDataPath = (instanceId: string, ...path: string[]) =>
  join(settings().DATA_ROOT, instanceId, ...path)

export const logConstants = () => {
  forEach(settings(), (v, k) => {
    console.log(`${k}: ${v}`)
  })
}
