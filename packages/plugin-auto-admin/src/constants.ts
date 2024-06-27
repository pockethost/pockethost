import { join } from 'path'
import { DEBUG } from 'pockethost'
import {
  PH_HOME,
  Settings,
  logSettings,
  mkPath,
  mkString,
} from 'pockethost/core'

export const PLUGIN_NAME = `plugin-auto-admin`

export const HOME_DIR =
  process.env.PH_AUTO_ADMIN_HOME || join(PH_HOME(), PLUGIN_NAME)

const settings = Settings({
  PH_AUTO_ADMIN_HOME: mkPath(HOME_DIR, { create: true }),
  PH_AUTO_ADMIN_LOGIN: mkString(`admin@pockethost.lvh.me`),
  PH_AUTO_ADMIN_PASSWORD: mkString(`0123456789`),
})

export const LOGIN = () => settings.PH_AUTO_ADMIN_LOGIN
export const PASSWORD = () => settings.PH_AUTO_ADMIN_PASSWORD

if (DEBUG()) {
  logSettings(settings)
}
