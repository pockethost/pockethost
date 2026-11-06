/**
 * Provider-agnostic billing identifiers. Dependency-free so both the JSVM hook bundle and the schema layer can import
 * these types without a cycle.
 */

export type ProductSku =
  | 'hosting.slot.recurring.month.legacy'
  | 'hosting.slot.recurring.month'
  | 'hosting.slot.recurring.year'
  | 'hosting.slot.lifetime.legacy_flounder'
  | 'hosting.slot.lifetime'
  | 'hosting.legacy.unlimited.month'
  | 'hosting.legacy.unlimited.year'
  | 'hosting.legacy.founder.year'
  | 'hosting.legacy.flounder.year'
  | 'hosting.legacy.founder'
  | 'hosting.legacy.legacy'
  | 'hosting.grandfathered.hacker'

/** Account billing state. Not a product tier. */
export type SubscriptionStatus = 'active' | 'lapsed' | 'grandfathered'

export type BillingProvider = 'lemonsqueezy' | 'stripe' | 'manual'

/** Free-form provider references stored on `users.billing_links`. */
export type BillingLinks = {
  grandfathered_hacker?: boolean
  grandfathered_snapshot?: {
    prior_quantity?: number
    prior_instance_count?: number
  }
  lemonsqueezy?: {
    /** Lowercased LS checkout emails that differ from the account email (paired via checkout custom_data.user_id). */
    emails?: string[]
    subscription_id?: string
    customer_id?: string
    variant_id?: string
  }
}
