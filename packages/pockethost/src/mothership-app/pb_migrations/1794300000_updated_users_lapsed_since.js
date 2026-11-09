/// <reference path="../pb_data/types.d.ts" />
// When the edge over-limit sweep emailed the account that its subscription ended (no instances left in its plan) and its
// instances stopped. Cleared once the plan includes instances again, so the email goes out once per lapse
// (common/instanceLimits.ts planLapse).
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.fields.add(
      new Field({
        hidden: false,
        id: 'lpsdsnce',
        max: '',
        min: '',
        name: 'lapsed_since',
        presentable: false,
        required: false,
        system: false,
        type: 'date',
      })
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.fields.removeById('lpsdsnce')
    return app.save(collection)
  }
)
