import { join } from 'path'
import { PH_HOME, Settings, mkPath } from 'pockethost/core'

export const PLUGIN_NAME = `plugin-console-logger`

export const HOME_DIR =
  process.env.PH_CONSOLE_LOGGER_HOME || join(PH_HOME(), PLUGIN_NAME)

export const settings = Settings({
  PH_CONSOLE_LOGGER_HOME: mkPath(HOME_DIR, { create: true }),
})
