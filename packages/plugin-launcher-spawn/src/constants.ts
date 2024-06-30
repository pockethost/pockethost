import { join } from 'path'
import { PH_HOME, Settings, mkPath } from 'pockethost/core'

export const PLUGIN_NAME = `plugin-launcher-spawn`

export const HOME_DIR =
  process.env.PH_LAUNCHER_SPAWN_HOME || join(PH_HOME(), PLUGIN_NAME)

export const PLUGIN_DATA = (...paths: string[]) => join(HOME_DIR, ...paths)

export const settings = Settings({
  PH_LAUNCHER_SPAWN_HOME: mkPath(HOME_DIR, { create: true }),
})
