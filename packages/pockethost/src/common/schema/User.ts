import type { BillingLinks, BillingProvider, ProductSku, SubscriptionStatus } from '../billing/types'
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
  [SubscriptionType.Free]: 'Hacker', // legacy DB enum only — not a product tier
  [SubscriptionType.Premium]: `Pay Per PocketBase`,
  [SubscriptionType.Founder]: `Founder`,
  [SubscriptionType.Flounder]: `Flounder`,
}

export enum SubscriptionInterval {
  Month = 'month',
  Year = 'year',
  Life = 'life',
}

export type UserFields<TExtra = {}> = BaseFields & {
  email: string
  verified: boolean
  isLegacy: boolean
  subscription: SubscriptionType
  subscription_interval: SubscriptionInterval
  subscription_quantity: number
  /** Internal product catalog id. Empty until backfilled / first billing event. */
  product_sku?: ProductSku | ''
  /** Account billing state (not a product tier). */
  subscription_status?: SubscriptionStatus | ''
  /** Provider references (LS subscription/customer ids, grandfathered flags). */
  billing_links?: BillingLinks | null
  /** Active billing provider; set on first LS match, admin-set for holdouts. */
  billing_provider?: BillingProvider | ''
  /** Bytes used on the edge primary volume (sqlite, hooks, static). */
  volume_storage_used: number
  /** Bytes used for PocketBase file/object storage. */
  object_storage_used: number
  /** Account-level IPs trusted for higher firewall rate limits. */
  trusted_ips?: string[] | null
  suspension: string
} & TExtra

export type WithCredentials = {
  tokenKey: string
  passwordHash: string
}

export type UserFields_WithCredentials = UserFields<WithCredentials>
