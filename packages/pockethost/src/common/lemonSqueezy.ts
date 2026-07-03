/** Lemon Squeezy webhook key: `{product_id}-{variant_id}`. */

/** Legacy $5/mo — webhook/back-compat only (disabled in LS checkout). */
export const INSTANCE_MONTHLY_LEGACY_PV_ID = '424532-651625'

/** Legacy $359 Flounder — webhook/back-compat only (disabled in LS checkout). */
export const FLOUNDER_LIFETIME_LEGACY_PV_ID = '424532-651627'

/** Pay Per PocketBase monthly ($9.99/mo). */
export const INSTANCE_MONTHLY_PV_ID = '1192400-1864333'

/** Pay Per PocketBase annual ($59.99/yr). */
export const INSTANCE_ANNUAL_PV_ID = '1192404-1864339'

/** Pay Per PocketBase lifetime ($149.99 per slot). */
export const INSTANCE_LIFETIME_PV_ID = '1192406-1864341'

export const CHECKOUT_PV_IDS = [INSTANCE_MONTHLY_PV_ID, INSTANCE_ANNUAL_PV_ID, INSTANCE_LIFETIME_PV_ID] as const

export const LEMON_SQUEEZY_PV_IDS = [
  ...CHECKOUT_PV_IDS,
  INSTANCE_MONTHLY_LEGACY_PV_ID,
  FLOUNDER_LIFETIME_LEGACY_PV_ID,
] as const

const VARIANT_ID_BY_PV_ID: Record<string, string> = {
  [INSTANCE_MONTHLY_PV_ID]: '1864333',
  [INSTANCE_ANNUAL_PV_ID]: '1864339',
  [INSTANCE_LIFETIME_PV_ID]: '1864341',
  [INSTANCE_MONTHLY_LEGACY_PV_ID]: '651625',
  [FLOUNDER_LIFETIME_LEGACY_PV_ID]: '651627',
}

export const lemonSqueezyVariantId = (pvId: string) => VARIANT_ID_BY_PV_ID[pvId]

/** Monthly variant IDs for cancel lookup (current + legacy subscribers). */
export const MONTHLY_CANCEL_VARIANT_IDS = [
  lemonSqueezyVariantId(INSTANCE_MONTHLY_PV_ID),
  lemonSqueezyVariantId(INSTANCE_MONTHLY_LEGACY_PV_ID),
].filter((id): id is string => !!id)
