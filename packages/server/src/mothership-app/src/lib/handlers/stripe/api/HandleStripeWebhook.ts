import type { BillingItem } from '$common/billing/billingItems'
import { loyaltyPurchaseEmail, type LoyaltyEmail } from '$common/billing/loyalty'
import {
  billingItemFromStripePayment,
  billingItemFromStripeSubscription,
  invoiceSubscriptionId,
  stripeRefundStatus,
  verifyStripeSignature,
  type StripeSubscription,
} from '$common/billing/stripe'
import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { mkNotifier } from '$util/mkNotifier'
import {
  createBuyerAccount,
  rememberBrowserClaim,
  sendClaimEmail,
  sendPurchaseAddedEmail,
} from '../../lemon/lib/accountClaimStore'
import {
  ensureUserBootstrapped,
  findBillingItemRecord,
  reconcileUser,
  upsertBillingItem,
} from '../../lemon/lib/billingStore'
import { syncLoyalty } from '../../lemon/lib/loyaltyStore'
import { stripeCheckoutLineItems, stripeSubscription } from '../lib/stripeApi'

type StripeEvent = {
  id?: string
  type?: string
  data?: { object?: any }
}

type StripeContext = {
  event_id?: string
  event_name?: string
  resource_id?: string
  user_id?: string
  user_email?: string
  user_id_source?: 'metadata' | 'billing_item' | 'email' | 'create'
  guest_checkout?: boolean
  account_created?: boolean
  product_name?: string
  variant_name?: string
  quantity?: number
  slots_before?: number
  slots_after?: number
  bonus_before?: number
  bonus_after?: number
  bonus_error?: string
}

const lc = (s: unknown) => `${s ?? ''}`.trim().toLowerCase()
const idOf = (v: unknown) => (typeof v === 'string' ? v : (v as any)?.id ? `${(v as any).id}` : '')

/**
 * Stripe (Managed Payments) webhook. Like the Lemon Squeezy one: each event updates the billing item it is about, then
 * the user's instance count is recomputed from all of their billing items. Subscriptions are always re-read from the
 * Stripe API, so events arriving out of order can't roll state back.
 *
 * Events: `checkout.session.completed` (a new purchase: finds or creates the account), `customer.subscription.*` and
 * `invoice.*` (renewals, failed payments, cancellations), `charge.refunded` (lifetime refunds).
 */
export const HandleStripeWebhook = (e: core.RequestEvent) => {
  const log = mkLog(`stripe`)
  const audit = mkAudit(log, $app)
  const context: StripeContext = {}

  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || $os.getenv(`STRIPE_WEBHOOK_SECRET`)
    if (!secret) throw new Error(`No secret`)

    const raw = readerToString(e.request.body)
    const ok = verifyStripeSignature({
      header: e.request.header.get(`Stripe-Signature`),
      raw,
      secret,
      nowSeconds: Math.floor(Date.now() / 1000),
      hs256: (data, key) => $security.hs256(data, key),
      equal: (a, b) => $security.equal(a, b),
    })
    if (!ok) throw new BadRequestError(`Invalid signature`)

    const event = JSON.parse(raw) as StripeEvent
    const obj = event.data?.object || {}
    context.event_id = event.id
    context.event_name = event.type
    context.resource_id = idOf(obj)
    log(`event`, event.type, event.id, context.resource_id)

    /** What this event is about: a subscription to re-read, or a one-time payment. */
    const target = ((): { subscriptionId?: string; session?: any; refundCharge?: any } | undefined => {
      switch (event.type) {
        case `checkout.session.completed`:
        case `checkout.session.async_payment_succeeded`:
          if (obj.payment_status !== `paid` && obj.payment_status !== `no_payment_required`) return undefined
          return obj.mode === `subscription`
            ? { subscriptionId: idOf(obj.subscription), session: obj }
            : { session: obj }
        case `customer.subscription.created`:
        case `customer.subscription.updated`:
        case `customer.subscription.deleted`:
        case `customer.subscription.paused`:
        case `customer.subscription.resumed`:
          return { subscriptionId: obj.id }
        case `invoice.paid`:
        case `invoice.payment_failed`: {
          const subscriptionId = invoiceSubscriptionId(obj)
          return subscriptionId ? { subscriptionId } : undefined
        }
        case `charge.refunded`:
          return obj.payment_intent ? { refundCharge: obj } : undefined
        default:
          return undefined
      }
    })()

    if (!target) {
      audit(`STRIPE`, `Ignored ${event.type}.`, context)
      return e.json(200, { status: `ignored` })
    }

    // The billing item this event writes (built before we know the user, so a known item can name its user).
    let item: BillingItem | undefined
    let providerData: unknown
    if (target.subscriptionId) {
      const sub: StripeSubscription = stripeSubscription(target.subscriptionId)
      item = billingItemFromStripeSubscription(sub)
      if (!item) {
        // Not one of our SKU prices: the 2023 direct-Stripe Founder's subscriptions still renew on this account and
        // aren't billing items. Acknowledge so Stripe doesn't retry.
        audit(`STRIPE`, `Ignored ${event.type}: subscription ${sub.id} has no SKU price.`, context)
        return e.json(200, { status: `ignored` })
      }
      providerData = sub
    } else if (target.session) {
      const paymentIntentId = idOf(target.session.payment_intent)
      if (!paymentIntentId) throw new Error(`Checkout ${target.session.id} has no payment intent`)
      item = billingItemFromStripePayment({
        paymentIntentId,
        created: target.session.created,
        lineItems: stripeCheckoutLineItems(target.session.id),
      })
      if (!item) throw new Error(`No lifetime price on checkout ${target.session.id}`)
      providerData = {
        checkout_session: target.session.id,
        payment_intent: paymentIntentId,
        created: target.session.created,
      }
    } else if (target.refundCharge) {
      const known = findBillingItemRecord($app, {
        provider: `stripe`,
        kind: `order`,
        external_id: idOf(target.refundCharge.payment_intent),
      })
      if (!known) {
        // A refund on a subscription invoice: the subscription events carry what matters.
        audit(`STRIPE`, `Refund on a non-lifetime charge ${target.refundCharge.id}; nothing to update.`, context)
        return e.json(200, { status: `ignored` })
      }
      try {
        providerData = {
          ...JSON.parse(known.getString(`provider_data`) || `{}`),
          refund_charge: target.refundCharge.id,
        }
      } catch {}
      item = {
        provider: `stripe`,
        kind: `order`,
        external_id: known.getString(`external_id`),
        sku: known.getString(`sku`) as BillingItem['sku'],
        quantity: known.getInt(`quantity`),
        status: stripeRefundStatus(target.refundCharge),
        variant_id: known.getString(`variant_id`),
        product_name: known.getString(`product_name`),
        variant_name: known.getString(`variant_name`),
      }
    }
    if (!item) throw new Error(`Nothing to apply for ${event.type}`)
    context.product_name = item.product_name
    context.variant_name = item.variant_name
    context.quantity = item.quantity

    const session = target.session
    const metadata: Record<string, string> = session?.metadata || (providerData as any)?.metadata || {}

    const userRec = (() => {
      const known = findBillingItemRecord($app, item)
      if (known) {
        context.user_id_source = `billing_item`
        return $app.findRecordById(`users`, known.getString(`user`))
      }
      if (metadata.user_id) {
        context.user_id_source = `metadata`
        try {
          return $app.findRecordById(`users`, metadata.user_id)
        } catch {
          throw new Error(`User ${metadata.user_id} not found`)
        }
      }
      // Only a completed checkout may match or create an account; a subscription event for one we haven't seen yet
      // (it can arrive before checkout.session.completed) waits for that event.
      if (!session) return undefined
      const email = `${session.customer_details?.email || session.customer_email || ''}`.trim()
      if (!email) throw new Error(`No user ID or checkout email on ${session.id}`)
      for (const candidate of [...new Set([email, lc(email)])]) {
        try {
          const match = $app.findFirstRecordByData(`users`, `email`, candidate)
          context.user_id_source = `email`
          return match
        } catch {}
      }
      if (!metadata.claim) throw new Error(`No PocketHost user for checkout email ${email}`)
      const { user, created } = createBuyerAccount($app, email, metadata.claim, log)
      context.user_id_source = created ? `create` : `email`
      context.account_created = created
      return user
    })()

    if (!userRec) {
      audit(`STRIPE`, `Skipped ${event.type}: ${context.resource_id} not tied to an account yet.`, context)
      return e.json(200, { status: `ignored` })
    }
    context.user_id = userRec.id
    context.user_email = userRec.getString(`email`)
    context.guest_checkout = !!metadata.claim

    // Keep a non-Stripe baseline and pull existing Lemon Squeezy purchases the first time, so this adds to them.
    ensureUserBootstrapped($app, userRec)
    upsertBillingItem($app, userRec.id, item, { providerData })

    const { before, after } = reconcileUser($app, userRec)
    context.slots_before = before
    context.slots_after = after

    let loyalty: ReturnType<typeof syncLoyalty> | undefined
    try {
      loyalty = syncLoyalty($app, userRec.id)
      context.bonus_before = loyalty.before
      context.bonus_after = loyalty.bonus
    } catch (err) {
      context.bonus_error = `${err}`
      log(`loyalty sync failed`, `${err}`)
    }

    const isNewPurchase = !!session
    const billingEmail = `${session?.customer_details?.email || ''}`.trim()
    if (isNewPurchase) {
      try {
        if (context.account_created && billingEmail) {
          sendClaimEmail($app, userRec, billingEmail, log)
        } else if (metadata.claim && context.user_id_source === `email` && billingEmail) {
          if (userRec.getString(`claim_hash`) !== $security.sha256(`${metadata.claim}`)) {
            rememberBrowserClaim($app, userRec, metadata.claim)
            if (!userRec.getBool(`claim_open`)) sendPurchaseAddedEmail($app, userRec, billingEmail, log)
          }
        }
      } catch (err) {
        log(`claim email failed`, `${err}`)
      }
    }

    const notify = mkNotifier(log, $app)
    if (isNewPurchase) {
      notify(`lemonbot`, `lemon_order_discord`, userRec.id, context)
    } else if (event.type === `customer.subscription.updated` && item.status === `cancelled`) {
      notify(`lemonbot`, `lemon_cancel_discord`, userRec.id, context)
    } else if (event.type === `charge.refunded`) {
      notify(`lemonbot`, `lemon_refund_discord`, userRec.id, context)
    }

    // Loyalty "thanks for buying" email, once per purchase (Stripe may resend the event).
    const sendLoyaltyEmail = (email: LoyaltyEmail | null) => {
      if (!email) return
      try {
        const tpl = $app.findFirstRecordByData(`message_templates`, `slug`, email.template)
        const sent = $app.findRecordsByFilter(
          `notifications`,
          `user = {:user} && message_template = {:tpl} && payload ~ {:ref}`,
          ``,
          1,
          0,
          { user: userRec.id, tpl: tpl.id, ref: `"loyalty_ref":"${email.ref}"` }
        )
        if (!sent.length) notify(`email`, email.template, userRec.id, { ...email.vars, loyalty_ref: email.ref })
      } catch (err) {
        log(`${email.template} email failed`, `${err}`)
      }
    }
    if (loyalty && isNewPurchase) {
      sendLoyaltyEmail(loyaltyPurchaseEmail(loyalty, item.sku, `stripe:${item.kind}:${item.external_id}`))
    }

    const bonusMsg =
      context.bonus_before !== undefined && context.bonus_before !== context.bonus_after
        ? ` Loyalty bonus ${context.bonus_before} → ${context.bonus_after}.`
        : context.bonus_error
          ? ` Loyalty sync failed.`
          : ``
    audit(`STRIPE`, `${event.type}: slots ${before} → ${after}.${bonusMsg}`, context)
    return e.json(200, { status: `ok` })
  } catch (err) {
    audit(`STRIPE_ERR`, `${err}`, context)
    return e.json(500, { status: `error`, error: `${err}` })
  }
}
