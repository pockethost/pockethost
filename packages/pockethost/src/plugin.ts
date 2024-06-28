import { produce } from 'immer'
import {
  PocketHostPlugin,
  namespace,
  onInstanceConfigFilter,
  onInstanceLogAction,
  onServeAction,
  onServeSlugsFilter,
} from '../common'
import { dbg } from './cli'
import { PH_PROJECT_DIR } from './constants'
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
}
