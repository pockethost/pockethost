import { join } from 'path'
import { DEBUG } from 'pockethost'
import { PH_HOME, Settings, logSettings, mkPath } from 'pockethost/core'

export const PLUGIN_NAME = `plugin-launcher-spawn`

export const HOME_DIR =
  process.env.PH_LAUNCHER_SPAWN_HOME || join(PH_HOME(), PLUGIN_NAME)

const settings = Settings({
  PH_LAUNCHER_SPAWN_HOME: mkPath(HOME_DIR, { create: true }),
})

if (DEBUG()) {
  logSettings(settings)
}
