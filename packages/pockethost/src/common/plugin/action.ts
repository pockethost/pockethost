import { uniqueId } from '@s-libs/micro-dash'
import { Express, Request, Response } from 'express'
import { dbg } from '../../cli'
import { LogLevelName } from '../Logger'
import { DEBUG } from '../debug'
import { InstanceFields } from '../schema'

enum CoreActions {
  AfterPluginsLoaded = 'core_after_plugins_loaded',
  Init = 'core_init',
  Serve = 'core_serve',
  AppMounted = 'core_on_app_mount',
  AfterServeStart = 'core_after_serve_start',

  Cli_Before_ServeCommand = 'core_before_serve',
  Log = 'core_log',
  InstanceLog = 'core_instance_log',

  StartInstance = 'core_start_instance',

  BeforeInstanceStarted = 'core_before_instance_started',
  AfterInstanceStarted = 'core_after_instance_started',

  BeforeInstanceStopped = 'core_before_instance_stopped',
  AfterInstanceStopped = 'core_after_instance_stopped',

  AfterInstanceFound = 'core_after_instance_found',

  RequestError = 'core_edge_on_request_error',
  Request = 'core_edge_request',
}

export type ActionHandler<TContext = {}> = (
  context: TContext extends never ? [] : TContext,
) => Promise<void>

interface Action {
  priority: number
  handler: ActionHandler<any>
}

const actions: {
  [key: string]: Action[]
} = {}

function registerAction(
  action: string,
  handler: (...args: any[]) => Promise<void>,
  priority: number = 10,
): () => void {
  if (!(action in actions)) actions[action] = []
  const uid = uniqueId(`a:${action}:`)
  dbg(`${uid}:subscribe`)
  actions[action]!.push({ priority, handler })
  actions[action]!.sort((a, b) => a.priority - b.priority)

  return () => {
    dbg(`${uid}:unsubscribe`)
    actions[action] = actions[action]!.filter((a) => a.handler !== handler)
  }
}

async function action(actionName: string, context: any) {
  if (DEBUG() && actionName !== CoreActions.Log) {
    console.log(`a:${actionName}`)
  }
  const action = actions[actionName]
  if (!action) return false
  for (const { handler } of action) {
    await handler(context)
  }
  return true
}

export function createCustomActionWithContext<TContext extends {}>(
  actionName: CoreActions,
) {
  return [
    async (context: TContext) => action(actionName, context),
    (handler: ActionHandler<TContext>, priority = 10) =>
      registerAction(actionName, handler, priority),
  ] as const
}

export function createCustomAction(actionName: CoreActions) {
  return [
    async () => action(actionName, {}),
    (handler: ActionHandler, priority = 10) =>
      registerAction(actionName, handler, priority),
  ] as const
}

export const [doAfterPluginsLoadedAction, onAfterPluginsLoadedAction] =
  createCustomAction(CoreActions.AfterPluginsLoaded)

export const [doRequestErrorAction, onRequestErrorAction] =
  createCustomActionWithContext<{
    err: Error
  }>(CoreActions.RequestError)

export const [doAfterServerStartAction, onAfterServerStartAction] =
  createCustomAction(CoreActions.AfterServeStart)

export const [doLogAction, onLogAction] = createCustomActionWithContext<{
  currentLevel: LogLevelName
  levelIn: LogLevelName
  args: any[]
}>(CoreActions.Log)

export const [doInstanceLogAction, onInstanceLogAction] =
  createCustomActionWithContext<{
    instance: InstanceFields
    type: 'stdout' | 'stderr'
    data: string
  }>(CoreActions.InstanceLog)

export const [doAppMountedAction, onAppMountedAction] =
  createCustomActionWithContext<{ app: Express }>(CoreActions.AppMounted)

export const [doIncomingRequestAction, onIncomingRequestAction] =
  createCustomActionWithContext<{ req: Request; res: Response; host: string }>(
    CoreActions.Request,
  )

export const [doAfterInstanceFoundAction, onAfterInstanceFoundAction] =
  createCustomActionWithContext<{
    req: Request
    res: Response
    host: string
    instance: InstanceFields
  }>(CoreActions.AfterInstanceFound)

export const [doBeforeInstanceStartedAction, onBeforeInstanceStartedAction] =
  createCustomActionWithContext<{ instance: InstanceFields }>(
    CoreActions.BeforeInstanceStarted,
  )

export const [doAfterInstanceStartedAction, onAfterInstanceStartedAction] =
  createCustomActionWithContext<{ instance: InstanceFields; url: string }>(
    CoreActions.AfterInstanceStarted,
  )

export const [doBeforeInstanceStoppedAction, onBeforeInstanceStoppedAction] =
  createCustomActionWithContext<{ instance: InstanceFields; url: string }>(
    CoreActions.BeforeInstanceStopped,
  )

export const [doAfterInstanceStoppedAction, onAfterInstanceStoppedAction] =
  createCustomActionWithContext<{ instance: InstanceFields; url: string }>(
    CoreActions.AfterInstanceStopped,
  )

export const [doServeAction, onServeAction] = createCustomActionWithContext<{
  only: string[]
}>(CoreActions.Serve)
