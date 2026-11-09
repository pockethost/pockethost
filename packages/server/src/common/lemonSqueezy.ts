/** Lemon Squeezy webhook key: `{product_id}-{variant_id}`. */

/** Legacy $5/mo — webhook/back-compat only (disabled in LS checkout). */
export const INSTANCE_MONTHLY_LEGACY_PV_ID = '424532-651625'

/** Legacy $359 Flounder — webhook/back-compat only (disabled in LS checkout). */
export const FLOUNDER_LIFETIME_LEGACY_PV_ID = '424532-651627'

/**
 * Retired LS products — webhook/reconcile only, never sold again. Ids recovered from git history and the mothership
 * audit table (2026-11-06).
 */
/** "idkfa" — 2026 Paywall Pro monthly (250 slots). */
export const LEGACY_PAYWALL_PRO_MONTHLY_PV_ID = '424532-651629'
/** 2026 Paywall Pro annual (250 slots). */
export const LEGACY_PAYWALL_PRO_ANNUAL_PV_ID = '424532-651634'
/** 2023 PocketHost Pro monthly. */
export const LEGACY_PRO_MONTHLY_PV_ID = '159790-200788'
/** 2023 PocketHost Pro annual. */
export const LEGACY_PRO_ANNUAL_PV_ID = '159791-200789'
/** 2023 Founder's Edition annual. */
export const LEGACY_FOUNDER_ANNUAL_PV_ID = '159792-200790'
/** 2023 Flounder's Edition annual. */
export const LEGACY_FLOUNDER_ANNUAL_PV_ID = '367781-547858'
/** 2023 Flounder's Edition lifetime (same 250-slot lifetime as the later "iddqd" variant). */
export const LEGACY_FLOUNDER_LIFETIME_2023_PV_ID = '306534-441845'

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
