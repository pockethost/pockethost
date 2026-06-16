export const FLOUNDER_CHECKOUT_VARIANT_ID = 'd4b2d062-429c-49b4-9cdc-853aaeb17e20'

export const lemonsqueezyCheckoutUrl = (variantId: string, userId: string, email: string) => {
  const params = [
    `checkout[custom][user_id]=${encodeURIComponent(userId)}`,
    `checkout[email]=${encodeURIComponent(email)}`,
  ].join('&')
  return `https://store.pockethost.io/buy/${variantId}?${params}`
}
