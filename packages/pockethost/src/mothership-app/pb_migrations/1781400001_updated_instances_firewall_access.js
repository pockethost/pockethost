/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'fwtrstip',
        name: 'trusted_ips',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 2000000,
        },
      })
    )

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'fwproxyip',
        name: 'proxy_ips',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 2000000,
        },
      })
    )

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'fwratelmt',
        name: 'rate_limits',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 2000000,
        },
      })
    )

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    collection.schema.removeField('fwtrstip')
    collection.schema.removeField('fwproxyip')
    collection.schema.removeField('fwratelmt')

    return dao.saveCollection(collection)
  }
)
