import { JSONSchemaType } from 'ajv'
import { InstanceId } from '../types'

export type SetInstanceMaintenancePayload = {
  instanceId: InstanceId
  maintenance: boolean
}

export type SetInstanceMaintenanceResult = {}

export const SetInstanceMaintenancePayloadSchema: JSONSchemaType<SetInstanceMaintenancePayload> =
  {
    type: 'object',
    properties: {
      instanceId: { type: 'string' },
      maintenance: { type: 'boolean' },
    },
    required: ['instanceId', 'maintenance'],
    additionalProperties: false,
  }
