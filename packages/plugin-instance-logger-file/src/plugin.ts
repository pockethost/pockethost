import { appendFileSync, existsSync, mkdirSync } from 'fs'
import {
  PocketHostPlugin,
  onAfterPluginsLoadedAction,
  onInstanceLogAction,
  onSettingsFilter,
} from 'pockethost'
import { INSTANCE_DATA_DIR } from 'pockethost/core'
import { PLUGIN_NAME, settings } from './constants'
import { dbg } from './log'

export const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)

  onAfterPluginsLoadedAction(async () => {})

  onInstanceLogAction(async ({ instance, type, data }) => {
    const { id } = instance
    const logDirectory = INSTANCE_DATA_DIR(id, `logs`)
    if (!existsSync(logDirectory)) {
      dbg(`Creating ${logDirectory}`)
      mkdirSync(logDirectory, { recursive: true })
    }

    const logFile = INSTANCE_DATA_DIR(id, `logs`, `exec.log`)

    const logLine = JSON.stringify({
      stream: type,
      time: +new Date(),
      message: data,
    })
    appendFileSync(logFile, logLine + '\n')
    dbg(`Logged: ${logLine}`)
  })

  onSettingsFilter(async (allSettings) => ({ ...allSettings, ...settings }))
}
