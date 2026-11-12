/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('etae8tuiaxl6xfv')

    // add field
    collection.fields.addAt(
      18,
      new Field({
        help: '',
        hidden: false,
        id: 'json1208032126',
        maxSize: 0,
        name: 'firewall',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    )

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('etae8tuiaxl6xfv')

    // remove field
    collection.fields.removeById('json1208032126')

    return app.save(collection)
  }
)
