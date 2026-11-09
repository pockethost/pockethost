# PocketHost Lemon Squeezy Wiring

Repo-specific integration points. Generic LS docs are in the other reference files.

## File map

| Concern | Path |
|---------|------|
| Product ids | `packages/server/src/common/lemonSqueezy.ts` |
| Checkout API | `packages/server/src/mothership-app/src/lib/handlers/lemon/api/HandleLemonSqueezyCheckout.ts` |
| Cancel API | `packages/server/src/mothership-app/src/lib/handlers/lemon/api/HandleLemonSqueezyCancel.ts` |
| Webhook handler | `packages/server/src/mothership-app/src/lib/handlers/lemon/api/HandleLemonSqueezySale.ts` |
| Route registration | `packages/server/src/mothership-app/src/lib/handlers/lemon/hooks.ts` |
| Env constants | `packages/server/src/constants.ts` → `LS_WEBHOOK_SECRET`, `LS_API_KEY`, `LS_STORE_ID` |
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

Body: `{ "pvId": "1192400-1864333" }` (see `common/lemonSqueezy.ts`). Returns `{ "url": "..." }` from Lemon Squeezy API.

## Cancel endpoint (auth required)

```
POST /api/ls/cancel
```

Cancels the authenticated user's monthly subscriptions at period end, found via `billing_items`. Body `{ "itemId": "..." }` cancels one; without it, **all** active monthly subscriptions are cancelled. Returns `{ "status": "cancelled", "endsAt": "<latest>", "cancelled": [...] }`. Slots stay until `ends_at` (reconcile counts cancelled-but-paid subscriptions). Dashboard: `/account/cancel`.

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

## Billing items (multi-subscription model)

Users can hold **any number** of LS purchases at once — e.g. several monthly subscriptions (PayPal subscriptions cannot change quantity, so adding slots means a new subscription) plus lifetime orders. Each purchase is one row in `billing_items` (`provider`, `kind` = `subscription` | `order` | `manual`, `external_id`, `sku`, `quantity`, `status`, `ends_at`, `provider_data`).

`users.subscription_quantity` is **always recomputed** as the sum of active rows (`reconcileEntitlement()` in `common/billing/billingItems.ts`) — never incremented/decremented. Active = subscription `on_trial`/`active`/`past_due`/`cancelled` (until `ends_at`), order `paid`/`partial_refund`, manual `active`. Legacy plan fields come from the highest-priority active SKU (monthly first, so in-app cancel stays reachable).

JSVM helpers: `src/lib/handlers/lemon/lib/billingStore.ts` (upsert, bootstrap, reconcile) and `lib/lsApi.ts`.

**Bootstrap:** the first event for a user with no rows snapshots any non-LS plan (founder / legacy / grandfathered hacker) as a `manual` row and pulls their existing LS subscriptions + lifetime orders by email.

## Events handled

Any `subscriptions`, `subscription-invoices` or `orders` event: upsert the referenced subscription(s) / lifetime order, then reconcile. Recurring `order_*` events and `subscription_payment_*` events fetch the subscription from the LS API (`filter[order_id]` / `GET /subscriptions/{id}`), so they work whether or not `subscription_*` webhooks are enabled. Out-of-order subscription events are skipped when the stored `provider_data.updated_at` is newer. Other resource types return 200 `ignored`.

Enable in LS webhook settings: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused`, `subscription_unpaused`, `subscription_payment_refunded`.

## Reconcile (superuser, manual)

```
POST /api/ls/reconcile                          # dry run: JSON report, no writes
POST /api/ls/reconcile?apply=1                  # write billing_items + user entitlements
POST /api/ls/reconcile?apply=1&maxReductions=N  # apply a reviewed batch of up to N slot drops
POST /api/ls/reconcile?user=<id>                # one user, exact recompute (e.g. after editing their billing_items)
POST /api/ls/reconcile?apply=1&backfill=1       # one-time backfill mode (creates preserve rows; don't use routinely)
```

Logic lives in `src/lib/handlers/lemon/lib/runReconcile.ts`. It pulls every subscription and order in `LS_STORE_ID` and matches
them to users by account email and by alternate LS emails (`users.billing_links.lemonsqueezy.emails`, plus pairs learned from
old webhook audit records where checkout `custom_data.user_id` tied an LS email to the account).

- Slots = active verified LS purchases + any founder/legacy/grandfathered `baseline:<id>` row + manual grants.
- `preserve:<id>` rows (from the 2026-11-06 backfill) are released in normal runs: if LS can't show a payment, the slots go.
  At 0 slots the edge refuses every request to the account's instances (HTTP 402).
- Guard rails: an empty store-wide subscription listing aborts the run; if more than `maxReductions` (default 25) users
  would lose slots, all drops are held and reported.
- Not run by cron. The ops health check runs a dry run once a day and reports gains/drops for approval. Apply with
  `packages/server/scripts/mothership-reconcile-apply.sh [--max-reductions N | <user_id>]`; read-only queries with
  `packages/server/scripts/mothership-api.sh`.
- Give a customer slots back: add a `billing_items` row (`provider`/`kind` `manual`, `external_id` e.g. `grant:<id>`,
  `sku`, `quantity`, `status` `active`), then reconcile that user.

## Product / variant allowlist

Shared constants: `packages/server/src/common/lemonSqueezy.ts`

Handler key format: `{product_id}-{variant_id}`

| pv_id | Plan | SKU | `subscription` | `subscription_interval` | `subscription_quantity` |
|-------|------|-----|----------------|-------------------------|-------------------------|
| `1192400-1864333` | Pay Per PocketBase monthly ($9.99) | `hosting.slot.recurring.month` | `premium` | `month` | from `quantity` |
| `1192404-1864339` | Pay Per PocketBase annual ($59.99) | `hosting.slot.recurring.year` | `premium` | `year` | from `quantity` |
| `1192406-1864341` | Pay Per PocketBase lifetime ($149.99) | `hosting.slot.lifetime` | `flounder` | `life` | from `quantity` |
| `424532-651625` | Legacy monthly ($5) — webhook only | `hosting.slot.recurring.month.legacy` | `premium` | `month` | from `quantity` |
| `424532-651627` | Legacy Flounder ($359) — webhook only | `hosting.slot.lifetime.legacy_flounder` | `flounder` | `life` | 250 (fixed) |

Mappings live in `common/billing/providerMappings.ts`. Resolved via `entitlementFromPvId()` inside `billingItemFromLsSubscription()` / `billingItemFromLsOrder()`. Unknown `pv_id` on a webhook returns 500 (`LS_ERR` audit).

## Notifications

On successful signup: `notify('lemonbot', 'lemon_order_discord', user_id, context)`

On cancellation: `notify('lemonbot', 'lemon_cancel_discord', user_id, context)` — `subscription_cancelled` webhook, plus refund webhooks (`order_refunded`, `subscription_payment_refunded`). Template slug `lemon_cancel_discord` seeded by migration `1782050000_lemon_cancel_discord_template.js`. Subject: `someone just cancelled {$PRODUCT_NAME} - {$VARIANT_NAME}`.

Audit codes: `LS` (success), `LS_ERR` (failure)

## Checkout (dashboard)

Pricing CTAs call `createLemonSqueezyCheckout(pvId)` in `packages/dashboard/src/util/lemonsqueezy.ts`, which POSTs to `/api/ls/checkout` with the user's auth token. Mothership creates the session via LS API and returns the hosted checkout URL.

**Billing portal** (`account/+page.svelte`): `https://store.pockethost.io/billing` for payment method updates. **Cancel membership:** `/account/cancel` → `POST /api/ls/cancel`.

## Slot quantity (not yet implemented — top backlog item)

Pay Per PocketBase slots should change in-dashboard without the LS customer portal.

1. `GET /v1/subscriptions?filter[user_email]=…&filter[variant_id]=…&filter[status]=active` (same as cancel lookup)
2. Read `data.attributes.first_subscription_item.id` and current `quantity`
3. `PATCH /v1/subscription-items/{id}` with `{ "data": { "type": "subscription-items", "id": "…", "attributes": { "quantity": N } } }`
4. Optional: `invoice_immediately`, `disable_prorations` (see [LS subscription item update](https://docs.lemonsqueezy.com/api/subscription-items/update-subscription-item))
5. Handle `subscription_updated` webhook → sync `subscription_quantity` on the user record

Requires quantity-based billing on the Pay Per PocketBase variant (not usage-based). Fallback: open `urls.customer_portal` from the subscription object via Lemon.js overlay.

## Adding a new plan (PocketHost checklist)

1. Create variant in Lemon Squeezy dashboard; note `product_id` and `variant_id`
2. Add `{product_id}-{variant_id}` to `common/lemonSqueezy.ts` (`LEMON_SQUEEZY_PV_IDS`, `VARIANT_ID_BY_PV_ID`)
3. Add mapping in `common/billing/providerMappings.ts` (and `PRODUCT_CATALOG` if new SKU)
4. Pass `pvId` from dashboard pricing UI (`SignupBox` `pvId` prop)
5. Rebuild mothership hooks: `pnpm --filter pockethost-mothership-app build`
6. Test checkout + webhook with LS test mode

## Rebuild note

Source lives in `src/lib/handlers/lemon/`. Compiled output is in `pb_hooks/mothership.js` — run `pnpm check:mothership-hooks` before commit (CI enforces freshness).
