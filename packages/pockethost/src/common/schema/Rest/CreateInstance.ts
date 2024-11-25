import { JSONSchemaType } from 'ajv'
import { InstanceFields, Subdomain } from '..'

export type CreateInstancePayload = {
  subdomain: Subdomain
  version: string
}

export type CreateInstanceResult = {
  instance: InstanceFields
}

export const CreateInstancePayloadSchema: JSONSchemaType<CreateInstancePayload> =
  {
    type: 'object',
    properties: {
      subdomain: { type: 'string' },
      version: { type: 'string' },
    },
    required: ['subdomain', 'version'],
    additionalProperties: false,
  }
