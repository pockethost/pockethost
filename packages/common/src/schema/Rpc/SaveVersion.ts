import { JSONSchemaType } from 'ajv'
import { InstanceId, Semver } from '../types'

export type SaveVersionPayload = {
  instanceId: InstanceId
  version: Semver
}

export type SaveVersionResult = {
  status: 'ok' | 'error'
  message?: string
}

export const SaveVersionPayloadSchema: JSONSchemaType<SaveVersionPayload> = {
  type: 'object',
  properties: {
    instanceId: { type: 'string' },
    version: {
      type: 'string',
    },
  },
  required: ['instanceId', 'version'],
  additionalProperties: false,
}
