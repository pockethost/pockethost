import Ajv from 'ajv'
import { JsonObject } from 'type-fest'

export enum RestMethods {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
}

export enum RestCommands {
  Instance = 'instance',
  UserToken = 'userToken',
}

export type RestPayloadBase = JsonObject

export const ajv = new Ajv()

export * from './CreateInstance'
export * from './GetUserTokenInfo'
export * from './UpdateInstance'
