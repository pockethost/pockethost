import { join } from 'path'
import { DEBUG } from 'pockethost'
import { PH_HOME, Settings, logSettings, mkPath } from 'pockethost/core'

export const PLUGIN_NAME = `plugin-console-logger`

export const HOME_DIR =
  process.env.PH_CONSOLE_LOGGER_HOME || join(PH_HOME(), PLUGIN_NAME)

const settings = Settings({
  PH_CONSOLE_LOGGER__HOME: mkPath(HOME_DIR, { create: true }),
})

if (DEBUG()) {
  logSettings(settings)
}
