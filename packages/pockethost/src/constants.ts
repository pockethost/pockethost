import envPaths from 'env-paths'
import { default as env } from 'env-var'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  InstanceFields,
  SettingsHandlerFactory,
  SettingsService,
  ioc,
  mkBoolean,
  mkCsvString,
  mkNumber,
  mkPath,
  mkString,
  settings,
} from '.'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const PH_PROJECT_ROOT = (...paths: string[]) => join(__dirname, '..', '..', '..', ...paths)

for (const envPath of ['.env', PH_PROJECT_ROOT('.env')]) {
  if (existsSync(envPath)) process.loadEnvFile(envPath)
}

export const _PH_HOME = env.get('PH_HOME').default(envPaths(`pockethost`).data).asString()

export const _DATA_ROOT = env.get('DATA_ROOT').default(join(_PH_HOME, `data`)).asString()

export const _SSL_HOME = join(_PH_HOME, `ssl`)

export const _IS_DEV = process.env.NODE_ENV === 'development'
export const _PH_ENABLE_INSTANCE_WEBHOOKS = env.get('PH_ENABLE_INSTANCE_WEBHOOKS').asBool()
export const _PH_DISABLE_INSTANCE_WEBHOOKS = _PH_ENABLE_INSTANCE_WEBHOOKS
  ? false
  : env.get('PH_DISABLE_INSTANCE_WEBHOOKS')
      .default(_IS_DEV ? 'true' : 'false')
      .asBool()
export const _PH_ENABLE_FIREWALL_RATE_LIMIT = env.get('PH_ENABLE_FIREWALL_RATE_LIMIT').asBool()
export const _PH_DISABLE_FIREWALL_RATE_LIMIT = _PH_ENABLE_FIREWALL_RATE_LIMIT
  ? false
  : env.get('PH_DISABLE_FIREWALL_RATE_LIMIT')
      .default(_IS_DEV ? 'true' : 'false')
      .asBool()
export const _DEBUG = env.get(`PH_DEBUG`).default(_IS_DEV.toString()).asBool()
export const _APEX_DOMAIN = env.get('APEX_DOMAIN').default('pockethost.lvh.me').asString()
export const _HTTP_PROTOCOL = env.get('HTTP_PROTOCOL').default(_IS_DEV ? 'http:' : 'https:').asString()
export const _MOTHERSHIP_NAME = env.get('MOTHERSHIP_NAME').default('pockethost-central').asString()

export const _MOTHERSHIP_APP_ROOT = (...paths: string[]) =>
  join(env.get('PH_MOTHERSHIP_APP_ROOT').default(join(__dirname, 'mothership-app')).asString(), ...paths)

export const _INSTANCE_APP_ROOT = (...paths: string[]) =>
  join(env.get('PH_INSTANCE_APP_ROOT').default(join(__dirname, 'instance-app')).asString(), ...paths)

const TLS_PFX = `tls`

export const createSettings = () => ({
  DEBUG: mkBoolean(_DEBUG),
  PH_ALLOWED_POCKETBASE_SEMVER: mkString(`<1.0.0`),

  PH_HOME: mkPath(_PH_HOME, { create: true }),
  PH_PROJECT_ROOT: mkPath(PH_PROJECT_ROOT()),

  HTTP_PROTOCOL: mkString(_HTTP_PROTOCOL),
  APP_URL: mkString(`${_HTTP_PROTOCOL}//${_APEX_DOMAIN}`),
  APEX_DOMAIN: mkString(_APEX_DOMAIN),

  IPCIDR_LIST: mkCsvString([]),
  PH_USER_PROXY_IPS: mkCsvString([]),
  DAEMON_PORT: mkNumber(3000),
  DAEMON_PB_IDLE_TTL: mkNumber(1000 * 5), // 5 seconds
  PH_CONTAINER_LAUNCH_WARN_MS: mkNumber(200),
  PH_CONTAINER_STOP_TIMEOUT_SEC: mkNumber(5),
  PH_MAX_CONCURRENT_DOCKER_LAUNCHES: mkNumber(5),

  MOTHERSHIP_NAME: mkString(_MOTHERSHIP_NAME),
  MOTHERSHIP_ADMIN_USERNAME: mkString(),
  MOTHERSHIP_ADMIN_PASSWORD: mkString(),
  PH_MOTHERSHIP_APP_ROOT: mkString(_MOTHERSHIP_APP_ROOT()),
  MOTHERSHIP_MIGRATIONS_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`pb_migrations`)),
  MOTHERSHIP_HOOKS_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`pb_hooks`)),
  MOTHERSHIP_APP_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`ph_app`), {
    required: false,
  }),
  MOTHERSHIP_SEMVER: mkString('0.22.*'),

  INITIAL_PORT_POOL_SIZE: mkNumber(20),
  DATA_ROOT: mkPath(_DATA_ROOT, { create: true }),
  NODE_ENV: mkString(`production`),
  IS_DEV: mkBoolean(_IS_DEV),
  PH_DISABLE_INSTANCE_WEBHOOKS: mkBoolean(_PH_DISABLE_INSTANCE_WEBHOOKS),
  PH_DISABLE_FIREWALL_RATE_LIMIT: mkBoolean(_PH_DISABLE_FIREWALL_RATE_LIMIT),
  TRACE: mkBoolean(false),

  PH_FTP_PORT: mkNumber(21),
  SSL_KEY: mkPath(join(_SSL_HOME, `${TLS_PFX}.key`)),
  SSL_CERT: mkPath(join(_SSL_HOME, `${TLS_PFX}.cert`)),
  PH_FTP_PASV_IP: mkString(`0.0.0.0`),
  PH_FTP_PASV_PORT_MIN: mkNumber(10000),
  PH_FTP_PASV_PORT_MAX: mkNumber(20000),

  PH_SFTP_PORT: mkNumber(2222),
  PH_SFTP_HOST_KEY: mkPath(join(_PH_HOME, 'ssh', 'host_key'), { required: false }),

  EDGE_APEX_DOMAIN: mkString(_APEX_DOMAIN),

  INSTANCE_APP_ROOT: mkString(_INSTANCE_APP_ROOT()),

  DISCORD_HEALTH_CHANNEL_URL: mkString(''),
  DISCORD_ALERT_CHANNEL_URL: mkString(''),
  DISCORD_TEST_CHANNEL_URL: mkString(''),
  DISCORD_STREAM_CHANNEL_URL: mkString(''),

  MOTHERSHIP_CLOUDFLARE_API_TOKEN: mkString('', { required: true }),
  MOTHERSHIP_CLOUDFLARE_ZONE_ID: mkString('', { required: true }),
  MOTHERSHIP_CLOUDFLARE_ACCOUNT_ID: mkString('', { required: true }),

  TEST_EMAIL: mkString(),

  LS_WEBHOOK_SECRET: mkString(''),

  SYSLOGD_PORT: mkNumber(6514),

  DOCKER_CONTAINER_HOST: mkString(`host.docker.internal`),
  DOCKER_INSTANCE_IMAGE_NAME: mkString(`benallfree/pockethost-instance`),

  PH_POCKETBASE_ROOT: mkPath(join(_PH_HOME, 'pocketbase'), { create: true }),
})

export type Settings = ReturnType<typeof RegisterEnvSettingsService>
export type SettingsDefinition = {
  [_ in keyof Settings]: SettingsHandlerFactory<Settings[_]>
}

export const RegisterEnvSettingsService = () => {
  const _settings = SettingsService(createSettings())

  ioc('settings', _settings)

  if (DEBUG()) {
    logConstants()
  }

  return _settings
}

/** Accessors */

export const PH_ALLOWED_POCKETBASE_SEMVER = () => settings().PH_ALLOWED_POCKETBASE_SEMVER

export const PH_HOME = (...paths: string[]) => join(settings().PH_HOME, ...paths)

export const DEBUG = () => _DEBUG

export const HTTP_PROTOCOL = () => settings().HTTP_PROTOCOL
export const APP_URL = (...path: string[]) => [settings().APP_URL, path.join(`/`)].filter(Boolean).join('/')

export const APEX_DOMAIN = () => settings().APEX_DOMAIN

export const IPCIDR_LIST = () => settings().IPCIDR_LIST
export const PH_USER_PROXY_IPS = () => settings().PH_USER_PROXY_IPS
export const DAEMON_PORT = () => settings().DAEMON_PORT
export const DAEMON_PB_IDLE_TTL = () => settings().DAEMON_PB_IDLE_TTL
export const PH_CONTAINER_LAUNCH_WARN_MS = () => settings().PH_CONTAINER_LAUNCH_WARN_MS
export const PH_CONTAINER_STOP_TIMEOUT_SEC = () => settings().PH_CONTAINER_STOP_TIMEOUT_SEC
export const PH_MAX_CONCURRENT_DOCKER_LAUNCHES = () => settings().PH_MAX_CONCURRENT_DOCKER_LAUNCHES

export const MOTHERSHIP_URL = (...path: string[]) =>
  [
    env.get('MOTHERSHIP_URL').default(`${HTTP_PROTOCOL()}://${MOTHERSHIP_NAME()}.${APEX_DOMAIN()}`).asString(),
    ...path.map((p) => p.trim().replace(/^\/+|\/+$/g, '')),
  ]
    .filter(Boolean)
    .join('/')

export const MOTHERSHIP_NAME = () => settings().MOTHERSHIP_NAME
export const MOTHERSHIP_ADMIN_USERNAME = () => settings().MOTHERSHIP_ADMIN_USERNAME
export const MOTHERSHIP_ADMIN_PASSWORD = () => settings().MOTHERSHIP_ADMIN_PASSWORD
export const MOTHERSHIP_MIGRATIONS_DIR = (...paths: string[]) => join(settings().MOTHERSHIP_MIGRATIONS_DIR, ...paths)
export const MOTHERSHIP_HOOKS_DIR = (...paths: string[]) => join(settings().MOTHERSHIP_HOOKS_DIR, ...paths)
export const MOTHERSHIP_APP_DIR = () => settings().MOTHERSHIP_APP_DIR
export const MOTHERSHIP_SEMVER = () => settings().MOTHERSHIP_SEMVER
export const MOTHERSHIP_PORT = () => env.get('MOTHERSHIP_PORT').default(8090).asPortNumber()
export const MOTHERSHIP_CONTAINER_NAME = 'pockethost-mothership'

export const INITIAL_PORT_POOL_SIZE = () => settings().INITIAL_PORT_POOL_SIZE
export const DATA_ROOT = (...paths: string[]) => join(settings().DATA_ROOT, ...paths)
export const NODE_ENV = () => settings().NODE_ENV
export const IS_DEV = () => settings().IS_DEV
export const PH_DISABLE_INSTANCE_WEBHOOKS = () => settings().PH_DISABLE_INSTANCE_WEBHOOKS
export const PH_DISABLE_FIREWALL_RATE_LIMIT = () => settings().PH_DISABLE_FIREWALL_RATE_LIMIT
export const TRACE = () => settings().TRACE

export const PH_FTP_PORT = () => settings().PH_FTP_PORT
export const SSL_KEY = () => settings().SSL_KEY
export const SSL_CERT = () => settings().SSL_CERT
export const PH_FTP_PASV_IP = () => settings().PH_FTP_PASV_IP
export const PH_FTP_PASV_PORT_MIN = () => settings().PH_FTP_PASV_PORT_MIN
export const PH_FTP_PASV_PORT_MAX = () => settings().PH_FTP_PASV_PORT_MAX

export const PH_SFTP_PORT = () => settings().PH_SFTP_PORT
export const PH_SFTP_HOST_KEY = () => settings().PH_SFTP_HOST_KEY

export const EDGE_APEX_DOMAIN = () => settings().EDGE_APEX_DOMAIN

export const INSTANCE_APP_ROOT = (version: string, ...paths: string[]) =>
  join(settings().INSTANCE_APP_ROOT, version, ...paths)
export const INSTANCE_APP_HOOK_DIR = (version: string, ...paths: string[]) =>
  INSTANCE_APP_ROOT(version, `pb_hooks`, ...paths)
export const INSTANCE_APP_MIGRATIONS_DIR = (version: string, ...paths: string[]) =>
  INSTANCE_APP_ROOT(version, `pb_migrations`, ...paths)

export const DISCORD_HEALTH_CHANNEL_URL = () => env.get('DISCORD_HEALTH_CHANNEL_URL').asString()
export const DISCORD_ALERT_CHANNEL_URL = () => env.get('DISCORD_ALERT_CHANNEL_URL').asString()
export const DISCORD_TEST_CHANNEL_URL = () => env.get('DISCORD_TEST_CHANNEL_URL').asString()
export const DISCORD_STREAM_CHANNEL_URL = () => env.get('DISCORD_STREAM_CHANNEL_URL').asString()

export const MOTHERSHIP_CLOUDFLARE_API_TOKEN = () => settings().MOTHERSHIP_CLOUDFLARE_API_TOKEN
export const MOTHERSHIP_CLOUDFLARE_ZONE_ID = () => settings().MOTHERSHIP_CLOUDFLARE_ZONE_ID
export const MOTHERSHIP_CLOUDFLARE_ACCOUNT_ID = () => settings().MOTHERSHIP_CLOUDFLARE_ACCOUNT_ID

export const TEST_EMAIL = () => settings().TEST_EMAIL

export const LS_WEBHOOK_SECRET = () => settings().LS_WEBHOOK_SECRET

export const SYSLOGD_PORT = () => settings().SYSLOGD_PORT

export const DOCKER_CONTAINER_HOST = () => settings().DOCKER_CONTAINER_HOST
export const DOCKER_INSTANCE_IMAGE_NAME = () => settings().DOCKER_INSTANCE_IMAGE_NAME

export const PH_POCKETBASE_ROOT = (...paths: string[]) => join(settings().PH_POCKETBASE_ROOT, ...paths)

export const PH_MOTHERSHIP_MIRROR_PORT = () => env.get('PH_EDGE_MIRROR_PORT').default(3001).asPortNumber()

/** Helpers */

export const MOTHERSHIP_DATA_ROOT = (...paths: string[]) => DATA_ROOT('mothership', ...paths)
export const INSTANCES_ROOT = (...paths: string[]) => DATA_ROOT('instances', ...paths)
export const MOTHERSHIP_DATA_DB = () => join(MOTHERSHIP_DATA_ROOT(), `pb_data`, `data.db`)
export const mkContainerHomePath = (...path: string[]) => join(`/home/pockethost`, ...path.filter((v) => !!v))
export const DOC_URL = (...path: string[]) => APP_URL('docs', ...path)
export const mkInstanceCanonicalHostname = (instance: InstanceFields) =>
  instance.cname && instance.cname.trim() !== '' ? instance.cname : `${instance.id}.${APEX_DOMAIN()}`
export const mkInstanceHostname = (instance: InstanceFields) =>
  [instance.subdomain, APEX_DOMAIN()].filter(Boolean).join('.')
export const mkInstanceUrl = (instance: InstanceFields, ...paths: string[]) =>
  [`${HTTP_PROTOCOL()}//${mkInstanceHostname(instance)}`, paths.join(`/`)].filter(Boolean).join('/')
export const mkInstanceDataPath = (instanceId: string, ...path: string[]) => INSTANCES_ROOT(instanceId, ...path)

export const logConstants = () => {
  const vars = {
    DEBUG,
    PH_ALLOWED_POCKETBASE_SEMVER,
    PH_HOME,
    PH_PROJECT_ROOT,
    HTTP_PROTOCOL,
    APP_URL,
    APEX_DOMAIN,
    IPCIDR_LIST,
    PH_USER_PROXY_IPS,
    DAEMON_PORT,
    DAEMON_PB_IDLE_TTL,
    PH_CONTAINER_LAUNCH_WARN_MS,
    PH_CONTAINER_STOP_TIMEOUT_SEC,
    MOTHERSHIP_URL,
    MOTHERSHIP_NAME,
    MOTHERSHIP_ADMIN_USERNAME,
    MOTHERSHIP_ADMIN_PASSWORD,
    MOTHERSHIP_MIGRATIONS_DIR,
    MOTHERSHIP_HOOKS_DIR,
    MOTHERSHIP_APP_DIR,
    MOTHERSHIP_SEMVER,
    MOTHERSHIP_DATA_ROOT,
    MOTHERSHIP_CLOUDFLARE_API_TOKEN,
    MOTHERSHIP_CLOUDFLARE_ZONE_ID,
    MOTHERSHIP_CLOUDFLARE_ACCOUNT_ID,
    INITIAL_PORT_POOL_SIZE,
    DATA_ROOT,
    NODE_ENV,
    IS_DEV,
    PH_DISABLE_INSTANCE_WEBHOOKS,
    PH_DISABLE_FIREWALL_RATE_LIMIT,
    TRACE,
    PH_FTP_PORT,
    SSL_KEY,
    SSL_CERT,
    PH_FTP_PASV_IP,
    PH_FTP_PASV_PORT_MIN,
    PH_FTP_PASV_PORT_MAX,
    PH_SFTP_PORT,
    PH_SFTP_HOST_KEY,
    EDGE_APEX_DOMAIN,
    INSTANCE_APP_ROOT: () => INSTANCE_APP_ROOT(`<version>`),
    DISCORD_HEALTH_CHANNEL_URL,
    DISCORD_ALERT_CHANNEL_URL,
    DISCORD_TEST_CHANNEL_URL,
    DISCORD_STREAM_CHANNEL_URL,
    TEST_EMAIL,
    LS_WEBHOOK_SECRET,
    SYSLOGD_PORT,
    DOCKER_CONTAINER_HOST,
    DOCKER_INSTANCE_IMAGE_NAME,
    PH_POCKETBASE_ROOT,
    PH_MAX_CONCURRENT_DOCKER_LAUNCHES,
    MOTHERSHIP_DATA_DB,
    INSTANCES_ROOT,
    PH_MOTHERSHIP_MIRROR_PORT,
  }
  for (const [k, v] of Object.entries(vars)) {
    console.log(`${k}: ${v()}`)
  }
}
