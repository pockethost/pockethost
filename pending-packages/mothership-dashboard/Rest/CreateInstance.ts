import { JSONSchemaType } from 'ajv'
import { InstanceFields, Subdomain } from '..'

export type CreateInstancePayload = {
  subdomain: Subdomain
}

export type CreateInstanceResult = {
  instance: InstanceFields
}

export const CreateInstancePayloadSchema: JSONSchemaType<CreateInstancePayload> =
  {
    type: 'object',
    properties: {
      subdomain: { type: 'string' },
    },
    required: ['subdomain'],
    additionalProperties: false,
  }
