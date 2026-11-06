import {
  billingItemFromLsOrder,
  isRecurringLsOrder,
  type BillingItem,
  type LsOrderResource,
  type LsSubscriptionResource,
} from '$common/billing/billingItems'
import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { mkNotifier } from '$util/mkNotifier'
import {
  ensureUserBootstrapped,
  findBillingItemRecord,
  reconcileUser,
  rememberLsEmails,
  upsertBillingItem,
  upsertLsSubscription,
} from '../lib/billingStore'
import { lsSubscription, lsSubscriptionsByOrderId } from '../lib/lsApi'

type LsWebhookPayload = {
  meta?: { event_name?: string; custom_data?: { user_id?: string } }
  data?: { id?: string | number; type?: string; attributes?: Record<string, any> }
}

type SaleContext = {
  event_name?: string
  type?: string
  resource_id?: string
  user_id?: string
  user_email?: string
  user_id_source?: 'custom_data' | 'billing_item' | 'email'
  product_name?: string
  variant_name?: string
  quantity?: number
  slots_before?: number
  slots_after?: number
  bootstrapped?: boolean
  stale_event_skipped?: boolean
}

/** Events that post to the lemon_cancel_discord channel. */
const CANCEL_EVENTS = [`subscription_cancelled`, `order_refunded`, `subscription_payment_refunded`]

/**
 * Lemon Squeezy webhook. Every event updates the one billing item it is about (subscription or lifetime order), then
 * the user's slot count is recomputed from all of their billing items. Users may hold any number of subscriptions
 * (PayPal subscriptions cannot change quantity, so adding slots means buying another one) — they are summed, never
 * overwritten.
 */
export const HandleLemonSqueezySale = (e: core.RequestEvent) => {
  const log = mkLog(`ls`)
  const audit = mkAudit(log, $app)
  const context: SaleContext = {}

  try {
    const secret = process.env.LS_WEBHOOK_SECRET
    if (!secret) {
      throw new Error(`No secret`)
    }

    const raw = readerToString(e.request.body)
    const signature = e.request.header.get('X-Signature')
    if (!signature || !$security.equal($security.hs256(raw, secret), signature)) {
      throw new BadRequestError(`Invalid signature`)
    }

    const payload = JSON.parse(raw) as LsWebhookPayload
    log(`payload`, JSON.stringify(payload, null, 2))

    context.event_name = payload.meta?.event_name
    context.type = payload.data?.type
    context.resource_id = `${payload.data?.id ?? ''}`
    const attrs = payload.data?.attributes || {}
    if (!context.event_name || !context.type) {
      throw new Error(`Missing event name or type`)
    }

    /** Resolve the LS subscriptions this event is about, plus a lifetime order item if any. */
    const resolveResources = (): { subscriptions: LsSubscriptionResource[]; order?: BillingItem } => {
      switch (context.type) {
        case `subscriptions`:
          return { subscriptions: [payload.data as LsSubscriptionResource] }
        case `subscription-invoices`:
          return { subscriptions: [lsSubscription(attrs.subscription_id)] }
        case `orders`: {
          const order = payload.data as LsOrderResource
          if (isRecurringLsOrder(order)) {
            // Covers stores where subscription_* webhooks are not enabled yet.
            return { subscriptions: lsSubscriptionsByOrderId(order.id) }
          }
          const item = billingItemFromLsOrder(order)
          if (!item) {
            const i = attrs.first_order_item || {}
            throw new Error(`Product and variant not found: ${i.product_id}-${i.variant_id}`)
          }
          return { subscriptions: [], order: item }
        }
        default:
          return { subscriptions: [] }
      }
    }

    if (![`subscriptions`, `subscription-invoices`, `orders`].includes(context.type)) {
      audit(`LS`, `Ignored unsupported event ${context.event_name} (${context.type}).`, context)
      return e.json(200, { status: `ignored` })
    }

    const { subscriptions, order } = resolveResources()
    const first = subscriptions[0]
    const firstAttrs = (first?.attributes || {}) as Record<string, any>
    context.product_name = order?.product_name || firstAttrs.product_name || attrs.product_name || ``
    context.variant_name = order?.variant_name || firstAttrs.variant_name || attrs.variant_name || ``
    context.quantity =
      order?.quantity || firstAttrs.first_subscription_item?.quantity || attrs.first_order_item?.quantity

    const userRec = (() => {
      const customUserId = payload.meta?.custom_data?.user_id
      if (customUserId) {
        context.user_id_source = `custom_data`
        try {
          return $app.findRecordById(`users`, customUserId)
        } catch {
          throw new Error(`User ${customUserId} not found`)
        }
      }

      const known = first
        ? findBillingItemRecord($app, { provider: `lemonsqueezy`, kind: `subscription`, external_id: `${first.id}` })
        : order && findBillingItemRecord($app, order)
      if (known) {
        context.user_id_source = `billing_item`
        return $app.findRecordById(`users`, known.getString(`user`))
      }

      const email = `${attrs.user_email || firstAttrs.user_email || ''}`.trim()
      if (email) {
        context.user_id_source = `email`
        try {
          return $app.findFirstRecordByData(`users`, `email`, email)
        } catch {
          throw new Error(`No PocketHost user for checkout email ${email}`)
        }
      }
      throw new Error(`No user ID or checkout email`)
    })()
    context.user_id = userRec.id
    context.user_email = userRec.getString(`email`)

    // Customers often check out under a different email. When checkout data (or an existing row) ties this event to
    // the user, remember that LS email so later syncs find their other purchases too.
    if (context.user_id_source !== `email`) {
      rememberLsEmails($app, userRec, [attrs.user_email, firstAttrs.user_email].filter(Boolean))
    }

    context.bootstrapped = ensureUserBootstrapped($app, userRec)

    for (const sub of subscriptions) {
      const { skipped } = upsertLsSubscription($app, userRec.id, sub)
      if (skipped) context.stale_event_skipped = true
    }
    if (order) {
      upsertBillingItem($app, userRec.id, order, { providerData: attrs })
    }

    const { before, after } = reconcileUser($app, userRec)
    context.slots_before = before
    context.slots_after = after

    const notify = mkNotifier(log, $app)
    if (context.event_name === `order_created`) {
      notify(`lemonbot`, `lemon_order_discord`, userRec.id, context)
    } else if (CANCEL_EVENTS.includes(context.event_name)) {
      notify(`lemonbot`, `lemon_cancel_discord`, userRec.id, context)
    }

    audit(`LS`, `${context.event_name}: slots ${before} → ${after}.`, context)
    return e.json(200, { status: 'ok' })
  } catch (err) {
    audit(`LS_ERR`, `${err}`, context)
    return e.json(500, { status: `error`, error: `${err}` })
  }
}
