# PocketHost Lemon Squeezy Wiring

Repo-specific integration points. Generic LS docs are in the other reference files.

## File map

| Concern | Path |
|---------|------|
| Webhook handler | `packages/pockethost/src/mothership-app/src/lib/handlers/lemon/api/HandleLemonSqueezySale.ts` |
| Route registration | `packages/pockethost/src/mothership-app/src/lib/handlers/lemon/hooks.ts` |
| Env constant | `packages/pockethost/src/constants.ts` → `LS_WEBHOOK_SECRET` |
| Lemon.js types | `packages/dashboard/src/lemonsqueezy.d.ts` |
| Pricing cards | `packages/dashboard/src/components/FlounderCard.svelte`, `FounderCard.svelte` |
| Pricing UI | `packages/dashboard/src/components/PricingCard.svelte` |
| Signup/pricing CTAs | `packages/dashboard/src/routes/(static)/pricing/SignupBox.svelte`, `CTAButton.svelte` |
| Billing portal link | `packages/dashboard/src/routes/(app)/account/+page.svelte` |

## Webhook endpoint

```
POST /api/ls
```

Registered in `hooks.ts`:

```typescript
routerAdd('POST', '/api/ls', (c) => {
  return require(`${__hooks}/mothership`).HandleLemonSqueezySale(c)
})
```

## Environment

| Variable | Purpose |
|----------|---------|
| `LS_WEBHOOK_SECRET` | Webhook HMAC signing secret |

No `LEMONSQUEEZY_API_KEY` in repo yet — checkout uses static dashboard URLs, not dynamic API checkouts.

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
| `subscription_expired` | Cancel/decrement |
| `subscription_payment_refunded` | Cancel/decrement |

Other events throw `Unsupported event`.

## Product / variant allowlist

Handler key format: `{product_id}-{variant_id}`

| pv_id | Plan | `subscription` | `subscription_interval` | `subscription_quantity` |
|-------|------|----------------|-------------------------|-------------------------|
| `159792-200790` | Founder annual | `founder` | `year` | 2147483647 |
| `159791-200789` | Pro annual | `premium` | `year` | 250 |
| `159790-200788` | Pro monthly | `premium` | `month` | 250 |
| `306534-441845` | Flounder lifetime | `flounder` | `life` | 250 |
| `367781-200790` | Flounder annual | `flounder` | `year` | 250 |
| `424532-651625` | Paywall instance monthly | `premium` | `month` | from `quantity` |
| `424532-651629` | Paywall pro monthly | `premium` | `month` | 250 |
| `424532-651634` | Paywall pro annual | `premium` | `year` | 250 |
| `424532-651627` | Paywall flounder | `flounder` | `life` | 250 |

Unknown `pv_id` throws `Product and variant not found`.

## Required webhook payload

- `meta.custom_data.user_id` — must match a PocketBase `users` record ID
- `meta.event_name`
- `data.attributes.first_order_item` or top-level `product_id` / `variant_id`

## Cancel logic

`signup_canceller` only affects users with `subscription === 'premium'`. Decrements `subscription_quantity` by order quantity; sets `free` when quantity reaches 0.

Founder/flounder tiers are not decremented by this path.

## Notifications

On successful signup: `notify('lemonbot', 'lemon_order_discord', user_id, context)`

Audit codes: `LS` (success), `LS_ERR` (failure)

## Checkout URLs (dashboard)

Store domain: `https://store.pockethost.io`

**Flounder** (`FlounderCard.svelte`):

```
https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${userId}&checkout[email]=${email}
```

**Founder** (`FounderCard.svelte`):

- Lifetime: `.../checkout/buy/e71cbfb5-cec3-4745-97a7-d877f6776503?checkout[custom][user_id]=...`
- Annual: `.../checkout/buy/e5660329-5b99-4ed6-8f36-0d387803e1d6?checkout[custom][user_id]=...`

**Pricing/signup** (`SignupBox.svelte`, `CTAButton.svelte`): same Flounder buy URL pattern.

**Billing portal** (`account/+page.svelte`): `https://store.pockethost.io/billing`

Note: PocketHost uses both `/buy/{uuid}` and `/checkout/buy/{uuid}` URL formats from the LS custom domain.

## Adding a new plan (PocketHost checklist)

1. Create variant in Lemon Squeezy dashboard; note `product_id` and `variant_id`
2. Generate share/checkout URL from dashboard; add to relevant Svelte card with `checkout[custom][user_id]` and `checkout[email]`
3. Add `{product_id}-{variant_id}` to allowlist array in `HandleLemonSqueezySale.ts`
4. Add entry to `product_handler_map` with correct `subscription`, `subscription_interval`, `subscription_quantity`
5. Rebuild mothership hooks: `pnpm --filter pockethost-mothership-app build` (or `pnpm dev:mothership-hooks` while developing)
6. Test webhook with LS dashboard "Send test webhook" or a test purchase

## Rebuild note

Source lives in `src/lib/handlers/lemon/`. Compiled output is in `pb_hooks/mothership.js` — run `pnpm check:mothership-hooks` before commit (CI enforces freshness).
