import { JSONSchemaType } from 'ajv'
import { InstanceId, Semver } from '../types'

export type UpdateInstancePayload = {
  instanceId: InstanceId
  fields: {
    subdomain?: string
    maintenance?: boolean
    version?: Semver
    secrets?: {
      [_: string]: string
    }
  }
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
      instanceId: { type: 'string' },
      fields: {
        type: 'object',
        properties: {
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
        },
      },
    },
    required: ['instanceId', 'fields'],
    additionalProperties: false,
  }
