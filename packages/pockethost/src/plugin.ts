import { forEach } from '@s-libs/micro-dash'
import { produce } from 'immer'
import {
  PocketHostPlugin,
  doSettingsFilter,
  namespace,
  newId,
  onAfterPluginsLoadedAction,
  onInstanceConfigFilter,
  onInstanceLogAction,
  onServeAction,
  onServeSlugsFilter,
} from '../common'
import { dbg, info } from './cli'
import { INTERNAL_APP_SECRET, PH_PROJECT_DIR, settings } from './constants'
import { setConfig } from './core/config'
import { serve } from './server'

export const pockethost: PocketHostPlugin = async ({}) => {
  onInstanceConfigFilter(async (config) => {
    return produce(config, (draft) => {
      draft.binds.hooks.push({
        src: PH_PROJECT_DIR(`src/instance-app/hooks/**/*`),
        base: PH_PROJECT_DIR(`src/instance-app/hooks`),
      })
    })
  })

  onInstanceLogAction(async ({ instance, type, data }) => {
    dbg(namespace(instance.subdomain, type), data.toString())
  })

  onServeAction(async ({ only }) => {
    if (!only.includes(`pockethost`)) return
    serve()
  })

  onServeSlugsFilter(async (slugs) => {
    return [...slugs, `pockethost`]
  })

  onAfterPluginsLoadedAction(async () => {
    const allSettings = await doSettingsFilter(settings)
    forEach(allSettings, (v, k) => {
      dbg(`${k}: ${v}`)
    })
  }, 99)

  onAfterPluginsLoadedAction(async () => {
    if (INTERNAL_APP_SECRET()) return
    info(`Generating internal app secret...`)
    setConfig(`PH_INTERNAL_APP_SECRET`, newId(30))
  })
}
