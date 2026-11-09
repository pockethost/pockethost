/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('yfhnigik0uvyt4m')

    // update field
    collection.fields.addAt(
      2,
      new Field({
        help: '',
        hidden: false,
        id: '4fxgwtui',
        maxSize: 20000,
        name: 'vars',
        presentable: false,
        required: false,
        system: false,
        type: 'json',
      })
    )

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('yfhnigik0uvyt4m')

    // update field
    collection.fields.addAt(
      2,
      new Field({
        help: '',
        hidden: false,
        id: '4fxgwtui',
        maxSize: 20000,
        name: 'vars',
        presentable: false,
        required: true,
        system: false,
        type: 'json',
      })
    )

    return app.save(collection)
  }
)
