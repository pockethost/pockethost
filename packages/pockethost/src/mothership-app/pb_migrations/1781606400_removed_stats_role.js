/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('systemprofiles0')

    for (const field of collection.schema.fields()) {
      if (field?.name === 'isStatsRole') {
        collection.schema.removeField(field.id)
        break
      }
    }

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('systemprofiles0')

    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'k8m2pqxv',
        name: 'isStatsRole',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    )

    return dao.saveCollection(collection)
  }
)
