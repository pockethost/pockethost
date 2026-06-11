# Server SDK — @lemonsqueezy/lemonsqueezy.js

Package: https://www.npmjs.com/package/@lemonsqueezy/lemonsqueezy.js
Source: https://github.com/lmsqueezy/lemonsqueezy.js
Wiki (all functions): https://github.com/lmsqueezy/lemonsqueezy.js/wiki

## Install

```bash
npm install @lemonsqueezy/lemonsqueezy.js
```

## Critical rule

**Server-only.** Never import this package in browser/client bundles — it exposes your API key.

Use in: API routes, server actions, PocketBase hooks, background jobs.

## Setup

```typescript
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => console.error('Lemon Squeezy error:', error),
})
```

Call `lemonSqueezySetup` once at app startup or before first API call.

## Common operations

All SDK functions return `{ data, error }`. Always check `error` before using `data`.

### Verify API key

```typescript
import { getAuthenticatedUser, lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! })
const { data, error } = await getAuthenticatedUser()
```

### Create checkout

```typescript
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js'

const { data, error } = await createCheckout({
  storeId: process.env.LEMONSQUEEZY_STORE_ID!,
  variantId: '123456',
  checkoutData: {
    email: user.email,
    custom: { user_id: user.id },
  },
  checkoutOptions: {
    embed: true,
  },
  productOptions: {
    redirectUrl: 'https://myapp.com/welcome',
  },
})

const checkoutUrl = data?.data.attributes.url
```

### List products and variants

```typescript
import { listProducts, listVariants } from '@lemonsqueezy/lemonsqueezy.js'

const { data: products } = await listProducts()
const { data: variants } = await listVariants({ filter: { productId: '123' } })
```

### Get / cancel subscription

```typescript
import { getSubscription, cancelSubscription } from '@lemonsqueezy/lemonsqueezy.js'

const { data: sub } = await getSubscription('SUBSCRIPTION_ID')
const updatePaymentUrl = sub?.data.attributes.urls.update_payment_method

await cancelSubscription('SUBSCRIPTION_ID')
```

### Create webhook programmatically

```typescript
import { createWebhook } from '@lemonsqueezy/lemonsqueezy.js'

await createWebhook({
  storeId: process.env.LEMONSQUEEZY_STORE_ID!,
  url: 'https://myapp.com/api/ls',
  events: ['order_created', 'subscription_created', 'subscription_expired'],
  secret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET!,
})
```

## Recommended project structure

```typescript
// lib/lemonsqueezy.ts — single setup module
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'

let configured = false

export function configureLemonSqueezy() {
  if (configured) return
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY is not set')
  lemonSqueezySetup({ apiKey })
  configured = true
}
```

Import `configureLemonSqueezy()` at the top of any server module that calls the SDK.

## Official tutorial

Next.js SaaS billing portal (patterns apply to any framework):
https://docs.lemonsqueezy.com/guides/tutorials/nextjs-saas-billing

## Other official SDKs

- **Laravel:** https://github.com/lmsqueezy/laravel
- **JavaScript/TypeScript:** `@lemonsqueezy/lemonsqueezy.js` (this doc)

For non-JS stacks, use the REST API directly — see [api.md](api.md).
