/// <reference path="../types/types.d.ts" />

/** Reset instance status to idle on start */
onAfterBootstrap((e) => {
  $app.dao().db().newQuery(`update instances set status='idle'`).execute()
})
