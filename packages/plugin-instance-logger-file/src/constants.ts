import { underscore } from 'inflection'
import { dirname, join } from 'path'
import { PH_HOME, Settings, mkPath } from 'pockethost/core'
import { fileURLToPath } from 'url'

export const PLUGIN_NAME = `plugin-instance-logger-file`

export const HOME_DIR =
  process.env.PH_INSTANCE_LOGGER_FILE_HOME || join(PH_HOME(),PLUGIN_NAME)

export const PLUGIN_NAME_CONSTANT_CASE = underscore(PLUGIN_NAME, true)

export const PLUGIN_DATA = (...paths: string[]) => join(HOME_DIR, ...paths)

const __dirname = dirname(fileURLToPath(import.meta.url))
export const PROJECT_DIR = (...paths: string[]) =>
  join(__dirname, '..', ...paths)

export const settings = Settings({
  PH_INSTANCE_LOGGER_FILE_HOME: mkPath(HOME_DIR, { create: true }),
})

