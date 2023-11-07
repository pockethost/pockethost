import Ajv from 'ajv'
import { JsonObject } from 'type-fest'

export enum RestMethods {
  Create = 'POST',
  Update = 'PUT',
}

export enum RestCommands {
  Instance = 'instance',
}

export type RestPayloadBase = JsonObject

export const ajv = new Ajv()

export * from './CreateInstance'
export * from './UpdateInstance'
// gen:export
