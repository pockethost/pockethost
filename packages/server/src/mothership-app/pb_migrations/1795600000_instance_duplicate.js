/// <reference path="../pb_data/types.d.ts" />
// Duplicate: an instance made as a copy of another. `duplicateOf` is the source instance id (kept as history),
// `duplicateStatus` is '' (not a copy), 'copying' (the edge hasn't copied the files yet), 'ready' or 'failed'
// (`duplicateError` says why). Only the mothership's duplicate endpoint and the edge (superuser) write them.
migrate(
  (app) => {
    const instances = app.findCollectionByNameOrId('instances')
    const text = (id, name, max) =>
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id,
        max,
        min: 0,
        name,
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      })
    instances.fields.add(text('dupof00001', 'duplicateOf', 15))
    instances.fields.add(text('dupstat0001', 'duplicateStatus', 16))
    instances.fields.add(text('duperr00001', 'duplicateError', 500))
    app.save(instances)
  },
  (app) => {
    const instances = app.findCollectionByNameOrId('instances')
    for (const name of ['duplicateOf', 'duplicateStatus', 'duplicateError']) {
      const f = instances.fields.getByName(name)
      if (f) instances.fields.removeById(f.id)
    }
    app.save(instances)
  }
)
