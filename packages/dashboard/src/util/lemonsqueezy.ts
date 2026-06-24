import { client } from '$src/pocketbase-client'
import { ClientResponseError } from 'pockethost/common'
export { FLOUNDER_LIFETIME_PV_ID, INSTANCE_MONTHLY_PV_ID } from 'pockethost/common'

export const createLemonSqueezyCheckout = async (pvId: string) => {
  try {
    const { url } = await client().client.send<{ url: string }>(`/api/ls/checkout`, {
      method: 'POST',
      body: { pvId },
    })
    return url
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
    return await client().client.send<CancelMembershipResult>(`/api/ls/cancel`, {
      method: 'POST',
    })
  } catch (err) {
    if (err instanceof ClientResponseError) {
      throw new Error(err.response?.message || err.message)
    }
    throw err
  }
}
