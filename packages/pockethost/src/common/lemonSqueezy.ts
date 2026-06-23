/** Lemon Squeezy webhook key: `{product_id}-{variant_id}`. */
export const FLOUNDER_LIFETIME_PV_ID = '424532-651627'
export const INSTANCE_MONTHLY_PV_ID = '424532-651625'

export const LEMON_SQUEEZY_PV_IDS = [FLOUNDER_LIFETIME_PV_ID, INSTANCE_MONTHLY_PV_ID] as const

const VARIANT_ID_BY_PV_ID: Record<string, string> = {
  [FLOUNDER_LIFETIME_PV_ID]: '651627',
  [INSTANCE_MONTHLY_PV_ID]: '651625',
}

export const lemonSqueezyVariantId = (pvId: string) => VARIANT_ID_BY_PV_ID[pvId]
