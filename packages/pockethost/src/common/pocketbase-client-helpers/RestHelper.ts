import Ajv, { JSONSchemaType } from 'ajv'
import type { JsonObject } from 'type-fest'
import { LoggerService, PocketBase, RestCommands, RestMethods } from '..'

export type RestHelperConfig = {
  client: PocketBase
}

export type RestHelper = ReturnType<typeof createRestHelper>

export const createRestHelper = (config: RestHelperConfig) => {
  const _logger = LoggerService().create(`RestHelper`)
  const { client } = config

  const mkRest = <TPayload extends JsonObject, TResult extends JsonObject>(
    cmd: RestCommands,
    method: RestMethods,
    schema: JSONSchemaType<TPayload>
  ) => {
    const validator = new Ajv().compile(schema)
    return async (payload: TPayload): Promise<TResult> => {
      const _restCallLogger = _logger.create(cmd)
      const { dbg, error } = _restCallLogger

      dbg(`Executing REST call`)
      if (!validator(payload)) {
        throw new Error(`Invalid REST payload: ${validator.errors}`)
      }
      const _payload = { ...payload }

      const url = `/api/${cmd}${method === RestMethods.Post ? '' : '/:id'}`.replace(/:([a-zA-Z]+)/g, (_, key) => {
        if (!(key in _payload)) {
          throw new Error(`Payload must include '${key}`)
        }
        const value = _payload[key]!
        delete _payload[key]
        return encodeURIComponent(value.toString())
      })

      const options: any = {
        method: method,
      }

      if (method !== RestMethods.Get) {
        options.body = _payload
      }

      dbg({ url, options })

      const res = await client.send(url, options)
      dbg(res)
      return res
    }
  }

  return { mkRest }
}
