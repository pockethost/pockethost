---
name: lemon-squeezy-integration
description: >-
  Full Lemon Squeezy integration — REST API, @lemonsqueezy/lemonsqueezy.js server
  SDK, Lemon.js checkout overlays, webhooks, custom_data, and subscriptions. Use
  when integrating Lemon Squeezy billing, checkout, webhooks, LS API, Lemon.js,
  or subscription provisioning into an application.
---

# Lemon Squeezy Integration

Official docs: https://docs.lemonsqueezy.com/

## Architecture

Three layers — use all three for a production SaaS integration:

| Layer | Tool | Runs on |
|-------|------|---------|
| Checkout UX | Lemon.js + checkout URLs | Browser |
| Admin / dynamic checkout | REST API or `@lemonsqueezy/lemonsqueezy.js` | Server only |
| Provisioning | Webhooks | Server endpoint |

**Never expose `LEMONSQUEEZY_API_KEY` in client code.** The npm SDK is server-only.

**Golden rule:** Webhooks are the source of truth for granting access. Lemon.js `Checkout.Success` is UX-only — do not provision solely from client events.

## Choose an approach

| Need | Use |
|------|-----|
| Static pricing page | Dashboard checkout URLs + optional Lemon.js overlay |
| Per-user checkout with custom data | Append `checkout[custom][user_id]` to URL, or create checkout via API |
| Dynamic pricing / on-demand checkout | Server: `createCheckout` → open URL with Lemon.js |
| Grant/revoke access after payment | Webhook handler |
| Customer billing portal | `subscription.urls.update_payment_method` from API + Lemon.js overlay |

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `LEMONSQUEEZY_API_KEY` | Server API auth ([Settings → API](https://app.lemonsqueezy.com/settings/api)) |
| `LEMONSQUEEZY_STORE_ID` | Store ID for checkout creation |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Verify incoming webhook `X-Signature` |

Use **test mode** keys until production. Docs: https://docs.lemonsqueezy.com/help/getting-started/test-mode

## End-to-end workflow

### 1. Store setup

Create products and variants in the LS dashboard (or sync via API). Record `store_id`, `product_id`, and `variant_id` for each plan.

### 2. Checkout

**Static URL:**

```
https://[STORE].lemonsqueezy.com/checkout/buy/[VARIANT_ID]
```

**With user linking (required for webhook provisioning):**

```
?checkout[custom][user_id]=USER_ID&checkout[email]=user@example.com
```

**Overlay:** Load Lemon.js, add `lemonsqueezy-button` class to links, or call `LemonSqueezy.Url.Open(url)`.

**Dynamic:** Server creates checkout via API/SDK → use `data.attributes.url` from response.

Share `/checkout/buy/` URLs only. Do not share converted `/checkout/?cart=` URLs — they are single-use per customer.

PocketHost uses custom domain URLs like `https://store.pockethost.io/buy/...` — see [pockethost.md](pockethost.md).

### 3. Webhook endpoint

1. Register URL in Settings → Webhooks (or via API)
2. Verify HMAC-SHA256 of the **raw request body** against `X-Signature` header
3. Read `meta.event_name` and `meta.custom_data`
4. Update your database idempotently
5. Return 200 quickly

Key events: `order_created`, `subscription_created`, `subscription_updated`, `subscription_expired`, `subscription_cancelled`, `order_refunded`, `subscription_payment_refunded`

### 4. Persist subscription state

Store at minimum: LS subscription/order `id`, `status`, `variant_id`, `renews_at`, `ends_at`, and your internal plan tier mapping.

On refund/expiry/cancel → revoke or decrement access.

## Common tasks

### Add a new plan

1. Create variant in LS dashboard
2. Add checkout URL to frontend (with `checkout[custom][user_id]`)
3. Add `{product_id}-{variant_id}` to webhook allowlist and product handler map
4. Map variant → internal subscription fields

### Debug a failed webhook

1. Confirm webhook URL and signing secret match env
2. Check LS dashboard webhook log for payload and response
3. Verify signature uses raw body (not re-serialized JSON)
4. Confirm `meta.custom_data.user_id` was passed at checkout
5. Confirm product/variant ID is in your handler allowlist

## Reference files

- [api.md](api.md) — REST API essentials
- [server-sdk.md](server-sdk.md) — `@lemonsqueezy/lemonsqueezy.js`
- [lemonjs.md](lemonjs.md) — browser checkout library
- [webhooks.md](webhooks.md) — verification, events, payload shape
- [integration-checklist.md](integration-checklist.md) — ship checklist
- [pockethost.md](pockethost.md) — PocketHost-specific wiring (this repo)
