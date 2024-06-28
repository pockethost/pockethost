import { Command } from 'commander'
import { produce } from 'immer'
import {
  PocketHostPlugin,
  onCliCommandsFilter,
  onInstanceConfigFilter,
  onServeAction,
  onServeSlugsFilter,
} from 'pockethost'
import {
  PLUGIN_NAME,
  PLUGIN_NAME_CONSTANT_CASE,
  PROJECT_DIR,
} from './constants'
import { dbg } from './log'

export const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)

  onInstanceConfigFilter(async (config) => {
    return produce(config, (draft) => {
      draft.env[`PH_${PLUGIN_NAME_CONSTANT_CASE}_ENABLED`] = true.toString()
      draft.binds.hooks.push({
        src: PROJECT_DIR(`src/instance-app/hooks/**/*`),
        base: PROJECT_DIR(`src/instance-app/hooks`),
      })
    })
  })

  onCliCommandsFilter(async (commands) => {
    return [
      ...commands,
      new Command(PLUGIN_NAME).description(`Command root`).addCommand(
        new Command(`serve`)
          .description(`Run a task`)
          .action(async (options) => {
            // do something
          }),
      ),
    ]
  })

  onServeSlugsFilter(async (slugs) => {
    return [...slugs, PLUGIN_NAME]
  })

  onServeAction(async ({ only }) => {
    if (!only.includes(PLUGIN_NAME)) return
    // Do something
  })
}
