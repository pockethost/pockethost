/// <reference path="../src/types/types.d.ts" />
migrate(
  (db) => {
    db.newQuery(`UPDATE instances SET region = 'sfo-2'`).execute()
  },
  (db) => {},
)
