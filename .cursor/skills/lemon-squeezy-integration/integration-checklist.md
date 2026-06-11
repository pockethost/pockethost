# Lemon Squeezy Integration Checklist

Copy and track when integrating LS into a new app or adding a new plan.

## Store & products

- [ ] LS account created; store configured
- [ ] Products and variants created for each plan tier
- [ ] Test mode enabled for development
- [ ] Documented: `store_id`, `product_id`, `variant_id` per plan

## Environment

- [ ] `LEMONSQUEEZY_API_KEY` set (test mode for dev)
- [ ] `LEMONSQUEEZY_STORE_ID` set
- [ ] `LEMONSQUEEZY_WEBHOOK_SECRET` set
- [ ] Secrets not committed to git

## Checkout (client)

- [ ] Checkout URLs use `/checkout/buy/` format (not cart URLs)
- [ ] `checkout[custom][user_id]` passed for logged-in users
- [ ] `checkout[email]` pre-filled where applicable
- [ ] Lemon.js loaded from official CDN if using overlay
- [ ] `lemonsqueezy-button` class or `LemonSqueezy.Url.Open()` wired up
- [ ] Unauthenticated users redirected to login before checkout (if required)

## Checkout (server, if dynamic)

- [ ] `@lemonsqueezy/lemonsqueezy.js` installed server-side only
- [ ] `lemonSqueezySetup()` called before API calls
- [ ] `createCheckout` passes `checkoutData.custom.user_id`
- [ ] Checkout URL returned to client securely

## Webhooks (server)

- [ ] Webhook endpoint registered in LS dashboard
- [ ] Signing secret matches env var
- [ ] Signature verified on raw body before JSON parse
- [ ] Handlers for: create, update, cancel, refund, expire (as needed)
- [ ] `meta.custom_data.user_id` used to find user record
- [ ] Product/variant ID mapped to internal plan tier
- [ ] Handler is idempotent
- [ ] Returns 200 on success; errors logged for debugging
- [ ] Audit/logging in place for `LS` / `LS_ERR` events

## Database

- [ ] User/subscription fields defined (`subscription`, `interval`, `quantity`, etc.)
- [ ] LS subscription/order IDs stored for future API lookups
- [ ] Cancel/refund decrements or revokes access correctly

## Billing portal

- [ ] "Manage subscription" link (LS customer portal or `update_payment_method` URL)
- [ ] Payment method update opens via Lemon.js overlay (optional)

## Production

- [ ] Live-mode API key created and swapped in production env
- [ ] Webhook URL uses HTTPS
- [ ] Webhook re-registered or secret confirmed for production store
- [ ] Test purchase in live mode with small amount
- [ ] Verify webhook fires and provisions correctly

## PocketHost-specific

If working in this repo, also complete items in [pockethost.md](pockethost.md).
