import { Command } from 'commander'
import { Request, Response } from 'express'
import { DEBUG } from '../debug'
import { InstanceFields, InstanceId } from '../schema'
import { UserId } from '../schema/BaseFields'

export enum CoreFilters {
  Settings = 'core_settings',
  CliCommands = 'core_cli_commands',
  ServeSlugs = 'core_serve_slugs',
  SpawnConfig = 'core_spawn_config',
  AuthenticateUser = 'core_authenticate_user',
  GetInstanceByRequestInfo = 'core_get_instance_by_request_info',
  GetInstanceById = 'core_get_instance_by_id',
  GetOneInstanceByExactCriteria = 'core_get_one_instance_by_exact_criteria',
  GetAllInstancesByExactCriteria = 'core_get_all_instances_by_exact_criteria',
  InstanceConfig = 'core_instance_config',
  ErrorSpawningInstanceMessage = 'core_error_spawning_instance_message',
  FailedToLaunchInstanceMessage = 'core_failed_to_launch_instance_message',
  AuthenticateRequest = 'core_authenticate_request',
  RequestError_Message = 'core_request_error_message',
  GetOrProvisionInstanceUrl = 'core_get_or_provision_instance_url',
  PocketBaseLaunchHandler = 'core_pocket_base_launch_handler',
  NewInstanceRecord = 'core_new_instance_record',
  IsInstanceRunning = 'core_is_instance_running',
}

export type FilterHandler<TCarry, TContext> = (
  carry: TCarry,
  context: TContext,
) => TCarry | Promise<TCarry>
type FilterEntry<T> = {
  priority: number
  handler: FilterHandler<T, any>
}
const filters: {
  [key: string]: FilterEntry<any>[]
} = {}

function registerFilter<TCarry, TContext extends {} = {}>(
  filter: string,
  handler: FilterHandler<TCarry, TContext>,
  priority = 10,
): () => void {
  if (!(filter in filters)) filters[filter] = []
  filters[filter]!.push({ priority, handler })
  filters[filter]!.sort((a, b) => a.priority - b.priority)

  return () => {
    const index = filters[filter]!.findIndex(
      (entry) => entry.handler === handler,
    )
    if (index !== -1) {
      filters[filter]!.splice(index, 1)
    }
  }
}

async function filter<TCarry, TContext extends {} = {}>(
  filterName: string,
  initialValue: TCarry,
  context: TContext,
) {
  if (DEBUG()) {
    console.log(`f:${filterName}`)
  }
  const filter = filters[filterName]
  if (!filter) return initialValue
  return filter.reduce(
    (carry, entry) =>
      carry
        .then((carryRes) => entry.handler(carryRes, context))
        .then((carryRes) => {
          if (DEBUG()) {
            console.log(`f:${filterName}`, carryRes, context)
          }
          return carryRes
        }),
    Promise.resolve(initialValue),
  ) as TCarry
}

function createCustomFilterWithContext<TCarry, TContext extends {} = {}>(
  filterName: CoreFilters,
) {
  return [
    async (initialValue: TCarry, context: TContext) =>
      filter<TCarry, TContext>(filterName, initialValue, context),
    async <TExtraCarry = unknown>(
      handler: FilterHandler<TCarry & TExtraCarry, TContext>,
      priority = 10,
    ) =>
      registerFilter<TCarry & TExtraCarry, TContext>(
        filterName,
        handler,
        priority,
      ),
  ] as const
}

function createCustomFilter<TCarry>(filterName: string) {
  return [
    async (initialValue: TCarry) =>
      filter<TCarry>(filterName, initialValue, {}),
    async <TExtraCarry = unknown>(
      handler: FilterHandler<TCarry & TExtraCarry, {}>,
      priority = 10,
    ) =>
      registerFilter<TCarry & TExtraCarry, {}>(filterName, handler, priority),
  ] as const
}

export const [doSettingsFilter, onSettingsFilter] = createCustomFilter<{
  [_: string]: any
}>(CoreFilters.Settings)

export const [doAuthenticateUserFilter, onAuthenticateUserFilter] =
  createCustomFilterWithContext<
    UserId | undefined,
    { username: string; password: string }
  >(CoreFilters.AuthenticateUser)

export const [
  doGetInstanceByRequestInfoFilter,
  onGetInstanceByRequestInfoFilter,
] = createCustomFilterWithContext<
  InstanceFields | undefined,
  { req: Request; res: Response; host: string; subdomain: string }
>(CoreFilters.GetInstanceByRequestInfo)

export const [doGetInstanceByIdFilter, onGetInstanceByIdFilter] =
  createCustomFilterWithContext<
    InstanceFields | undefined,
    { instanceId: InstanceId }
  >(CoreFilters.GetInstanceById)

export const [
  doGetOneInstanceByExactCriteriaFilter,
  onGetOneInstanceByExactCriteriaFilter,
] = createCustomFilterWithContext<
  InstanceFields | undefined,
  Partial<InstanceFields & { [_: string]: string | number }>
>(CoreFilters.GetOneInstanceByExactCriteria)

export const [
  doGetAllInstancesByExactCriteriaFilter,
  onGetAllInstancesByExactCriteriaFilter,
] = createCustomFilterWithContext<
  InstanceFields[],
  Partial<InstanceFields & { [_: string]: string | number }>
>(CoreFilters.GetAllInstancesByExactCriteria)

export const [doCliCommandsFilter, onCliCommandsFilter] = createCustomFilter<
  Command[]
>(CoreFilters.CliCommands)

export const [doNewInstanceRecordFilter, onNewInstanceRecordFilter] =
  createCustomFilter<InstanceFields>(CoreFilters.NewInstanceRecord)

export const [doRequestErrorMessageFilter, onRequestErrorMessageFilter] =
  createCustomFilter<string>(CoreFilters.RequestError_Message)

export const [
  doGetOrProvisionInstanceUrlFilter,
  onGetOrProvisionInstanceUrlFilter,
] = createCustomFilterWithContext<
  string | undefined,
  {
    instance: InstanceFields
  }
>(CoreFilters.GetOrProvisionInstanceUrl)

export const [doServeSlugsFilter, onServeSlugsFilter] = createCustomFilter<
  string[]
>(CoreFilters.ServeSlugs)

export type Bind = {
  base: string
  src: string
}
export type Binds = {
  data: Bind[]
  hooks: Bind[]
  migrations: Bind[]
  public: Bind[]
}
export type InstanceConfig = {
  binds: Binds
  env: { [_: string]: string }
}
export const [doInstanceConfigFilter, onInstanceConfigFilter] =
  createCustomFilter<InstanceConfig>(CoreFilters.InstanceConfig)

export const [doIsInstanceRunningFilter, onIsInstanceRunningFilter] =
  createCustomFilterWithContext<boolean, { instance: InstanceFields }>(
    CoreFilters.IsInstanceRunning,
  )
