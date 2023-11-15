import Ajv, { JSONSchemaType } from 'ajv'
import type pocketbaseEs from 'pocketbase'
import type { JsonObject } from 'type-fest'
import { LoggerService } from '../Logger'
import { RestCommands, RestMethods } from '../schema'

export type RestHelperConfig = {
  client: pocketbaseEs
}

export type RestHelper = ReturnType<typeof createRestHelper>

export const createRestHelper = (config: RestHelperConfig) => {
  const _logger = LoggerService().create(`RestHelper`)
  const { client } = config

  const mkRest = <TPayload extends JsonObject, TResult extends JsonObject>(
    cmd: RestCommands,
    method: RestMethods,
    schema: JSONSchemaType<TPayload>,
  ) => {
    const validator = new Ajv().compile(schema)
    return async (payload: TPayload): Promise<TResult> => {
      const _restCallLogger = _logger.create(cmd)
      const { dbg, error } = _restCallLogger

      dbg(`Executing REST call`)
      if (!validator(payload)) {
        throw new Error(`Invalid REST payload: ${validator.errors}`)
      }

      const res = await client.send(`/api/${cmd}`, {
        method: method,
        body: payload,
      })
      dbg(res)
      return res
    }
  }

  return { mkRest }
}
