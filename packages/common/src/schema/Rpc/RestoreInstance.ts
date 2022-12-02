import { JSONSchemaType } from 'ajv'
import { InstanceId, RecordId } from '../types'

export type RestoreInstancePayload = {
  instanceId: InstanceId
  backupId: RecordId
}

export type RestoreInstanceResult = { restoreId: RecordId }

export const RestoreInstancePayloadSchema: JSONSchemaType<RestoreInstancePayload> =
  {
    type: 'object',
    properties: {
      instanceId: { type: 'string' },
      backupId: { type: 'string' },
    },
    required: ['instanceId', 'backupId'],
    additionalProperties: false,
  }
