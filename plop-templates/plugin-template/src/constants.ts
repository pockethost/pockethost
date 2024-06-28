import { underscore } from 'inflection'
import { dirname, join } from 'path'
import { DEBUG } from 'pockethost'
import { PH_HOME, Settings, logSettings, mkPath } from 'pockethost/core'
import { fileURLToPath } from 'url'

export const PLUGIN_NAME = `plugin-{{dashCase name}}`

export const HOME_DIR =
  process.env.PH_{{constantCase name}}_HOME || join(PH_HOME(),PLUGIN_NAME)
  export const PLUGIN_NAME_CONSTANT_CASE = underscore(PLUGIN_NAME, true)

  const __dirname = dirname(fileURLToPath(import.meta.url))

export const PROJECT_DIR = (...paths: string[]) =>
  join(__dirname, '..', ...paths)

const settings = Settings({
  PH_{{constantCase name}}_HOME: mkPath(HOME_DIR, { create: true }),
})

if (DEBUG()) {
  logSettings(settings)
}
