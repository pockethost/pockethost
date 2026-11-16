import { createHmac, timingSafeEqual } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { reconcileEntitlement } from './billingItems'
import { resolveProviderSku } from './providerMappings'
import {
  billingItemFromStripePayment,
  billingItemFromStripeSubscription,
  invoiceSubscriptionId,
  stripeForm,
  stripeRefundStatus,
  stripeSubscriptionStatus,
  verifyStripeSignature,
  type StripeSubscription,
} from './stripe'

const T0 = 1794860000 // 2026-11-16
const monthPrice = {
  id: 'price_m',
  lookup_key: 'hosting.slot.recurring.month',
  nickname: 'Instance monthly',
  product: { id: 'prod_1', name: 'PocketHost Instance' },
}

const sub = (over: Partial<StripeSubscription> = {}): StripeSubscription => ({
  id: 'sub_1',
  status: 'active',
  created: T0,
  cancel_at_period_end: false,
  cancel_at: null,
  items: { data: [{ quantity: 3, price: monthPrice, current_period_end: T0 + 30 * 86400 }] },
  ...over,
})

describe('stripe billing items', () => {
  it('maps an active subscription by its price lookup key', () => {
    const item = billingItemFromStripeSubscription(sub())!
    expect(item).toMatchObject({
      provider: 'stripe',
      kind: 'subscription',
      external_id: 'sub_1',
      sku: 'hosting.slot.recurring.month',
      quantity: 3,
      status: 'active',
      variant_id: 'price_m',
      product_name: 'PocketHost Instance',
      variant_name: 'Instance monthly',
    })
    expect(item.renews_at).toBe(new Date((T0 + 30 * 86400) * 1000).toISOString())
    expect(item.ends_at).toBeUndefined()
  })

  it('treats cancel-at-period-end as cancelled until the period ends', () => {
    const item = billingItemFromStripeSubscription(sub({ cancel_at_period_end: true }))!
    expect(item.status).toBe('cancelled')
    expect(item.ends_at).toBe(new Date((T0 + 30 * 86400) * 1000).toISOString())
    const now = new Date((T0 + 86400) * 1000)
    expect(reconcileEntitlement([item], now).subscription_quantity).toBe(3)
    const later = new Date((T0 + 31 * 86400) * 1000)
    expect(reconcileEntitlement([item], later).subscription_quantity).toBe(0)
  })

  it('maps Stripe statuses to billing item statuses', () => {
    expect(stripeSubscriptionStatus({ status: 'trialing' })).toBe('on_trial')
    expect(stripeSubscriptionStatus({ status: 'past_due' })).toBe('past_due')
    expect(stripeSubscriptionStatus({ status: 'canceled' })).toBe('expired')
    expect(stripeSubscriptionStatus({ status: 'unpaid' })).toBe('unpaid')
    expect(stripeSubscriptionStatus({ status: 'active', cancel_at: T0 })).toBe('cancelled')
  })

  it('a canceled subscription grants nothing', () => {
    const item = billingItemFromStripeSubscription(sub({ status: 'canceled', ended_at: T0 }))!
    expect(reconcileEntitlement([item], new Date(T0 * 1000)).subscription_quantity).toBe(0)
  })

  it('ignores prices without a known lookup key', () => {
    expect(
      billingItemFromStripeSubscription(
        sub({ items: { data: [{ quantity: 1, price: { id: 'p', lookup_key: 'x' } }] } })
      )
    ).toBeUndefined()
  })

  it('maps a lifetime checkout to an order keyed by its PaymentIntent', () => {
    const item = billingItemFromStripePayment({
      paymentIntentId: 'pi_1',
      created: T0,
      lineItems: [{ quantity: 2, price: { id: 'price_l', lookup_key: 'hosting.slot.lifetime' } }],
    })!
    expect(item).toMatchObject({ provider: 'stripe', kind: 'order', external_id: 'pi_1', quantity: 2, status: 'paid' })
    expect(reconcileEntitlement([item], new Date()).subscription_quantity).toBe(2)
    expect(reconcileEntitlement([{ ...item, status: 'refunded' }], new Date()).subscription_quantity).toBe(0)
    expect(
      billingItemFromStripePayment({ paymentIntentId: 'pi_2', lineItems: [{ quantity: 1, price: monthPrice }] })
    ).toBeUndefined()
  })

  it('refund status', () => {
    expect(stripeRefundStatus({ amount: 100, amount_refunded: 100 })).toBe('refunded')
    expect(stripeRefundStatus({ refunded: true })).toBe('refunded')
    expect(stripeRefundStatus({ amount: 100, amount_refunded: 50 })).toBe('partial_refund')
  })

  it('finds the subscription on new and old invoice shapes', () => {
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: 'sub_a' } } })).toBe('sub_a')
    expect(invoiceSubscriptionId({ subscription: 'sub_b' })).toBe('sub_b')
    expect(invoiceSubscriptionId({})).toBeUndefined()
  })

  it('resolves Stripe SKUs from lookup keys', () => {
    expect(resolveProviderSku('stripe', 'hosting.slot.recurring.year')).toBe('hosting.slot.recurring.year')
    expect(resolveProviderSku('stripe', 'price_123')).toBeUndefined()
  })
})

describe('stripeForm', () => {
  it('encodes nested params', () => {
    expect(
      stripeForm({
        mode: 'subscription',
        managed_payments: { enabled: true },
        line_items: [{ price: 'price_1', quantity: 1 }],
        metadata: { claim: 'a b' },
        skip: undefined,
        expand: ['data.product'],
      })
    ).toBe(
      'mode=subscription&managed_payments%5Benabled%5D=true&line_items%5B0%5D%5Bprice%5D=price_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Bclaim%5D=a%20b&expand%5B0%5D=data.product'
    )
  })
})

describe('verifyStripeSignature', () => {
  const secret = 'whsec_test'
  const raw = '{"id":"evt_1"}'
  const hs256 = (data: string, key: string) => createHmac('sha256', key).update(data).digest('hex')
  const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  const header = (t: number, sig = hs256(`${t}.${raw}`, secret)) => `t=${t},v1=deadbeef,v1=${sig}`

  it('accepts a fresh, correctly signed payload', () => {
    expect(verifyStripeSignature({ header: header(T0), raw, secret, nowSeconds: T0 + 10, hs256, equal })).toBe(true)
  })
  it('rejects a wrong signature, an old timestamp, or a missing header', () => {
    expect(verifyStripeSignature({ header: header(T0, 'bad'), raw, secret, nowSeconds: T0, hs256, equal })).toBe(false)
    expect(verifyStripeSignature({ header: header(T0), raw, secret, nowSeconds: T0 + 301, hs256, equal })).toBe(false)
    expect(verifyStripeSignature({ header: '', raw, secret, nowSeconds: T0, hs256, equal })).toBe(false)
  })
})
