/// <reference path="../src/types/types.d.ts" />
migrate(
  (db) => {
    db.newQuery('UPDATE instances SET power = not power').execute()
  },
  (db) => {},
)
