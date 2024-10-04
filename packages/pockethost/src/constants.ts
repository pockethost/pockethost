import { forEach } from '@s-libs/micro-dash'
import devcert from 'devcert'
import dotenv from 'dotenv'
import envPaths from 'env-paths'
import { default as env } from 'env-var'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  InstanceFields,
  InstanceId,
  SettingsHandlerFactory,
  SettingsService,
  ioc,
} from '../core'
import {
  mkBoolean,
  mkCsvString,
  mkNumber,
  mkPath,
  mkString,
} from './core/Settings'
import { settings } from './core/ioc'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const PH_PROJECT_ROOT = (...paths: string[]) =>
  join(__dirname, '..', '..', '..', ...paths)

dotenv.config({ path: [`.env`, PH_PROJECT_ROOT('.env')] })

export const _PH_HOME = env
  .get('PH_HOME')
  .default(envPaths(`pockethost`).data)
  .asString()

export const _SSL_HOME = join(_PH_HOME, `ssl`)

export const _IS_DEV = process.env.NODE_ENV === 'development'
export const _APEX_DOMAIN = env
  .get('APEX_DOMAIN')
  .default('pockethost.lvh.me')
  .asString()
export const _HTTP_PROTOCOL = env
  .get('HTTP_PROTOCOL')
  .default('https:')
  .asString()
export const _APP_NAME = env.get('APP_NAME').default('app').asString()
export const _MOTHERSHIP_NAME = env
  .get('MOTHERSHIP_NAME')
  .default('pockethost-central')
  .asString()

export const _MOTHERSHIP_APP_ROOT = (...paths: string[]) =>
  join(
    env
      .get('PH_MOTHERSHIP_APP_ROOT')
      .default(join(__dirname, 'mothership-app'))
      .asString(),
    ...paths,
  )

export const _INSTANCE_APP_ROOT = (...paths: string[]) =>
  join(
    env
      .get('PH_INSTANCE_APP_ROOT')
      .default(join(__dirname, 'instance-app'))
      .asString(),
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
  PH_HOME: mkPath(_PH_HOME, { create: true }),
  PH_PROJECT_ROOT: mkPath(PH_PROJECT_ROOT()),

  HTTP_PROTOCOL: mkString(_HTTP_PROTOCOL),
  APP_NAME: mkString(_APP_NAME),
  APP_URL: mkString(`${_HTTP_PROTOCOL}//${_APP_NAME}.${_APEX_DOMAIN}`),
  BLOG_URL: mkString(`${_HTTP_PROTOCOL}//${_APEX_DOMAIN}`),
  APEX_DOMAIN: mkString(_APEX_DOMAIN),

  IPCIDR_LIST: mkCsvString([]),
  DAEMON_PORT: mkNumber(3000),
  DAEMON_PB_IDLE_TTL: mkNumber(1000 * 60 * 5), // 5 minutes

  MOTHERSHIP_NAME: mkString(_MOTHERSHIP_NAME),
  MOTHERSHIP_ADMIN_USERNAME: mkString(),
  MOTHERSHIP_ADMIN_PASSWORD: mkString(),
  PH_MOTHERSHIP_APP_ROOT: mkString(_MOTHERSHIP_APP_ROOT()),
  MOTHERSHIP_MIGRATIONS_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`migrations`)),
  MOTHERSHIP_HOOKS_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`pb_hooks`, `src`)),
  MOTHERSHIP_APP_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`ph_app`), {
    required: false,
  }),
  MOTHERSHIP_SEMVER: mkString('*'),

  INITIAL_PORT_POOL_SIZE: mkNumber(20),
  DATA_ROOT: mkPath(join(_PH_HOME, 'data'), { create: true }),
  NODE_ENV: mkString(`production`),
  IS_DEV: mkBoolean(_IS_DEV),
  TRACE: mkBoolean(false),

  PH_FTP_PORT: mkNumber(21),
  SSL_KEY: mkPath(join(_SSL_HOME, `${TLS_PFX}.key`)),
  SSL_CERT: mkPath(join(_SSL_HOME, `${TLS_PFX}.cert`)),
  PH_FTP_PASV_IP: mkString(`0.0.0.0`),
  PH_FTP_PASV_PORT_MIN: mkNumber(10000),
  PH_FTP_PASV_PORT_MAX: mkNumber(20000),

  EDGE_SASS_DOMAINS_AUTH_TOKEN: mkString(``),
  EDGE_APEX_DOMAIN: mkString(_APEX_DOMAIN),

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

  PH_GOBOT_ROOT: mkPath(join(_PH_HOME, 'gobot'), { create: true }),
}

export type Settings = ReturnType<typeof RegisterEnvSettingsService>
export type SettingsDefinition = {
  [_ in keyof Settings]: SettingsHandlerFactory<Settings[_]>
}

export const RegisterEnvSettingsService = () => {
  const _settings = SettingsService(SETTINGS)

  ioc('settings', _settings)

  if (DEBUG()) {
    logConstants()
  }

  return _settings
}

/** Accessors */
export const PH_HOME = (...paths: string[]) =>
  join(settings().PH_HOME, ...paths)

export const DEBUG = () =>
  env.get(`PH_DEBUG`).default(_IS_DEV.toString()).asBool()

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

export const MOTHERSHIP_URL = (...path: string[]) =>
  join(
    env
      .get('MOTHERSHIP_URL')
      .default(`${HTTP_PROTOCOL()}://${MOTHERSHIP_NAME()}:${APEX_DOMAIN()}`)
      .asString(),
    ...path,
  )

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
export const MOTHERSHIP_PORT = () =>
  env.get('MOTHERSHIP_PORT').default(8090).asPortNumber()

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

export const EDGE_SASS_DOMAINS_AUTH_TOKEN = () =>
  settings().EDGE_SASS_DOMAINS_AUTH_TOKEN
export const EDGE_APEX_DOMAIN = () => settings().EDGE_APEX_DOMAIN

export const INSTANCE_APP_HOOK_DIR = () => settings().INSTANCE_APP_HOOKS_DIR
export const INSTANCE_APP_MIGRATIONS_DIR = () =>
  settings().INSTANCE_APP_MIGRATIONS_DIR

export const DISCORD_POCKETSTREAM_URL = () =>
  env.get('DISCORD_POCKETSTREAM_URL').asString()
export const DISCORD_HEALTH_CHANNEL_URL = () =>
  env.get('DISCORD_HEALTH_CHANNEL_URL').asString()
export const DISCORD_ALERT_CHANNEL_URL = () =>
  env.get('DISCORD_ALERT_CHANNEL_URL').asString()

export const TEST_EMAIL = () => settings().TEST_EMAIL

export const LS_WEBHOOK_SECRET = () => settings().LS_WEBHOOK_SECRET

export const SYSLOGD_PORT = () => settings().SYSLOGD_PORT

export const DOCKER_CONTAINER_HOST = () => settings().DOCKER_CONTAINER_HOST

export const PH_GOBOT_ROOT = (...paths: string[]) =>
  join(settings().PH_GOBOT_ROOT, ...paths)

export const PH_MOTHERSHIP_MIRROR_PORT = () =>
  env.get('PH_EDGE_MIRROR_PORT').default(3001).asPortNumber()

export const PH_GOBOT_VERBOSITY = () =>
  env.get(`PH_GOBOT_VERBOSITY`).default(1).asIntPositive()

/** Helpers */

export const MOTHERSHIP_DATA_ROOT = (...paths: string[]) =>
  join(INSTANCE_DATA_ROOT(MOTHERSHIP_NAME()), ...paths)
export const MOTHERSHIP_DATA_DB = () =>
  join(MOTHERSHIP_DATA_ROOT(), `pb_data`, `data.db`)
export const INSTANCE_DATA_ROOT = (id: InstanceId) => join(DATA_ROOT(), id)
export const INSTANCE_DATA_DB = (id: InstanceId) =>
  join(DATA_ROOT(), id, `pb_data`, `data.db`)
export const mkContainerHomePath = (...path: string[]) =>
  join(`/home/pockethost`, ...path.filter((v) => !!v))
export const mkAppUrl = (path = '') => `${APP_URL()}${path}`
export const mkBlogUrl = (path = '') => `${BLOG_URL()}${path}`
export const mkDocUrl = (path = '') => mkBlogUrl(join('/docs', path))
export const mkInstanceCanonicalHostname = (instance: InstanceFields) =>
  (instance.cname_active && instance.cname) || `${instance.id}.${APEX_DOMAIN()}`
export const mkInstanceHostname = (instance: InstanceFields) =>
  `${instance.subdomain}.${APEX_DOMAIN()}`
export const mkInstanceUrl = (instance: InstanceFields, ...paths: string[]) =>
  [
    `${HTTP_PROTOCOL()}//${mkInstanceHostname(instance)}`,
    paths.length ? join(...paths) : '',
  ].join('')
export const mkInstanceDataPath = (instanceId: string, ...path: string[]) =>
  join(settings().DATA_ROOT, instanceId, ...path)

export const logConstants = () => {
  const vars = {
    DEBUG,
    PH_HOME,
    PH_PROJECT_ROOT,
    HTTP_PROTOCOL,
    APP_URL,
    APP_NAME,
    BLOG_URL,
    DOCS_URL,
    APEX_DOMAIN,
    IPCIDR_LIST,
    DAEMON_PORT,
    DAEMON_PB_IDLE_TTL,
    MOTHERSHIP_URL,
    MOTHERSHIP_NAME,
    MOTHERSHIP_ADMIN_USERNAME,
    MOTHERSHIP_ADMIN_PASSWORD,
    MOTHERSHIP_MIGRATIONS_DIR,
    MOTHERSHIP_HOOKS_DIR,
    MOTHERSHIP_APP_DIR,
    MOTHERSHIP_SEMVER,
    INITIAL_PORT_POOL_SIZE,
    DATA_ROOT,
    NODE_ENV,
    IS_DEV,
    TRACE,
    PH_FTP_PORT,
    SSL_KEY,
    SSL_CERT,
    PH_FTP_PASV_IP,
    PH_FTP_PASV_PORT_MIN,
    PH_FTP_PASV_PORT_MAX,
    EDGE_SASS_DOMAINS_AUTH_TOKEN,
    EDGE_APEX_DOMAIN,
    INSTANCE_APP_HOOK_DIR,
    INSTANCE_APP_MIGRATIONS_DIR,
    DISCORD_POCKETSTREAM_URL,
    DISCORD_ALERT_CHANNEL_URL,
    TEST_EMAIL,
    LS_WEBHOOK_SECRET,
    SYSLOGD_PORT,
    DISCORD_HEALTH_CHANNEL_URL,
    DOCKER_CONTAINER_HOST,
    PH_GOBOT_ROOT,
    MOTHERSHIP_DATA_ROOT,
    MOTHERSHIP_DATA_DB,
    PH_EDGE_MIRROR_PORT: PH_MOTHERSHIP_MIRROR_PORT,
    PH_GOBOT_VERBOSITY,
  }
  forEach(vars, (v, k) => {
    console.log(`${k}: ${v()}`)
  })
}
