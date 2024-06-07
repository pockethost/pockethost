import { isString } from '@s-libs/micro-dash'

export type PocketHostAction = string

export type PocketHostFilter = string

export type PocketHostPlugin = (api: PocketHostPluginApi) => Promise<void>

const filters: { [key in PocketHostFilter]: FilterHandler[] } = {}

const actions: {
  [key in PocketHostAction]: ActionHandler[]
} = {}

export type FilterHandler = (carry: any) => any
export type ActionHandler = (...args: any[]) => void

export async function registerFilter(
  filter: PocketHostFilter,
  handler: (carry: any) => any,
) {
  if (!(filter in filters)) filters[filter] = []
  filters[filter]!.push(handler)
}

export async function registerAction(
  action: PocketHostAction,
  handler: (...args: any[]) => Promise<void>,
) {
  if (!(action in actions)) actions[action] = []
  actions[action]!.push(handler)
}

export async function filter<T>(filterName: PocketHostFilter, initialValue: T) {
  const filter = filters[filterName]
  if (!filter) return initialValue
  return filter.reduce(
    (carry, handler) => carry.then((carryRes) => handler(carryRes)),
    Promise.resolve(initialValue),
  )
}

export async function action(actionName: PocketHostAction, ...rest: any[]) {
  const action = actions[actionName]
  if (!action) return
  await Promise.all(action.map((handler) => handler(...rest)))
}

export type PocketHostPluginApi = {
  registerAction: typeof registerAction
}

export const loadPlugins = async (plugins: (string | PocketHostPlugin)[]) => {
  await Promise.all(
    plugins.map(async (pluginPathOrModule) => {
      const plugin = await (async () => {
        if (!isString(pluginPathOrModule)) return pluginPathOrModule
        const plugin = await import(pluginPathOrModule)
        return plugin.default
      })()
      await plugin({ registerAction })
    }),
  )
  return plugins
}
