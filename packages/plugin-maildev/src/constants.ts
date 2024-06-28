import { dirname, join } from 'path'
import { DEBUG } from 'pockethost'
import {
  PH_HOME,
  Settings,
  logSettings,
  mkBoolean,
  mkNumber,
  mkPath,
} from 'pockethost/core'
import { fileURLToPath } from 'url'

export const PLUGIN_NAME = `plugin-maildev`

export const HOME_DIR =
  process.env.PH_MAILDEV_HOME || join(PH_HOME(), PLUGIN_NAME)

const __dirname = dirname(fileURLToPath(import.meta.url))

export const PROJECT_DIR = (...paths: string[]) =>
  join(__dirname, '..', ...paths)

const settings = Settings({
  PH_MAILDEV_HOME: mkPath(HOME_DIR, { create: true }),
  PH_MAILDEV_SMTP_PORT: mkNumber(1025),
  PH_MAILDEV_WEB_ADMIN_PORT: mkNumber(1080),
  PH_MAILDEV_ALWAYS_USE_LOCAL: mkBoolean(true),
})

export const PORT = () => settings.PH_MAILDEV_SMTP_PORT
export const WEB_ADMIN_PORT = () => settings.PH_MAILDEV_WEB_ADMIN_PORT

if (DEBUG()) {
  logSettings(settings)
}
