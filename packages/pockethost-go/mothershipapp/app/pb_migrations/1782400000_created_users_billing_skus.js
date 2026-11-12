/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')

    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        help: 'Internal product catalog id (billing SKU).',
        hidden: false,
        id: 'phprodsku',
        max: 0,
        min: 0,
        name: 'product_sku',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      })
    )

    collection.fields.add(
      new Field({
        hidden: false,
        id: 'phsubstat',
        maxSelect: 1,
        name: 'subscription_status',
        presentable: false,
        required: false,
        system: false,
        type: 'select',
        values: ['active', 'lapsed', 'grandfathered'],
      })
    )

    collection.fields.add(
      new Field({
        help: 'Provider references: LS subscription/customer ids, grandfathered flags.',
        hidden: false,
        id: 'phbilllnk',
        maxSize: 2000000,
        name: 'billing_links',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    )

    collection.fields.add(
      new Field({
        hidden: false,
        id: 'phbillprv',
        maxSelect: 1,
        name: 'billing_provider',
        presentable: false,
        required: false,
        system: false,
        type: 'select',
        values: ['lemonsqueezy', 'stripe', 'manual'],
      })
    )

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('users')

    collection.fields.removeById('phprodsku')
    collection.fields.removeById('phsubstat')
    collection.fields.removeById('phbilllnk')
    collection.fields.removeById('phbillprv')

    return app.save(collection)
  }
)
