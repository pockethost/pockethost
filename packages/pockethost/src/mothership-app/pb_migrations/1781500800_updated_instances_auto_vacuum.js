/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'k8m2vacu',
        name: 'autoVacuum',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    )

    dao.saveCollection(collection)

    db.newQuery('UPDATE instances SET autoVacuum = {:v}').bind({ v: true }).execute()
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('etae8tuiaxl6xfv')

    collection.schema.removeField('k8m2vacu')

    return dao.saveCollection(collection)
  }
)
