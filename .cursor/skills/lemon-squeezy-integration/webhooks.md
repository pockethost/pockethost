# Lemon Squeezy Webhooks

Docs: https://docs.lemonsqueezy.com/help/webhooks
Signing: https://docs.lemonsqueezy.com/help/webhooks/signing-requests
Developer guide: https://docs.lemonsqueezy.com/guides/developer-guide/webhooks

## Setup

Webhooks require three things:

1. **Callback URL** — your server endpoint (HTTPS in production)
2. **Signing secret** — random 6–40 char string; you verify against this
3. **Event list** — subscribe only to events you handle

Create in dashboard (Settings → Webhooks) or via API/SDK.

## Request format

```
POST /your/webhook/endpoint
Content-Type: application/json
X-Event-Name: order_created
X-Signature: {hmac_hex_digest}
```

Body is JSON. **Always verify signature against the raw body bytes** — re-serializing parsed JSON will break verification.

## Signature verification (Node.js)

```typescript
import crypto from 'node:crypto'

function verifyWebhook(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false

  const hmac = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8')
  const signature = Buffer.from(signatureHeader, 'utf8')

  if (hmac.length !== signature.length) return false
  return crypto.timingSafeEqual(hmac, signature)
}
```

PocketBase/JSVM equivalent uses `$security.hs256(rawBody, secret)` and `$security.equal()` — see [pockethost.md](pockethost.md).

## Payload structure

```json
{
  "meta": {
    "event_name": "order_created",
    "custom_data": {
      "user_id": "abc123"
    }
  },
  "data": {
    "type": "orders",
    "id": "1",
    "attributes": {
      "product_id": 159790,
      "variant_id": 200788,
      "first_order_item": {
        "product_id": 159790,
        "variant_id": 200788,
        "quantity": 1
      }
    }
  }
}
```

### Key fields

| Path | Use |
|------|-----|
| `meta.event_name` | Route to handler |
| `meta.custom_data` | Your `user_id` / session data from checkout |
| `data.type` | `orders`, `subscriptions`, `license-keys`, etc. |
| `data.id` | LS resource ID — store in your DB |
| `data.attributes.product_id` / `variant_id` | Map to internal plan |
| `data.attributes.first_order_item` | Order line item details (quantity, IDs) |
| `data.attributes.status` | Subscription status |
| `data.attributes.renews_at` / `ends_at` | Billing dates |
| `data.attributes.urls.update_payment_method` | Customer self-service URL |

Custom data from checkout (`checkout[custom][user_id]`) always arrives in `meta.custom_data`.

## Events to handle

Subscribe to what you need. Common SaaS set:

| Event | Typical action |
|-------|----------------|
| `order_created` | Grant access (one-time purchases) |
| `subscription_created` | Grant access, store subscription ID |
| `subscription_updated` | Sync plan changes, payment method updates |
| `subscription_cancelled` | Mark cancelled; access until `ends_at` |
| `subscription_expired` | Revoke access |
| `subscription_payment_success` | Confirm renewal |
| `subscription_payment_failed` | Notify user, grace period logic |
| `subscription_payment_refunded` | Decrement/revoke access |
| `order_refunded` | Revoke access |

For subscriptions, `subscription_created` includes `order_id` — you may not need `order_created` separately.

Full event list: https://docs.lemonsqueezy.com/help/webhooks/event-types

## Handler best practices

1. **Verify signature first** — reject with 400 before parsing
2. **Return 200 quickly** — defer heavy work if needed
3. **Be idempotent** — LS may retry; same event may arrive twice
4. **Log failures** — LS dashboard shows webhook delivery history; you can resend from there
5. **Use custom_data** — always pass `user_id` at checkout to link orders to your users

## Custom data at checkout

URL param:

```
?checkout[custom][user_id]=USER_ID
```

API checkout:

```json
"checkout_data": {
  "custom": { "user_id": "USER_ID" }
}
```

Arrives as:

```json
"meta": { "custom_data": { "user_id": "USER_ID" } }
```

Guide: https://docs.lemonsqueezy.com/guides/developer-guide/taking-payments#passing-custom-data

## What to store in your database

**Orders:** `data.id`, `variant_id`, `status`

**Subscriptions:** `data.id`, `customer_id`, `product_id`, `variant_id`, `status`, `trial_ends_at`, `renews_at`, `ends_at`, `card_brand`, `card_last_four`, `urls.update_payment_method`, `first_subscription_item.id` (usage billing), `first_subscription_item.quantity`
