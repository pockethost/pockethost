import {
  CHECKOUT_PV_IDS,
  INSTANCE_ANNUAL_PV_ID,
  INSTANCE_LIFETIME_PV_ID,
  INSTANCE_MONTHLY_PV_ID,
} from 'pockethost/common'

export const CHECKOUT_INTENT_PARAM = 'pvId'

const MONTHLY_PRICE = 9.99
const ANNUAL_PRICE = 59.99
const monthlyYearTotal = MONTHLY_PRICE * 12
const annualSavings = Math.round((monthlyYearTotal - ANNUAL_PRICE) * 100) / 100
const annualSavingsPercent = Math.round((annualSavings / monthlyYearTotal) * 100)

export const isCheckoutPvId = (pvId: string): boolean => (CHECKOUT_PV_IDS as readonly string[]).includes(pvId)

export const planLabelForPvId = (pvId: string): string => {
  switch (pvId) {
    case INSTANCE_MONTHLY_PV_ID:
      return 'Monthly: $9.99/mo per slot'
    case INSTANCE_ANNUAL_PV_ID:
      return `Annual: $59.99/yr per slot (save ~${annualSavingsPercent}% vs monthly)`
    case INSTANCE_LIFETIME_PV_ID:
      return 'Lifetime: $149.99 per slot'
    default:
      return 'Pay Per PocketBase'
  }
}

export const checkoutIntentUrl = (pvId: string) => `/get-started?${CHECKOUT_INTENT_PARAM}=${encodeURIComponent(pvId)}`

export const readCheckoutPvIdFromSearch = (search: string): string => {
  const pvId = new URLSearchParams(search).get(CHECKOUT_INTENT_PARAM)?.trim() ?? ''
  return pvId && isCheckoutPvId(pvId) ? pvId : ''
}
