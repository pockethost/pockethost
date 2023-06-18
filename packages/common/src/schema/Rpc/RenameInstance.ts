import { JSONSchemaType } from 'ajv'
import { InstanceId } from '../types'

export type RenameInstancePayload = {
  instanceId: InstanceId
  subdomain: string
}

export type RenameInstanceResult = {
  status: 'ok' | 'error'
  message?: string
}

export const RENAME_INSTANCE_REGEX = /^[A-Z][A-Z0-9_]*$/

export const RenameInstancePayloadSchema: JSONSchemaType<RenameInstancePayload> =
  {
    type: 'object',
    properties: {
      instanceId: { type: 'string' },
      subdomain: { type: 'string' },
    },
    required: ['instanceId', 'subdomain'],
    additionalProperties: false,
  }
