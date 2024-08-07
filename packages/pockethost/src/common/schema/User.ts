import { BaseFields } from './types'

export enum SubscriptionType {
  Legacy = 'legacy',
  Free = 'free',
  Premium = 'premium',
  Lifetime = 'lifetime',
}

export const PLAN_NAMES = {
  [SubscriptionType.Legacy]: 'Legacy',
  [SubscriptionType.Free]: 'Hacker',
  [SubscriptionType.Premium]: `Pro`,
  [SubscriptionType.Lifetime]: `Founder's Edition`,
}

export type UserFields<TExtra = {}> = BaseFields & {
  email: string
  verified: boolean
  isLegacy: boolean
  isFounder: boolean
  subscription: SubscriptionType
  notifyMaintenanceMode: boolean
} & TExtra

export type WithCredentials = {
  tokenKey: string
  passwordHash: string
}

export type UserFields_WithCredentials = UserFields<WithCredentials>
