# PocketHost Lemon Squeezy Wiring

Repo-specific integration points. Generic LS docs are in the other reference files.

## File map

| Concern | Path |
|---------|------|
| Product ids | `packages/pockethost/src/common/lemonSqueezy.ts` |
| Checkout API | `packages/pockethost/src/mothership-app/src/lib/handlers/lemon/api/HandleLemonSqueezyCheckout.ts` |
| Cancel API | `packages/pockethost/src/mothership-app/src/lib/handlers/lemon/api/HandleLemonSqueezyCancel.ts` |
| Webhook handler | `packages/pockethost/src/mothership-app/src/lib/handlers/lemon/api/HandleLemonSqueezySale.ts` |
| Route registration | `packages/pockethost/src/mothership-app/src/lib/handlers/lemon/hooks.ts` |
| Env constants | `packages/pockethost/src/constants.ts` → `LS_WEBHOOK_SECRET`, `LS_API_KEY`, `LS_STORE_ID` |
| Dashboard checkout client | `packages/dashboard/src/util/lemonsqueezy.ts` |
| Signup/pricing CTAs | `packages/dashboard/src/routes/(static)/pricing/SignupBox.svelte`, `CTAButton.svelte` |
| Billing portal link | `packages/dashboard/src/routes/(app)/account/+page.svelte` |

## Webhook endpoint

```
POST /api/ls
```

## Checkout endpoint (auth required)

```
POST /api/ls/checkout
```

Body: `{ "pvId": "424532-651625" }` (see `common/lemonSqueezy.ts`). Returns `{ "url": "..." }` from Lemon Squeezy API.

## Cancel endpoint (auth required)

```
POST /api/ls/cancel
```

Cancels the authenticated user's active Pro monthly Lemon Squeezy subscription. Looks up subscription by account email + instance-monthly variant, then `DELETE /subscriptions/{id}`. Returns `{ "status": "cancelled", "endsAt": "..." }`. PocketBase plan fields update on `subscription_expired` webhook (access continues until period end). Dashboard: `/account/cancel`.

Registered in `hooks.ts`:

```typescript
routerAdd('POST', '/api/ls/checkout', (e) => {
  return require(`${__hooks}/mothership`).HandleLemonSqueezyCheckout(e)
}, $apis.requireAuth())

routerAdd('POST', '/api/ls/cancel', (e) => {
  return require(`${__hooks}/mothership`).HandleLemonSqueezyCancel(e)
}, $apis.requireAuth())

routerAdd('POST', '/api/ls', (c) => {
  return require(`${__hooks}/mothership`).HandleLemonSqueezySale(c)
})
```

## Environment

| Variable | Purpose |
|----------|---------|
| `LS_WEBHOOK_SECRET` | Webhook HMAC signing secret |
| `LS_API_KEY` | Lemon Squeezy API key (checkout creation) |
| `LS_STORE_ID` | Lemon Squeezy store id |

## Signature verification

Uses PocketBase JSVM security helpers (not Node crypto):

```typescript
context.raw = readerToString(c.request().body)
context.body_hash = $security.hs256(context.raw, context.secret)
context.xsignature_header = c.request().header.get('X-Signature')

if (!$security.equal(context.body_hash, context.xsignature_header)) {
  throw new BadRequestError('Invalid signature')
}
```

## Events handled

| Event | Action |
|-------|--------|
| `order_created` | Provision subscription (`signup_finalizer`) |
| `order_refunded` | Cancel/decrement (`signup_canceller`) |
| `subscription_cancelled` | Audit only (access until `ends_at`) |
| `subscription_expired` | Cancel/decrement |
| `subscription_payment_refunded` | Cancel/decrement |

Other events throw `Unsupported event`.

## Product / variant allowlist

Shared constants: `packages/pockethost/src/common/lemonSqueezy.ts`

Handler key format: `{product_id}-{variant_id}`

| pv_id | Plan | `subscription` | `subscription_interval` | `subscription_quantity` |
|-------|------|----------------|-------------------------|-------------------------|
| `424532-651625` | Pay Per PocketBase (instance monthly) | `premium` | `month` | from `quantity` |
| `424532-651627` | Flounder lifetime | `flounder` | `life` | 250 |

Legacy grandfathered plans are not in the allowlist (variant inactive in LS). Unknown `pv_id` throws `Product and variant not found`.

## Required webhook payload

- `meta.custom_data.user_id` — must match a PocketBase `users` record ID
- `meta.event_name`
- `data.attributes.first_order_item` or top-level `product_id` / `variant_id`

## Cancel logic

`signup_canceller` only affects users with `subscription === 'premium'`. Decrements `subscription_quantity` by order quantity; sets `free` when quantity reaches 0.

Founder/flounder tiers are not decremented by this path.

## Notifications

On successful signup: `notify('lemonbot', 'lemon_order_discord', user_id, context)`

On cancellation: `notify('lemonbot', 'lemon_cancel_discord', user_id, context)` — `subscription_cancelled` webhook, plus refund webhooks (`order_refunded`, `subscription_payment_refunded`). Template slug `lemon_cancel_discord` seeded by migration `1782050000_lemon_cancel_discord_template.js`. Subject: `someone just cancelled {$PRODUCT_NAME} - {$VARIANT_NAME}`.

Audit codes: `LS` (success), `LS_ERR` (failure)

## Checkout (dashboard)

Pricing CTAs call `createLemonSqueezyCheckout(pvId)` in `packages/dashboard/src/util/lemonsqueezy.ts`, which POSTs to `/api/ls/checkout` with the user's auth token. Mothership creates the session via LS API and returns the hosted checkout URL.

**Billing portal** (`account/+page.svelte`): `https://store.pockethost.io/billing` for payment method updates. **Cancel membership:** `/account/cancel` → `POST /api/ls/cancel`.

## Adding a new plan (PocketHost checklist)

1. Create variant in Lemon Squeezy dashboard; note `product_id` and `variant_id`
2. Add `{product_id}-{variant_id}` to `common/lemonSqueezy.ts` (`LEMON_SQUEEZY_PV_IDS`, `VARIANT_ID_BY_PV_ID`)
3. Add entry to `product_handler_map` in `HandleLemonSqueezySale.ts`
4. Pass `pvId` from dashboard pricing UI (`SignupBox` `pvId` prop)
5. Rebuild mothership hooks: `pnpm --filter pockethost-mothership-app build`
6. Test checkout + webhook with LS test mode

## Rebuild note

Source lives in `src/lib/handlers/lemon/`. Compiled output is in `pb_hooks/mothership.js` — run `pnpm check:mothership-hooks` before commit (CI enforces freshness).
