/// <reference path="../pb_data/types.d.ts" />

migrate(
  (db) => {
    db.newQuery(
      'UPDATE invocations SET uid = (select uid from instances where instances.id = invocations.instanceId)',
    ).execute()
  },
  (db) => {},
)
