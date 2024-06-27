import { join } from 'path'
import { DEBUG } from 'pockethost'
import {
  PH_HOME,
  Settings,
  logSettings,
  mkNumber,
  mkPath,
} from 'pockethost/core'

export const PLUGIN_NAME = `plugin-maildev`

export const HOME_DIR =
  process.env.PH_MAILDEV_HOME || join(PH_HOME(), PLUGIN_NAME)

const settings = Settings({
  PH_MAILDEV_HOME: mkPath(HOME_DIR, { create: true }),
  PH_MAILDEV_SMTP_PORT: mkNumber(1025),
  PH_MAILDEV_WEB_ADMIN_PORT: mkNumber(1080),
})

export const PORT = () => settings.PH_MAILDEV_SMTP_PORT
export const WEB_ADMIN_PORT = () => settings.PH_MAILDEV_WEB_ADMIN_PORT

if (DEBUG()) {
  logSettings(settings)
}
