/// <reference path="../types/types.d.ts" />

/** Reset instance status to idle on start */
onAfterBootstrap((e) => {
  const dao = $app.dao()
  dao.db().newQuery(`update instances set status='idle'`).execute()
})
