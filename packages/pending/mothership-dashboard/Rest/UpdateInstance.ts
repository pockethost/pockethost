import { JSONSchemaType } from 'ajv'
import { InstanceFields, InstanceId } from '..'

export type UpdateInstancePayload = {
  id: InstanceId
  fields: Partial<
    Pick<
      InstanceFields,
      | 'maintenance'
      | 'secrets'
      | 'subdomain'
      | 'syncAdmin'
      | 'version'
      | 'dev'
      | 'cname'
      | 'notifyMaintenanceMode'
    >
  >
}

export const SECRET_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/

export type UpdateInstanceResult = {
  status: 'ok' | 'error'
  message?: string
}

export const UpdateInstancePayloadSchema: JSONSchemaType<UpdateInstancePayload> =
  {
    type: 'object',
    properties: {
      id: { type: 'string' },
      fields: {
        type: 'object',
        properties: {
          syncAdmin: { type: 'boolean', nullable: true },
          subdomain: { type: 'string', nullable: true },
          maintenance: { type: 'boolean', nullable: true },
          version: {
            type: 'string',
            nullable: true,
          },
          secrets: {
            type: 'object',
            nullable: true,
            patternProperties: {
              [SECRET_KEY_REGEX.source]: {
                anyOf: [{ type: 'string' }],
              },
            },
            required: [],
          },
          dev: { type: 'boolean', nullable: true },
          cname: { type: 'string', nullable: true },
          notifyMaintenanceMode: { type: 'boolean', nullable: true },
        },
      },
    },
    required: ['id', 'fields'],
    additionalProperties: false,
  }
