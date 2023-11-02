import { JSONSchemaType } from 'ajv'
import { InstanceFields } from '../Instance'
import { Subdomain } from '../types'

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
