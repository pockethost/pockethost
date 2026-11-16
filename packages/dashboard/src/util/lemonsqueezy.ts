import { client } from '$src/pocketbase-client'
import { ClientResponseError } from '@pockethost/server/common'
export { INSTANCE_ANNUAL_PV_ID, INSTANCE_LIFETIME_PV_ID, INSTANCE_MONTHLY_PV_ID } from '@pockethost/server/common'

/**
 * Start a checkout on the mothership, which picks the provider (Lemon Squeezy or Stripe). Logged out (pay-first), the
 * response also carries `claim`: the token that claims the account the sale creates. `provider` is `stripe` for a
 * Stripe checkout (a page, not an overlay).
 */
export const createLemonSqueezyCheckout = async (pvId: string) => {
  try {
    return await client().client.send<{ url: string; claim?: string; provider?: 'stripe' }>(`/api/billing/checkout`, {
      method: 'POST',
      body: { pvId },
    })
  } catch (err) {
    if (err instanceof ClientResponseError) {
      throw new Error(err.response?.message || err.message)
    }
    throw err
  }
}

export type CancelMembershipResult = {
  status: string
  endsAt: string | null
}

export const cancelLemonSqueezyMembership = async () => {
  try {
    return await client().client.send<CancelMembershipResult>(`/api/billing/cancel`, {
      method: 'POST',
    })
  } catch (err) {
    if (err instanceof ClientResponseError) {
      throw new Error(err.response?.message || err.message)
    }
    throw err
  }
}
