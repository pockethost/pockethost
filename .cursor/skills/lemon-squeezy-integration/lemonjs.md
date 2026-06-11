# Lemon.js — Client Checkout Library

Docs: https://docs.lemonsqueezy.com/help/lemonjs
Guide: https://docs.lemonsqueezy.com/guides/developer-guide/lemonjs

Lemon.js is the **browser-side** library for checkout overlays and payment-method update flows. It is **not** an npm package — load from the official CDN only.

**Do not self-host** Lemon.js. You may miss security patches and new features.

## Installation

```html
<script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
```

In SvelteKit, add to `app.html` or load dynamically in a layout. PocketHost has TypeScript types at `packages/dashboard/src/lemonsqueezy.d.ts`.

## Declarative overlay (simplest)

Any link with class `lemonsqueezy-button` opens checkout in an overlay instead of a new tab:

```html
<a
  class="lemonsqueezy-button"
  href="https://[STORE].lemonsqueezy.com/checkout/buy/[VARIANT_ID]?checkout[custom][user_id]=123"
>
  Buy now
</a>
```

Call `LemonSqueezy.Refresh()` after dynamically adding links to the DOM.

## Programmatic overlay

Use when checkout URLs are generated via API at runtime:

```javascript
const checkoutUrl = response.data.attributes.url
LemonSqueezy.Url.Open(checkoutUrl)
```

Close programmatically: `LemonSqueezy.Url.Close()`

## Setup and events

```javascript
LemonSqueezy.Setup({
  eventHandler: (event) => {
    switch (event.event) {
      case 'Checkout.Success':
        // event.data contains Order object — use for UX only, not provisioning
        break
      case 'PaymentMethodUpdate.Updated':
        // Customer updated payment method
        break
    }
  },
})
```

Initialize once on page load. Call `createLemonSqueezy()` if using the auto-init helper (some integrations expose this globally).

### Known events

| Event | When |
|-------|------|
| `Checkout.Success` | Payment completed — includes Order in `data` |
| `Checkout.Close` | Overlay closed without completing |
| `PaymentMethodUpdate.Updated` | Subscription payment method updated |
| `PaymentMethodUpdate.Closed` | Payment method overlay closed |

Full list: https://docs.lemonsqueezy.com/help/lemonjs/event-handling

## Payment method updates

Open subscription payment update URLs in overlay (better UX than redirect):

```javascript
const updateUrl = subscription.attributes.urls.update_payment_method
LemonSqueezy.Url.Open(updateUrl)
```

Fetch `update_payment_method` URL from the Subscriptions API on your server, pass to client.

## Affiliate tracking

```javascript
LemonSqueezy.Affiliate.GetID()
LemonSqueezy.Affiliate.Build(checkoutUrl) // appends affiliate param
```

## Svelte / SPA notes

- Re-run `LemonSqueezy.Refresh()` after Svelte renders new checkout links
- For logged-in users, interpolate `user_id` and `email` into checkout URL query params before render
- Prefer `<a href="...">` with `lemonsqueezy-button` over `window.location` for overlay behavior

## TypeScript

Declare on `Window`:

```typescript
interface Window {
  LemonSqueezy: {
    Setup: (options: { eventHandler: (event: { event: string; data?: unknown }) => void }) => void
    Refresh: () => void
    Url: { Open: (url: string) => void; Close: () => void }
    Affiliate: { GetID: () => string; Build: (url: string) => string }
  }
  createLemonSqueezy?: () => void
}
```
