import { JSONSchemaType } from 'ajv'
import { InstanceId } from '../types'

export type SaveSecretsPayload = {
  instanceId: InstanceId
  secrets: {
    [_: string]: string
  }
}

export type SaveSecretsResult = {
  status: 'ok' | 'error'
  message?: string
}

export const SECRET_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/

export const SaveSecretsPayloadSchema: JSONSchemaType<SaveSecretsPayload> = {
  type: 'object',
  properties: {
    instanceId: { type: 'string' },
    secrets: {
      type: 'object',
      patternProperties: {
        [SECRET_KEY_REGEX.source]: {
          anyOf: [{ type: 'string' }],
        },
      },
      required: [],
    },
  },
  required: ['instanceId', 'secrets'],
  additionalProperties: false,
}
