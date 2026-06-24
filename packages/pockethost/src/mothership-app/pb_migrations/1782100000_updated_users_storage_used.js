/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')

    collection.fields.add(
      new Field({
        hidden: false,
        id: 'vstrgusd',
        max: null,
        min: 0,
        name: 'volume_storage_used',
        onlyInt: true,
        presentable: false,
        required: false,
        system: false,
        type: 'number',
      })
    )

    collection.fields.add(
      new Field({
        hidden: false,
        id: 'ostrgeusd',
        max: null,
        min: 0,
        name: 'object_storage_used',
        onlyInt: true,
        presentable: false,
        required: false,
        system: false,
        type: 'number',
      })
    )

    app.save(collection)

    app.db().newQuery('UPDATE users SET volume_storage_used = 0 WHERE volume_storage_used IS NULL').execute()
    app.db().newQuery('UPDATE users SET object_storage_used = 0 WHERE object_storage_used IS NULL').execute()
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('users')

    collection.fields.removeById('vstrgusd')
    collection.fields.removeById('ostrgeusd')

    return app.save(collection)
  }
)
