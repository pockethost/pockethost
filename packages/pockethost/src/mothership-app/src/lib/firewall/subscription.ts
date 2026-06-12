/** Subscription plan ids stored on users — keep values in sync with common/schema/User.ts */

export enum SubscriptionType {
  Legacy = 'legacy',
  Free = 'free',
  Premium = 'premium',
  Founder = 'founder',
  Flounder = 'flounder',
}

export const TRUSTED_IPS_PRO_LEGACY_MAX = 5
export const TRUSTED_IPS_FOUNDER_FLOUNDER_MAX = 20

export const isFounderFlounderSubscription = (subscription: SubscriptionType): boolean =>
  subscription === SubscriptionType.Founder || subscription === SubscriptionType.Flounder

export const isProLegacySubscription = (subscription: SubscriptionType): boolean =>
  subscription === SubscriptionType.Premium || subscription === SubscriptionType.Legacy

export const isPaidSubscription = (subscription: SubscriptionType): boolean =>
  isProLegacySubscription(subscription) || isFounderFlounderSubscription(subscription)

export const getTrustedIpsMax = (subscription: SubscriptionType): number =>
  isFounderFlounderSubscription(subscription)
    ? TRUSTED_IPS_FOUNDER_FLOUNDER_MAX
    : TRUSTED_IPS_PRO_LEGACY_MAX
