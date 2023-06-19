import { clientService } from '$services'
import {
  assertTruthy,
  mkSingleton,
  RpcCommands,
  RpcFields,
  RpcStatus,
  RPC_COMMANDS,
  SingletonBaseConfig,
} from '@pockethost/common'
import { isObject } from '@s-libs/micro-dash'
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv'
import Bottleneck from 'bottleneck'
import { default as knexFactory } from 'knex'
import pocketbaseEs, { ClientResponseError } from 'pocketbase'
import { AsyncReturnType, JsonObject } from 'type-fest'
import { registerRpcCommands } from './commands'

export type RpcServiceApi = AsyncReturnType<typeof rpcService>

export type KnexApi = ReturnType<typeof knexFactory>
export type CommandModuleInitializer = (
  register: RpcServiceApi['registerCommand'],
  client: pocketbaseEs,
  knex: KnexApi
) => void

export type RpcRunner<
  TPayload extends JsonObject,
  TResult extends JsonObject
> = (job: RpcFields<TPayload, TResult>) => Promise<TResult>

export type RpcServiceConfig = SingletonBaseConfig & {}

export const rpcService = mkSingleton(async (config: RpcServiceConfig) => {
  const { logger } = config
  const rpcServiceLogger = logger.create('RpcService')
  const { dbg, error } = rpcServiceLogger
  const { client } = await clientService()

  const limiter = new Bottleneck({ maxConcurrent: 1 })

  const jobHandlers: {
    [_ in RpcCommands]?: {
      validate: ValidateFunction<any>
      run: RpcRunner<any, any>
    }
  } = {}

  const run = async (rpc: RpcFields<any, any>) => {
    await client.setRpcStatus(rpc, RpcStatus.Queued)
    return limiter.schedule(async () => {
      try {
        dbg(`Starting job ${rpc.id} (${rpc.cmd})`, JSON.stringify(rpc))
        await client.setRpcStatus(rpc, RpcStatus.Starting)
        const cmd = (() => {
          const { cmd } = rpc
          if (!RPC_COMMANDS.find((c) => c === cmd)) {
            throw new Error(
              `RPC command '${cmd}' is invalid. It must be one of: ${RPC_COMMANDS.join(
                '|'
              )}.`
            )
          }
          return cmd as RpcCommands
        })()

        const handler = jobHandlers[cmd]
        if (!handler) {
          throw new Error(`RPC handler ${cmd} is not registered`)
        }

        const { payload } = rpc
        assertTruthy(isObject(payload), `Payload must be an object`)

        const { validate, run } = handler
        if (!validate(payload)) {
          throw new Error(
            `Payload for ${cmd} fails validation: ${JSON.stringify(payload)}`
          )
        }
        dbg(`Running RPC ${rpc.id}`, rpc)
        await client.setRpcStatus(rpc, RpcStatus.Running)
        const res = await run(rpc)
        await client.setRpcStatus(rpc, RpcStatus.FinishedSuccess, res)
      } catch (e) {
        if (!(e instanceof Error)) {
          throw new Error(`Expected Error here but got ${typeof e}:${e}`)
        }
        dbg(`RPC failed with`, e)
        await client.rejectRpc(rpc, new ClientResponseError(e)).catch((e) => {
          error(`rpc ${rpc.id} failed to reject with ${e}`)
        })
      }
    })
  }

  dbg(`Starting RPC service...`)

  const initRpcs = async () => {
    dbg(`Initializing RPCs...`)
    await registerRpcCommands(rpcServiceLogger)
    await client.resetRpcs()
    const rpcs = await client.incompleteRpcs()
    rpcs.forEach(run)
  }

  const unsub = await client.onNewRpc(run)

  const shutdown = () => {
    unsub()
  }

  const ajv = new Ajv()

  const registerCommand = <
    TPayload extends JsonObject,
    TResult extends JsonObject
  >(
    commandName: RpcCommands,
    schema: JSONSchemaType<TPayload>,
    runner: RpcRunner<TPayload, TResult>
  ) => {
    if (jobHandlers[commandName]) {
      throw new Error(`${commandName} job handler already registered.`)
    }
    jobHandlers[commandName] = {
      validate: ajv.compile(schema),
      run: runner,
    }
  }

  return {
    registerCommand,
    initRpcs,
    shutdown,
  }
})
