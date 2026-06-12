/** Subscription plan ids stored on users — keep values in sync with common/schema/User.ts */

export enum SubscriptionType {
  Legacy = 'legacy',
  Free = 'free',
  Premium = 'premium',
  Founder = 'founder',
  Flounder = 'flounder',
}

export const isPaidSubscription = (subscription: SubscriptionType): boolean =>
  subscription === SubscriptionType.Premium ||
  subscription === SubscriptionType.Founder ||
  subscription === SubscriptionType.Flounder ||
  subscription === SubscriptionType.Legacy
