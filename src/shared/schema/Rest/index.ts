import Ajv from 'ajv'
import { JsonObject } from 'type-fest'

export enum RestMethods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Delete = 'DELETE',
}

export enum RestCommands {
  Instance = 'instance',
  UserToken = 'userToken',
}

export type RestPayloadBase = JsonObject

export const ajv = new Ajv()

export * from './CreateInstance'
export * from './DeleteInstance'
export * from './GetUserTokenInfo'
export * from './UpdateInstance'
