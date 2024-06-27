import { dirname, join } from 'path'
import {
  APEX_DOMAIN,
  HTTP_PROTOCOL,
  INSTANCE_DATA_ROOT,
  Settings,
  mkNumber,
  mkPath,
  mkString,
} from 'pockethost/core'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const _MOTHERSHIP_NAME =
  process.env.PH_MOTHERSHIP_NAME || 'pockethost-central'

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

const settings = Settings({
  PH_MOTHERSHIP_URL: mkString(
    `${HTTP_PROTOCOL()}//${_MOTHERSHIP_NAME}.${APEX_DOMAIN()}`,
  ),
  PH_MOTHERSHIP_NAME: mkString(_MOTHERSHIP_NAME),
  PH_MOTHERSHIP_INTERNAL_HOST: mkString(`localhost`),
  PH_MOTHERSHIP_ADMIN_USERNAME: mkString(),
  PH_MOTHERSHIP_ADMIN_PASSWORD: mkString(),
  PH_MOTHERSHIP_APP_ROOT: mkString(_MOTHERSHIP_APP_ROOT()),
  PH_MOTHERSHIP_MIGRATIONS_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`migrations`)),
  PH_MOTHERSHIP_HOOKS_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`pb_hooks`, `src`)),
  PH_MOTHERSHIP_APP_DIR: mkPath(_MOTHERSHIP_APP_ROOT(`ph_app`), {
    required: false,
  }),
  PH_MOTHERSHIP_SEMVER: mkString('*'),
  PH_MOTHERSHIP_PORT: mkNumber(8091),

  PH_MOTHERSHIP_INSTANCE_APP_ROOT: mkString(_INSTANCE_APP_ROOT()),
  PH_MOTHERSHIP_INSTANCE_APP_HOOKS_DIR: mkPath(_INSTANCE_APP_ROOT(`pb_hooks`), {
    create: true,
  }),
  PH_MOTHERSHIP_INSTANCE_APP_MIGRATIONS_DIR: mkPath(
    _INSTANCE_APP_ROOT(`migrations`),
    {
      create: true,
    },
  ),
})

export const MOTHERSHIP_URL = () => settings.PH_MOTHERSHIP_URL
export const MOTHERSHIP_INTERNAL_HOST = () =>
  settings.PH_MOTHERSHIP_INTERNAL_HOST
export const MOTHERSHIP_NAME = () => settings.PH_MOTHERSHIP_NAME
export const MOTHERSHIP_ADMIN_USERNAME = () =>
  settings.PH_MOTHERSHIP_ADMIN_USERNAME
export const MOTHERSHIP_ADMIN_PASSWORD = () =>
  settings.PH_MOTHERSHIP_ADMIN_PASSWORD
export const MOTHERSHIP_MIGRATIONS_DIR = (...paths: string[]) =>
  join(settings.PH_MOTHERSHIP_MIGRATIONS_DIR, ...paths)
export const MOTHERSHIP_HOOKS_DIR = (...paths: string[]) =>
  join(settings.PH_MOTHERSHIP_HOOKS_DIR, ...paths)
export const MOTHERSHIP_APP_DIR = () => settings.PH_MOTHERSHIP_APP_DIR
export const MOTHERSHIP_SEMVER = () => settings.PH_MOTHERSHIP_SEMVER
export const MOTHERSHIP_PORT = () => settings.PH_MOTHERSHIP_PORT

export const MOTHERSHIP_DATA_ROOT = (...paths: string[]) =>
  join(INSTANCE_DATA_ROOT(MOTHERSHIP_NAME()), ...paths)
export const MOTHERSHIP_DATA_DB = () =>
  join(MOTHERSHIP_DATA_ROOT(), `pb_data`, `data.db`)
export const MOTHERSHIP_INTERNAL_URL = (path = '') =>
  `http://${MOTHERSHIP_INTERNAL_HOST()}:${MOTHERSHIP_PORT()}${path}`

export const INSTANCE_APP_HOOK_DIR = () =>
  settings.PH_MOTHERSHIP_INSTANCE_APP_HOOKS_DIR
export const INSTANCE_APP_MIGRATIONS_DIR = () =>
  settings.PH_MOTHERSHIP_INSTANCE_APP_MIGRATIONS_DIR
