import { PartialDeep } from 'type-fest'
import { BaseFields } from './types'

export type UserPreferences = {
  isFirstTimeRegistrationCompleted: boolean
}

export type UserFields = BaseFields & {
  email: string
  verified: boolean
  preferences?: PartialDeep<UserPreferences>
}
