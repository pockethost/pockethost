import {
  STRIPE_API_VERSION,
  stripeForm,
  type StripeLineItem,
  type StripePrice,
  type StripeSubscription,
} from '$common/billing/stripe'
import type { ProductSku } from '$common/billing/types'

/** Overridable for local testing against a mock; production uses the real API. */
const STRIPE_API = process.env.STRIPE_API_BASE || `https://api.stripe.com/v1`

export const stripeSecretKey = () => {
  const key = process.env.STRIPE_SECRET_KEY || $os.getenv(`STRIPE_SECRET_KEY`)
  if (!key) {
    throw new BadRequestError(`Stripe is not configured (set STRIPE_SECRET_KEY on mothership)`)
  }
  return key
}

/** One Stripe API call. GET params go in the query string, POST params as a form body. */
export const stripeRequest = (
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  params: Record<string, unknown> = {}
) => {
  const form = stripeForm(params)
  const url = `${STRIPE_API}${path}${method === 'GET' && form ? `${path.includes('?') ? '&' : '?'}${form}` : ''}`
  const res = $http.send({
    url,
    method,
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      'Stripe-Version': STRIPE_API_VERSION,
      'Content-Type': `application/x-www-form-urlencoded`,
    },
    body: method === 'GET' ? '' : form,
    timeout: 30,
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const detail = res.json?.error?.message || JSON.stringify(res.json)
    throw new BadRequestError(`Stripe ${method} ${path} failed (${res.statusCode}): ${detail}`)
  }
  return res.json
}

/** The active price for a SKU (its lookup key), with its product. */
export const stripePriceForSku = (sku: ProductSku): StripePrice & { type?: string } => {
  const json = stripeRequest(`GET`, `/prices`, { lookup_keys: [sku], active: true, expand: [`data.product`] })
  const price = json?.data?.[0]
  if (!price) throw new BadRequestError(`No active Stripe price with lookup key ${sku}`)
  return price
}

/** A subscription with each item's price and product, as billing items need it. */
export const stripeSubscription = (id: string): StripeSubscription =>
  stripeRequest(`GET`, `/subscriptions/${encodeURIComponent(id)}`, { expand: [`items.data.price.product`] })

export const stripeCheckoutSession = (id: string) =>
  stripeRequest(`GET`, `/checkout/sessions/${encodeURIComponent(id)}`)

export const stripeCheckoutLineItems = (sessionId: string): StripeLineItem[] =>
  stripeRequest(`GET`, `/checkout/sessions/${encodeURIComponent(sessionId)}/line_items`, {
    limit: 100,
    expand: [`data.price.product`],
  })?.data || []

/** Cancel at period end (the customer keeps access until then). Returns the updated subscription. */
export const stripeCancelSubscription = (id: string): StripeSubscription => {
  stripeRequest(`POST`, `/subscriptions/${encodeURIComponent(id)}`, { cancel_at_period_end: true })
  return stripeSubscription(id)
}
