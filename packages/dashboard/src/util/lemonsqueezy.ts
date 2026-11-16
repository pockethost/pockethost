import { client } from '$src/pocketbase-client'
import { ClientResponseError } from '@pockethost/server/common'
export { INSTANCE_ANNUAL_PV_ID, INSTANCE_LIFETIME_PV_ID, INSTANCE_MONTHLY_PV_ID } from '@pockethost/server/common'

/**
 * POST to the mothership's provider-neutral billing route, or to the older Lemon Squeezy route when the mothership
 * doesn't have the new one yet (404). The dashboard deploys on every push to main, possibly before the mothership, so
 * checkout and cancel keep working in between.
 */
const sendBilling = async <T>(path: string, legacyPath: string, body?: Record<string, unknown>) => {
  const send = (p: string) => client().client.send<T>(p, { method: 'POST', body })
  try {
    try {
      return await send(path)
    } catch (err) {
      if (err instanceof ClientResponseError && err.status === 404) return await send(legacyPath)
      throw err
    }
  } catch (err) {
    if (err instanceof ClientResponseError) {
      throw new Error(err.response?.message || err.message)
    }
    throw err
  }
}

/**
 * Start a checkout on the mothership, which picks the provider (Lemon Squeezy or Stripe). Logged out (pay-first), the
 * response also carries `claim`: the token that claims the account the sale creates. `provider` is `stripe` for a
 * Stripe checkout (a page, not an overlay).
 */
export const createLemonSqueezyCheckout = (pvId: string) =>
  sendBilling<{ url: string; claim?: string; provider?: 'stripe' }>(`/api/billing/checkout`, `/api/ls/checkout`, {
    pvId,
  })

export type CancelMembershipResult = {
  status: string
  endsAt: string | null
}

export const cancelLemonSqueezyMembership = () =>
  sendBilling<CancelMembershipResult>(`/api/billing/cancel`, `/api/ls/cancel`)
