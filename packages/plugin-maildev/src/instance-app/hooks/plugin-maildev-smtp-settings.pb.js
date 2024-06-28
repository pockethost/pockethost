/// <reference path="../../../../pockethost/src/instance-app/types/all.d.ts" />

$app.onBeforeServe().add((e) => {
  return
  const dao = $app.dao()
  const { mkLog } = /** @type {Lib} */ (require(`${__hooks}/_ph_lib.js`))

  const log = mkLog(`plugin-maildev`)
  log(`Starting plugin-maildev`)

  const APP_DEFAULTS = {
    appName: 'Acme',
    appUrl: 'http://localhost:8090',
    senderName: 'Support',
    senderAddress: 'support@example.com',
  }

  try {
    const settings = dao.findSettings()
    if (!settings) {
      throw new Error(`Expected settings here`)
    }

    const fix = (field, newValue) => {
      if (!newValue || settings.meta[field] !== APP_DEFAULTS[field]) return
      settings.meta[field] = newValue
    }
    fix(`appName`, PH_APP_NAME)
    fix(`appUrl`, PH_INSTANCE_URL)
    fix(`senderName`, PH_APP_NAME)
    fix(`senderAddress`, `${PH_APP_NAME}@app.pockethost.io`)

    dao.saveSettings(settings)

    log(`***defaults successfully applied`)
  } catch (e) {
    log(`***error applying defaults: ${e}`)
  }
})

$app.onBeforeServe().add((e) => {
  return
  const dao = $app.dao()
  const { mkLog } = /** @type {Lib} */ (require(`${__hooks}/_ph_lib.js`))

  const log = mkLog(`plugin-maildev`)
  log(`Starting plugin-maildev`)

  const { id, email, tokenKey, passwordHash } = (() => {
    try {
      return /** @type{{id:string, email:string, tokenKey:string,passwordHash:string}} */ (
        JSON.parse($os.getenv(`ADMIN_SYNC`))
      )
    } catch (e) {
      return { id: '', email: '', tokenKey: '', passwordHash: '' }
    }
  })()

  if (!email) {
    log(`Not active - skipped`)
    return
  }

  const result = new DynamicModel({
    // describe the shape of the data (used also as initial values)
    id: '',
  })

  try {
    dao
      .db()
      .newQuery('SELECT * from _admins where email = {:email}')
      .bind({ email })
      .one(result)
    log(
      `Existing admin record matching PocketHost login found - updating with latest credentials`,
    )
    try {
      dao
        .db()
        .newQuery(
          'update _admins set tokenKey={:tokenKey}, passwordHash={:passwordHash} where email={:email}',
        )
        .bind({ email, tokenKey, passwordHash })
        .execute()
      log(`Success`)
    } catch (e) {
      log(`Failed to update admin credentials: ${e}`)
    }
  } catch (e) {
    log(`No admin record matching PocketHost credentials - creating`)

    try {
      dao
        .db()
        .newQuery(
          'insert into _admins (id,email, tokenKey, passwordHash) VALUES ({:id}, {:email}, {:tokenKey}, {:passwordHash})',
        )
        .bind({
          id,
          email,
          tokenKey,
          passwordHash,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        })
        .execute()
      log(`Success`)
    } catch (e) {
      log(`Failed to insert admin credentials: ${e}`)
    }
  }
})

$app.onBeforeServe().add((e) => {
  const dao = $app.dao()
  const { mkLog } = /** @type {Lib} */ (require(`${__hooks}/_ph_lib.js`))

  const log = mkLog(`plugin-maildev`)
  if (!$os.getenv(`PH_PLUGIN_MAILDEV_ENABLED`)) {
    log(`Starting `)
  } else {
    log(`Not enabled. Skipping...`)
    return
  }

  try {
    const settings = dao.findSettings()
    if (!settings) {
      throw new Error(`Expected settings here`)
    }

    settings.smtp[`enabled`] = true
    settings.smtp[`host`] = `localhost`
    settings.smtp[`port`] = $os.getenv(`PH_MAILDEV_PORT`)
    settings.smtp[`tls`] = false

    dao.saveSettings(settings)

    log(`***defaults successfully applied`)
  } catch (e) {
    log(`***error applying defaults: ${e}`)
  }
})
