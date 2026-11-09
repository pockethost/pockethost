import type { JSONSchemaType } from 'ajv'
import type { UserId } from '..'

export type GetUserTokenPayload = {
  id: UserId
}

export type GetUserTokenResult = {
  id: string
  email: string
  tokenKey: string
  passwordHash: string
}

export const GetUserTokenPayloadSchema: JSONSchemaType<GetUserTokenPayload> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
  additionalProperties: false,
}
