migrate(
  (app) => {
    try {
      const APP_DEFAULTS = {
        appName: 'Acme',
        appURL: 'http://localhost:8090',
        senderName: 'Support',
        senderAddress: 'support@example.com',
      }

      const { PH_APP_NAME, PH_INSTANCE_URL } = process.env

      const settings = app.settings()

      const fix = (field, newValue) => {
        if (!newValue || settings.meta[field] !== APP_DEFAULTS[field]) return
        settings.meta[field] = newValue
      }
      fix(`appName`, PH_APP_NAME)
      fix(`appUrl`, PH_INSTANCE_URL)
      fix(`senderName`, PH_APP_NAME)
      fix(`senderAddress`, `${PH_APP_NAME}@app.pockethost.io`)

      app.save(settings)

      console.log(`***defaults successfully applied`)
    } catch (e) {
      console.error(`***error applying defaults: ${e}`)
    }
  },
  (db) => {
    // add down queries...
  },
)
