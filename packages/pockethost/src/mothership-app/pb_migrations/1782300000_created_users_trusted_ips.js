/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')

    collection.fields.add(
      new Field({
        help: 'Outgoing IPs you trust for higher rate limits. Optional X-PocketHost-Client-IP header for server-side proxies.',
        hidden: false,
        id: 'phtrustip',
        maxSize: 2000000,
        name: 'trusted_ips',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    )

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.fields.removeById('phtrustip')
    return app.save(collection)
  }
)
