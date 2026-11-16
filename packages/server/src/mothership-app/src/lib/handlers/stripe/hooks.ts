// Provider-neutral checkout: Lemon Squeezy or Stripe, picked by BILLING_CHECKOUT_PROVIDER on the mothership. Open to
// guests: pay-first signup checks out before the account exists (the handler uses the auth when present).
routerAdd('POST', '/api/billing/checkout', (e) => {
  return require(`${__hooks}/mothership`).HandleBillingCheckout(e)
})

// Cancel every cancellable subscription on the account, on either provider.
routerAdd(
  'POST',
  '/api/billing/cancel',
  (e) => {
    return require(`${__hooks}/mothership`).HandleLemonSqueezyCancel(e)
  },
  $apis.requireAuth()
)

// Stripe webhook (signed with STRIPE_WEBHOOK_SECRET).
routerAdd('POST', '/api/stripe/webhook', (e) => {
  return require(`${__hooks}/mothership`).HandleStripeWebhook(e)
})
