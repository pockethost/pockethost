/// <reference path="../pb_data/types.d.ts" />
// When the edge over-limit sweep first saw the account running more instances than its plan includes. Empty when it
// isn't over. The sweep powers off the extras once this is older than the grace period (common/instanceLimits.ts).
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.fields.add(
      new Field({
        hidden: false,
        id: 'ovrlmtsn',
        max: '',
        min: '',
        name: 'over_limit_since',
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
    collection.fields.removeById('ovrlmtsn')
    return app.save(collection)
  }
)
