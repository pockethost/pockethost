/// Replaces PocketBase's placeholder app name, URL and sender with the instance's own. Works on PocketBase 0.17+.
/// 0.23+ passes `app` to migrations. 0.17–0.22 pass a db, used through `Dao`.
migrate(
  (appOrDb) => {
    try {
      const legacy = typeof appOrDb.settings !== 'function'
      // The app URL setting is `appUrl` before 0.23 and `appURL` from 0.23.
      const urlKey = legacy ? 'appUrl' : 'appURL'

      const APP_DEFAULTS = {
        appName: 'Acme',
        [urlKey]: 'http://localhost:8090',
        senderName: 'Support',
        senderAddress: 'support@example.com',
      }

      // `process.env`, not `$os`: migrations on 0.17 don't have `$os`.
      const { PH_APP_NAME, PH_INSTANCE_URL } = process.env

      const dao = legacy ? new Dao(appOrDb) : null
      const settings = legacy ? dao.findSettings() : appOrDb.settings()
      if (!settings) {
        throw new Error(`Expected settings here`)
      }

      const fix = (field, newValue) => {
        if (!newValue || settings.meta[field] !== APP_DEFAULTS[field]) return
        settings.meta[field] = newValue
      }
      fix(`appName`, PH_APP_NAME)
      fix(urlKey, PH_INSTANCE_URL)
      fix(`senderName`, PH_APP_NAME)
      fix(`senderAddress`, `${PH_APP_NAME}@pockethost.io`)

      if (legacy) {
        dao.saveSettings(settings)
      } else {
        appOrDb.save(settings)
      }

      console.log(`***defaults successfully applied`)
    } catch (e) {
      console.error(`***error applying defaults: ${e}`)
    }
  },
  () => {
    // no down migration
  }
)
