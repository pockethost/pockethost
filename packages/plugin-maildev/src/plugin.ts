import { produce } from 'immer'
import {
  IS_DEV,
  PocketHostPlugin,
  onCliCommandsFilter,
  onInstanceConfigFilter,
  onServeAction,
  onServeSlugsFilter,
  onSettingsFilter,
} from 'pockethost'
import { MailDevCommand, serve } from '.'
import {
  PLUGIN_NAME,
  PLUGIN_NAME_CONSTANT_CASE,
  PORT,
  PROJECT_DIR,
  settings,
} from './constants'
import { dbg } from './log'

export const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)

  if (!IS_DEV()) return

  // registerFilter(PocketHostFilter.Firewall_HostnameRoutes, async (routes) => {
  //   return {
  //     ...routes,
  //     [`mail.${APEX_DOMAIN()}`]: `http://localhost:${1080}`,
  //   }
  // })
  onInstanceConfigFilter(async (config) => {
    return produce(config, (draft) => {
      draft.env[`PH_${PLUGIN_NAME_CONSTANT_CASE}_ENABLED`] = true.toString()
      draft.env.PH_MAILDEV_PORT = PORT().toString()
      draft.binds.hooks.push({
        src: PROJECT_DIR(`src/instance-app/hooks/**/*`),
        base: PROJECT_DIR(`src/instance-app/hooks`),
      })
    })
  })

  onCliCommandsFilter(async (commands) => {
    return [...commands, MailDevCommand()]
  })

  onServeSlugsFilter(async (slugs) => {
    return [...slugs, 'maildev']
  })

  onServeAction(async ({ only }) => {
    if (!only.includes('maildev')) return
    serve()
  })

  onSettingsFilter(async (allSettings) => ({ ...allSettings, ...settings }))
}
