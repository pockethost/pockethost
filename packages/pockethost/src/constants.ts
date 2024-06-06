import {
  InstanceFields,
  InstanceId,
  IoCManager,
  UserFields,
  mkSingleton,
} from '$public'
import {
  HandlerFactory,
  SettingsService,
  mkBoolean,
  mkCsvString,
  mkNumber,
  mkPath,
  mkString,
} from '$util'
import { forEach } from '@s-libs/micro-dash'
import devcert from 'devcert'
import envPaths from 'env-paths'
import { mkdirSync, realpathSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { LogEntry } from 'winston'

const __dirname = dirname(fileURLToPath(import.meta.url))

const realScriptPath = realpathSync(process.argv[1]!)

export const _PH_HOME = process.env.PH_HOME || envPaths(`pockethost`).data

export const _SSL_HOME = join(_PH_HOME, `ssl`)

export const _IS_DEV = process.env.NODE_ENV === 'development'
export const _PH_PROJECT_ROOT = join(__dirname, '..')
export const _APEX_DOMAIN = process.env.APEX_DOMAIN || 'pockethost.lvh.me'
export const _HTTP_PROTOCOL = process.env.HTTP_PROTOCOL || `https:`
export const _APP_NAME = process.env.APP_NAME || 'app'
export const _MOTHERSHIP_NAME =
  process.env.MOTHERSHIP_NAME || 'pockethost-central'

export const _MOTHERSHIP_APP_ROOT = (...paths: string[]) =>
  join(
    process.env.PH_MOTHERSHIP_APP_ROOT || join(__dirname, 'mothership-app'),
    ...paths,
  )

export const _INSTANCE_APP_ROOT = (...paths: string[]) =>
  join(
    process.env.PH_INSTANCE_APP_ROOT || join(__dirname, 'instance-app'),
    ...paths,
  )

const TLS_PFX = `tls`

if (_IS_DEV) {
  mkdirSync(_SSL_HOME, { recursive: true })
  const { key, cert } = await devcert.certificateFor(_APEX_DOMAIN, {})
  writeFileSync(join(_SSL_HOME, `${TLS_PFX}.key`), key)
  writeFileSync(join(_SSL_HOME, `${TLS_PFX}.cert`), cert)
}

export const SETTINGS = {
  PH_PLUGINS: mkCsvString([`@pockethost/plugin-console-logger`]),
  UPGRADE_MODE: mkBoolean(false),

  PH_HOME: mkPath(_PH_HOME),
  PH_PROJECT_ROOT: mkPath(_PH_PROJECT_ROOT),

  DEBUG: mkBoolean(_IS_DEV),

  HTTP_PROTOCOL: mkString(_HTTP_PROTOCOL),
  APP_NAME: mkString(_APP_NAME),
  APP_URL: mkString(`${_HTTP_PROTOCOL}//${_APP_NAME}.${_APEX_DOMAIN}`),
  BLOG_URL: mkString(`${_HTTP_PROTOCOL}//${_APEX_DOMAIN}`),
  APEX_DOMAIN: mkString(_APEX_DOMAIN),

  IPCIDR_LIST: mkCsvString([]),
  DAEMON_PORT: mkNumber(3000),
  DAEMON_PB_IDLE_TTL: mkNumber(1000 * 60 * 5), // 5 minutes

  MOTHERSHIP_URL: mkString(
    `${_HTTP_PROTOCOL}//${_MOTHERSHIP_NAME}.${_APEX_DOMAIN}`,
  ),
  MOTHERSHIP_NAME: mkString(_MOTHERSHIP_NAME),
  MOTHERSHIP_INTERNAL_HOST: mkString(`localhost`),
  MOTHERSHIP_ADMIN_USERNAME: mkString(),
  MOTHERSHIP_ADMIN_PASSWORD: mkString(),
  PH_MOTHERSHIP_APP_ROOT: mkString(_MOTHERSHIP_APP_ROOT()),
  MOTHERSHIP_MIGRATIONS_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`migrations`)),
  MOTHERSHIP_HOOKS_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`pb_hooks`, `src`)),
  MOTHERSHIP_APP_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`ph_app`), {
    required: false,
  }),
  MOTHERSHIP_SEMVER: mkString('*'),
  MOTHERSHIP_PORT: mkNumber(8091),

  INITIAL_PORT_POOL_SIZE: mkNumber(20),
  DATA_ROOT: mkPath(join(_PH_HOME, 'data')),
  NODE_ENV: mkString(`production`),
  IS_DEV: mkBoolean(_IS_DEV),
  TRACE: mkBoolean(false),

  PH_FTP_PORT: mkNumber(21),
  SSL_KEY: mkPath(join(_SSL_HOME, `${TLS_PFX}.key`)),
  SSL_CERT: mkPath(join(_SSL_HOME, `${TLS_PFX}.cert`)),
  PH_FTP_PASV_IP: mkString(`0.0.0.0`),
  PH_FTP_PASV_PORT_MIN: mkNumber(10000),
  PH_FTP_PASV_PORT_MAX: mkNumber(20000),

  EDGE_APEX_DOMAIN: mkString(_APEX_DOMAIN),
  EDGE_MAX_ACTIVE_INSTANCES: mkNumber(20),

  PH_INSTANCE_APP_ROOT: mkString(_INSTANCE_APP_ROOT()),
  INSTANCE_APP_HOOKS_DIR: mkPath(_INSTANCE_APP_ROOT(`pb_hooks`), {
    create: true,
  }),
  INSTANCE_APP_MIGRATIONS_DIR: mkPath(_INSTANCE_APP_ROOT(`migrations`), {
    create: true,
  }),

  DISCORD_POCKETSTREAM_URL: mkString(''),
  DISCORD_ALERT_CHANNEL_URL: mkString(''),

  TEST_EMAIL: mkString(),

  LS_WEBHOOK_SECRET: mkString(''),

  SYSLOGD_PORT: mkNumber(6514),

  DISCORD_HEALTH_CHANNEL_URL: mkString(''),

  DOCKER_CONTAINER_HOST: mkString(`host.docker.internal`),
}

export type Settings = ReturnType<typeof DefaultSettingsService>
export type SettingsDefinition = {
  [_ in keyof Settings]: HandlerFactory<Settings[_]>
}

export const DefaultSettingsService = mkSingleton(
  (settings: typeof SETTINGS) => {
    const _settings = SettingsService(settings)

    ioc.register('settings', _settings)

    if (ioc.service('settings').DEBUG) {
      logConstants()
    }

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

/** Accessors */
export const PH_PLUGINS = () => settings().PH_PLUGINS
export const UPGRADE_MODE = () => settings().UPGRADE_MODE

export const PH_HOME = () => settings().PH_HOME
export const PH_PROJECT_ROOT = () => settings().PH_PROJECT_ROOT

export const DEBUG = () => settings().DEBUG

export const HTTP_PROTOCOL = () => settings().HTTP_PROTOCOL
export const APP_URL = () => settings().APP_URL
export const APP_NAME = () => settings().APP_NAME
export const BLOG_URL = (...path: string[]) =>
  join(settings().BLOG_URL, ...path)
export const DOCS_URL = (...path: string[]) => BLOG_URL(`docs`, ...path)

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
export const MOTHERSHIP_MIGRATIONS_DIR = (...paths: string[]) =>
  join(settings().MOTHERSHIP_MIGRATIONS_DIR, ...paths)
export const MOTHERSHIP_HOOKS_DIR = (...paths: string[]) =>
  join(settings().MOTHERSHIP_HOOKS_DIR, ...paths)
export const MOTHERSHIP_APP_DIR = () => settings().MOTHERSHIP_APP_DIR
export const MOTHERSHIP_SEMVER = () => settings().MOTHERSHIP_SEMVER
export const MOTHERSHIP_PORT = () => settings().MOTHERSHIP_PORT

export const INITIAL_PORT_POOL_SIZE = () => settings().INITIAL_PORT_POOL_SIZE
export const DATA_ROOT = () => settings().DATA_ROOT
export const NODE_ENV = () => settings().NODE_ENV
export const IS_DEV = () => settings().IS_DEV
export const TRACE = () => settings().TRACE

export const PH_FTP_PORT = () => settings().PH_FTP_PORT
export const SSL_KEY = () => settings().SSL_KEY
export const SSL_CERT = () => settings().SSL_CERT
export const PH_FTP_PASV_IP = () => settings().PH_FTP_PASV_IP
export const PH_FTP_PASV_PORT_MIN = () => settings().PH_FTP_PASV_PORT_MIN
export const PH_FTP_PASV_PORT_MAX = () => settings().PH_FTP_PASV_PORT_MAX

export const EDGE_APEX_DOMAIN = () => settings().EDGE_APEX_DOMAIN
export const EDGE_MAX_ACTIVE_INSTANCES = () =>
  settings().EDGE_MAX_ACTIVE_INSTANCES

export const INSTANCE_APP_HOOK_DIR = () => settings().INSTANCE_APP_HOOKS_DIR
export const INSTANCE_APP_MIGRATIONS_DIR = () =>
  settings().INSTANCE_APP_MIGRATIONS_DIR

export const DISCORD_POCKETSTREAM_URL = () =>
  settings().DISCORD_POCKETSTREAM_URL

export const DISCORD_ALERT_CHANNEL_URL = () =>
  settings().DISCORD_ALERT_CHANNEL_URL

export const TEST_EMAIL = () => settings().TEST_EMAIL

export const LS_WEBHOOK_SECRET = () => settings().LS_WEBHOOK_SECRET

export const SYSLOGD_PORT = () => settings().SYSLOGD_PORT

export const DISCORD_HEALTH_CHANNEL_URL = () =>
  settings().DISCORD_HEALTH_CHANNEL_URL

export const DOCKER_CONTAINER_HOST = () => settings().DOCKER_CONTAINER_HOST

/** Helpers */

export const MOTHERSHIP_DATA_ROOT = (...paths: string[]) =>
  join(INSTANCE_DATA_ROOT(MOTHERSHIP_NAME()), ...paths)
export const MOTHERSHIP_DATA_DB = () =>
  join(MOTHERSHIP_DATA_ROOT(), `pb_data`, `data.db`)
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
