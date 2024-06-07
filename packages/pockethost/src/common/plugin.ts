import { isString } from '@s-libs/micro-dash'
import { Request } from 'express'
import { InstanceFields, LogLevelName } from '.'

export enum PocketHostAction {
  Request = 'request',
  BeforeDaemonStart = 'before_daemon_start',
  Log = 'log',
  InstanceApiTimeout = 'instance_api_timeout',
  UpdateInstance = 'update_instance',
}

export enum PocketHostFilter {
  ExtraBinds = 'extra_binds',
}

export type PocketHostPlugin = (api: PocketHostPluginApi) => Promise<void>

const filters: { [key in PocketHostFilter]: FilterHandler[] } = {
  [PocketHostFilter.ExtraBinds]: [],
}

const actions: {
  [key in PocketHostAction]: ActionHandler[]
} = {
  [PocketHostAction.Request]: [],
  [PocketHostAction.BeforeDaemonStart]: [],
  [PocketHostAction.Log]: [],
  [PocketHostAction.InstanceApiTimeout]: [],
  [PocketHostAction.UpdateInstance]: [],
}

export type FilterHandler = (carry: any) => any
export type ActionHandler = (...args: any[]) => void

export async function registerFilter(
  filter: PocketHostFilter.ExtraBinds,
  handler: (carry: string[]) => string[],
) {
  filters[filter].push(handler)
}

export async function registerAction(
  action: PocketHostAction.BeforeDaemonStart,
  handler: (req: Request) => void,
): Promise<void>
export async function registerAction(
  action: PocketHostAction.Request,
  handler: (req: Request) => void,
): Promise<void>
export async function registerAction(
  action: PocketHostAction.Log,
  handler: (
    currentLevel: LogLevelName,
    level: LogLevelName,
    args: any[],
  ) => void,
): Promise<void>
export async function registerAction(
  action: PocketHostAction.InstanceApiTimeout,
  handler: (instance: InstanceFields) => void,
): Promise<void>
export async function registerAction(
  action: PocketHostAction.UpdateInstance,
  handler: (id: string, fields: InstanceFields) => void,
): Promise<void>
export async function registerAction(
  action: PocketHostAction,
  handler: ActionHandler,
): Promise<void> {
  actions[action].push(handler)
}

export async function filter(
  filter: PocketHostFilter.ExtraBinds,
  initial: string[],
) {
  return filters[filter].reduce((carry, handler) => handler(carry), initial)
}

export async function action(
  action: PocketHostAction.Request,
  req: Request,
): Promise<void>
export async function action(
  action: PocketHostAction.BeforeDaemonStart,
): Promise<void>
export async function action(
  action: PocketHostAction.Log,
  currentLevel: LogLevelName,
  levelIn: LogLevelName,
  ...rest: any[]
): Promise<void>
export async function action(
  action: PocketHostAction.InstanceApiTimeout,
  instance: InstanceFields,
): Promise<void>
export async function action(
  action: PocketHostAction.UpdateInstance,
  id: string,
  fields: Partial<InstanceFields>,
): Promise<void>
export async function action(action: PocketHostAction, ...args: any[]) {
  await Promise.all(actions[action].map((handler) => handler(...args)))
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
