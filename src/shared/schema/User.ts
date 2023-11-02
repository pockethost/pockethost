import { BaseFields } from './types'

export type UserFields = BaseFields & {
  email: string
  verified: boolean
}
