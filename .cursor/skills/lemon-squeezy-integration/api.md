# Lemon Squeezy REST API

Docs: https://docs.lemonsqueezy.com/api

## Basics

| Item | Value |
|------|-------|
| Base URL | `https://api.lemonsqueezy.com/v1/` |
| Auth | `Authorization: Bearer {LEMONSQUEEZY_API_KEY}` |
| Content-Type | `application/vnd.api+json` |
| Accept | `application/vnd.api+json` |
| Rate limit | 300 requests/minute |
| Response headers | `X-Ratelimit-Limit`, `X-Ratelimit-Remaining` |

All requests and responses use [JSON:API](https://jsonapi.org/) format.

## Test vs live mode

API keys created in test mode only interact with test store data. Create separate live-mode keys before production.

## Common endpoints

| Action | Method | Path |
|--------|--------|------|
| List products | GET | `/products` |
| Get product | GET | `/products/{id}` |
| List variants | GET | `/variants` |
| Get variant | GET | `/variants/{id}` |
| Create checkout | POST | `/checkouts` |
| List orders | GET | `/orders` |
| Get order | GET | `/orders/{id}` |
| List subscriptions | GET | `/subscriptions` |
| Get subscription | GET | `/subscriptions/{id}` |
| Cancel subscription | DELETE | `/subscriptions/{id}` |
| List customers | GET | `/customers` |
| Create webhook | POST | `/webhooks` |
| List license keys | GET | `/license-keys` |

Full reference: https://docs.lemonsqueezy.com/api/checkouts/create-checkout

## Create checkout (minimal)

```bash
curl -X POST "https://api.lemonsqueezy.com/v1/checkouts" \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer $LEMONSQUEEZY_API_KEY" \
  -d '{
    "data": {
      "type": "checkouts",
      "attributes": {
        "checkout_data": {
          "email": "user@example.com",
          "custom": { "user_id": "abc123" }
        }
      },
      "relationships": {
        "store": { "data": { "type": "stores", "id": "STORE_ID" } },
        "variant": { "data": { "type": "variants", "id": "VARIANT_ID" } }
      }
    }
  }'
```

Response checkout URL: `data.attributes.url`

## Checkout URL query params (no API needed)

Append to shareable checkout URLs:

| Param | Example |
|-------|---------|
| Pre-fill email | `?checkout[email]=user@example.com` |
| Pre-fill name | `&checkout[name]=Jane Doe` |
| Custom data | `&checkout[custom][user_id]=abc123` |
| Overlay mode | `&embed=1` |
| Hide logo | `&logo=0` |
| Button color | `&button_color=%23111111` (URL-encode `#` as `%23`) |

Custom data from query params appears as `meta.custom_data` in webhooks.

## Useful checkout API attributes

| Attribute | Purpose |
|-----------|---------|
| `checkout_data.custom` | Pass user/session IDs (→ `meta.custom_data` in webhooks) |
| `checkout_data.email`, `.name` | Pre-fill customer fields |
| `custom_price` | Override price (smallest currency unit, e.g. 599 = $5.99) |
| `expires_at` | ISO 8601 expiry for one-time checkout links |
| `product_options.redirect_url` | Post-purchase redirect |
| `product_options.receipt_link_url` | Custom receipt button URL |
| `checkout_options.embed` | Enable overlay mode |

## Finding IDs

- **Store ID:** Settings → Stores
- **Variant ID:** Product → Share, or "Copy ID" in product menu, or `GET /variants`
- **Product ID:** Same sources, or from webhook payload `product_id`

## Subscription management

After storing a subscription ID from webhooks:

- **Get status:** `GET /subscriptions/{id}` — read `status`, `renews_at`, `ends_at`, `card_brand`, `card_last_four`
- **Update payment method URL:** `data.attributes.urls.update_payment_method` — open with Lemon.js
- **Cancel:** `DELETE /subscriptions/{id}`

Guide: https://docs.lemonsqueezy.com/guides/developer-guide/taking-payments
