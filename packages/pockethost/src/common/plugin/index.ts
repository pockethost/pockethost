import { isString } from '@s-libs/micro-dash'
export * from './action'
export * from './filter'

export type PocketHostPlugin = (api: PocketHostPluginApi) => Promise<void>

export type PocketHostPluginApi = {}

export const loadPlugins = async (plugins: (string | PocketHostPlugin)[]) => {
  await Promise.all(
    plugins.map(async (pluginPathOrModule) => {
      const plugin = await (async () => {
        if (!isString(pluginPathOrModule)) return pluginPathOrModule
        const plugin = await import(pluginPathOrModule)
        return plugin.default
      })()
      await plugin({})
    }),
  )
  return plugins
}
