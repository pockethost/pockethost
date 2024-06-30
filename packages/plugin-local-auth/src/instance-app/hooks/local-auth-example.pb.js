/// <reference path="../../../../pockethost/src/instance-app/types/all.d.ts" />

$app.onBeforeServe().add((e) => {
  const dao = $app.dao()
  const { mkLog } = /** @type {Lib} */ (require(`${__hooks}/_ph_lib.js`))

  const log = mkLog(`plugin-local-auth`)

  if (!$os.getenv(`PH_PLUGIN_LOCAL_AUTH_ENABLED`)) {
    log(`Starting `)
  } else {
    log(`Not enabled. Skipping...`)
    return
  }
})
