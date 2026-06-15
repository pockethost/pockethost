import type { JSONSchemaType } from 'ajv'
import type { InstanceId } from '..'

export type DeleteInstancePayload = {
  id: InstanceId
}

export type DeleteInstanceResult = {
  status: 'ok' | 'error'
  message?: string
}

export const DeleteInstancePayloadSchema: JSONSchemaType<DeleteInstancePayload> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
  additionalProperties: false,
}
