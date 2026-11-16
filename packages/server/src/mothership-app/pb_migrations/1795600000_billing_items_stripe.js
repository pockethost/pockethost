/// <reference path="../pb_data/types.d.ts" />
// Stripe (Managed Payments) billing items sit beside Lemon Squeezy ones.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('billing_items')
    const field = collection.fields.getByName('provider')
    field.values = ['lemonsqueezy', 'stripe', 'manual']
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('billing_items')
    const field = collection.fields.getByName('provider')
    field.values = ['lemonsqueezy', 'manual']
    app.save(collection)
  }
)
