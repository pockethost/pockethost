/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const instances = app.findCollectionByNameOrId('instances')
    if (instances.fields.fieldNames().indexOf('machine') >= 0) {
      instances.fields.removeByName('machine')
      app.save(instances)
    }

    try {
      const machines = app.findCollectionByNameOrId('machines')
      app.delete(machines)
    } catch (_) {}
  },
  (app) => {}
)
