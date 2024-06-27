import { Command } from 'commander'
import { Request, Response } from 'express'
import { DEBUG } from '../debug'
import { InstanceFields, InstanceId } from '../schema'

export enum CoreFilters {
  CliCommands = 'core_cli_commands',
  SpawnConfig = 'core_spawn_config',
  GetInstanceByRequestInfo = 'core_get_instance_by_request_info',
  GetInstanceById = 'core_get_instance_by_id',
  ErrorSpawningInstanceMessage = 'core_error_spawning_instance_message',
  FailedToLaunchInstanceMessage = 'core_failed_to_launch_instance_message',
  AuthenticateRequest = 'core_authenticate_request',
  RequestError_Message = 'core_request_error_message',
  GetOrProvisionInstanceUrl = 'core_get_or_provision_instance_url',
  PocketBaseLaunchHandler = 'core_pocket_base_launch_handler',
  NewInstanceRecord = 'core_new_instance_record',
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

async function registerFilter<TCarry, TContext extends {} = {}>(
  filter: string,
  handler: FilterHandler<TCarry, TContext>,
  priority = 10,
) {
  if (!(filter in filters)) filters[filter] = []
  filters[filter]!.push({ priority, handler })
  filters[filter]!.sort((a, b) => a.priority - b.priority)
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
      carry.then((carryRes) => entry.handler(carryRes, context)),
    Promise.resolve(initialValue),
  ) as TCarry
}

function createCustomFilterWithContext<TCarry, TContext extends {} = {}>(
  filterName: CoreFilters,
) {
  return [
    async (initialValue: TCarry, context: TContext) =>
      filter<TCarry, TContext>(filterName, initialValue, context),
    async (handler: FilterHandler<TCarry, TContext>, priority = 10) =>
      registerFilter<TCarry, TContext>(filterName, handler, priority),
  ] as const
}

function createCustomFilter<TCarry>(filterName: string) {
  return [
    async (initialValue: TCarry) =>
      filter<TCarry>(filterName, initialValue, {}),
    async (handler: FilterHandler<TCarry, {}>, priority = 10) =>
      registerFilter<TCarry, {}>(filterName, handler, priority),
  ] as const
}

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
  string,
  {
    req: Request
    res: Response
    host: string
    subdomain: string
    instance: InstanceFields
  }
>(CoreFilters.GetOrProvisionInstanceUrl)
