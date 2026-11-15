import { client } from '$src/pocketbase-client'
import {
  loyaltyBonus,
  loyaltyProgress,
  type BillingItem,
  type LoyaltyProgress,
  type LoyaltyResult,
} from '@pockethost/server/common'

/** A billing_items record as the API returns it (owner-readable). */
type BillingItemRecord = Omit<BillingItem, 'starts_at'> & { provider_data?: { created_at?: string } | string | null }

const iso = (v?: string) => (v ? v.replace(' ', 'T') : undefined)

const toItem = (r: BillingItemRecord): BillingItem => {
  let data = r.provider_data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      data = null
    }
  }
  const created = data && typeof data === 'object' ? data.created_at : undefined
  return { ...r, starts_at: created ? `${created}` : undefined, ends_at: iso(r.ends_at), renews_at: iso(r.renews_at) }
}

export type LoyaltyStatus = { result: LoyaltyResult; progress: LoyaltyProgress | null }

/** The logged-in account's loyalty status, computed from its billing items. Null if they can't be read. */
export const loadLoyaltyStatus = async (paidInstances: number): Promise<LoyaltyStatus | null> => {
  try {
    const records = await client().client.collection('billing_items').getFullList<BillingItemRecord>()
    const items = records.map(toItem)
    const now = new Date()
    return { result: loyaltyBonus(items, now, paidInstances), progress: loyaltyProgress(items, now, paidInstances) }
  } catch {
    return null
  }
}

export const formatBonusDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
