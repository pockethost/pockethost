import { join } from 'path'
import {
  LoggerService,
  PH_HOME,
  PocketHostPlugin,
  Settings,
  mkPath,
} from 'pockethost/core'

const _HOME_DIR =
  process.env.PH_SIL_HOME || join(PH_HOME(), `plugin-file-instance-logger`)

const settings = Settings({
  PH_FIL_HOME: mkPath(_HOME_DIR, { create: true }),
})

const logger = LoggerService().create('plugin-file-instance-logger')
export const { dbg } = logger

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  dbg(`initializing plugin-file-instance-logger`)
}

export default plugin
