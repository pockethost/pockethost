/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('etae8tuiaxl6xfv')

    collection.fields.add(
      new BoolField({
        hidden: false,
        id: 'k8m2vacu',
        name: 'autoVacuum',
        presentable: false,
        required: false,
        system: false,
      })
    )

    app.save(collection)

    app.db().newQuery('UPDATE instances SET autoVacuum = {:v}').bind({ v: true }).execute()
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('etae8tuiaxl6xfv')

    collection.fields.removeById('k8m2vacu')

    app.save(collection)
  }
)
