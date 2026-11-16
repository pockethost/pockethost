import { BROWSER_CLAIM_TOKEN_LENGTH } from '$common/billing/accountClaim'
import { isBillingItemActive } from '$common/billing/billingItems'
import { resolveProviderSku } from '$common/billing/providerMappings'
import { isStripeCheckoutSku } from '$common/billing/stripe'
import { CHECKOUT_PV_IDS } from '$common/lemonSqueezy'
import { mkLog } from '$util/Logger'
import { HandleLemonSqueezyCheckout } from '../../lemon/api/HandleLemonSqueezyCheckout'
import { loadBillingItems } from '../../lemon/lib/billingStore'
import { stripePriceForSku, stripeRequest } from '../lib/stripeApi'

const SITE = `https://pockethost.io`
const ALNUM = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`

/** `stripe` sends new checkouts to Stripe Managed Payments; anything else (or unset) keeps Lemon Squeezy. */
const checkoutProvider = () =>
  `${process.env.BILLING_CHECKOUT_PROVIDER || $os.getenv(`BILLING_CHECKOUT_PROVIDER`) || ''}`.trim().toLowerCase() ===
  `stripe`
    ? `stripe`
    : `lemonsqueezy`

/**
 * An account that still has a live Lemon Squeezy subscription keeps buying on Lemon Squeezy until Lemon Squeezy's
 * migration moves it, so one account is never billed by both for recurring plans.
 */
const hasLiveLsSubscription = (userId: string) => {
  const now = new Date()
  return loadBillingItems($app, userId).some(
    (i) => i.provider === `lemonsqueezy` && i.kind === `subscription` && isBillingItemActive(i, now)
  )
}

const readPvId = (e: core.RequestEvent) => {
  const data = new DynamicModel({ pvId: '' })
  e.bindBody(data)
  return `${JSON.parse(JSON.stringify(data)).pvId || ''}`.trim()
}

/**
 * Start a checkout. The dashboard sends the plan as its Lemon Squeezy pv_id (as before); this picks the provider. Lemon
 * Squeezy: the existing handler, response `{ url, claim? }`. Stripe: a Managed Payments Checkout Session, response `{
 * url, claim?, provider: 'stripe' }`, which the dashboard opens as a page (no overlay).
 */
export const HandleBillingCheckout = (e: core.RequestEvent) => {
  const log = mkLog(`billing-checkout`)
  const authRecord = e.auth

  if (checkoutProvider() !== `stripe` || (authRecord && hasLiveLsSubscription(authRecord.id))) {
    return HandleLemonSqueezyCheckout(e)
  }

  try {
    const pvId = readPvId(e)
    if (!pvId) throw new BadRequestError(`pvId is required`)
    const sku = (CHECKOUT_PV_IDS as readonly string[]).includes(pvId)
      ? resolveProviderSku(`lemonsqueezy`, pvId)
      : undefined
    if (!isStripeCheckoutSku(sku)) throw new BadRequestError(`Unknown plan: ${pvId}`)

    const price = stripePriceForSku(sku)
    const recurring = sku !== `hosting.slot.lifetime`

    // Same pay-first contract as Lemon Squeezy: logged in, the purchase goes to this account; logged out, the webhook
    // creates the account from the checkout email and the browser claims it with `claim`.
    const claim = authRecord ? `` : $security.randomStringWithAlphabet(BROWSER_CLAIM_TOKEN_LENGTH, ALNUM)
    const metadata = authRecord ? { user_id: authRecord.id } : { claim }

    const session = stripeRequest(`POST`, `/checkout/sessions`, {
      mode: recurring ? `subscription` : `payment`,
      managed_payments: { enabled: true },
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: authRecord ? `${SITE}/dashboard?paid=1` : `${SITE}/claim`,
      cancel_url: `${SITE}/pricing`,
      client_reference_id: authRecord ? authRecord.id : undefined,
      customer_email: authRecord ? authRecord.getString(`email`) : undefined,
      metadata,
      subscription_data: recurring ? { metadata } : undefined,
    })

    if (!session?.url) throw new Error(`No checkout URL in Stripe response`)

    log(`stripe checkout created`, authRecord ? authRecord.id : `guest`, sku, session.id)
    return e.json(
      200,
      authRecord ? { url: session.url, provider: `stripe` } : { url: session.url, claim, provider: `stripe` }
    )
  } catch (err) {
    log(`${err}`)
    throw err
  }
}
