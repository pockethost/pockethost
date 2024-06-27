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

export type UserFields = BaseFields & {
  email: string
  verified: boolean
  isLegacy: boolean
  isFounder: boolean
  subscription: SubscriptionType
  notifyMaintenanceMode: boolean
}

export type InstanceFieldExtensions = {
  uid: UserId
  status: InstanceStatus
  maintenance: boolean
  suspension: string
  syncAdmin: boolean
  cname: string
  dev: boolean
  cname_active: boolean
  notifyMaintenanceMode: boolean
}

export type WithUser = {
  expand: { uid: UserFields }
}

export type InstanceFields_WithUser = InstanceFields & WithUser

export type InstanceFields_Create = Omit<InstanceFields, keyof BaseFields>

export type InstanceRecordsById = { [_: RecordId]: InstanceFields }
