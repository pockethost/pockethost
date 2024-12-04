import { type BaseFields } from './types'

export enum SubscriptionType {
  Legacy = 'legacy',
  Free = 'free',
  Premium = 'premium',
  Founder = 'founder',
  Flounder = 'flounder',
}

export const PLAN_NAMES = {
  [SubscriptionType.Legacy]: 'Legacy',
  [SubscriptionType.Free]: 'Hacker',
  [SubscriptionType.Premium]: `Pro`,
  [SubscriptionType.Founder]: `Founder`,
  [SubscriptionType.Flounder]: `Flounder`,
}

export type UserFields<TExtra = {}> = BaseFields & {
  email: string
  verified: boolean
  isLegacy: boolean
  subscription: SubscriptionType
  isStatsRole: boolean
} & TExtra

export type WithCredentials = {
  tokenKey: string
  passwordHash: string
}

export type UserFields_WithCredentials = UserFields<WithCredentials>
