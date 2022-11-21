import { JSONSchemaType } from 'ajv'
import { InstanceId, RecordId } from '../types'

export type BackupInstancePayload = {
  instanceId: InstanceId
}

export const BackupInstancePayloadSchema: JSONSchemaType<BackupInstancePayload> =
  {
    type: 'object',
    properties: {
      instanceId: { type: 'string' },
    },
    required: ['instanceId'],
    additionalProperties: false,
  }

export type BackupInstanceResult = { backupId: RecordId }
