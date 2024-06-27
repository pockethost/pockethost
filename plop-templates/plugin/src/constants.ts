import { join } from 'path'
import { DEBUG } from 'pockethost'
import { PH_HOME, Settings, logSettings, mkPath } from 'pockethost/core'

export const PLUGIN_NAME = `plugin-{{dashCase name}}`

export const HOME_DIR =
  process.env.PH_{{constantCase name}}_HOME || join(PH_HOME(),PLUGIN_NAME)

const settings = Settings({
  PH_{{constantCase name}}_HOME: mkPath(HOME_DIR, { create: true }),
})

if (DEBUG()) {
  logSettings(settings)
}
