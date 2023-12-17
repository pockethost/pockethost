migrate(
  (db) => {
    try {
      const APP_DEFAULTS = {
        appName: 'Acme',
        appUrl: 'http://localhost:8090',
        senderName: 'Support',
        senderAddress: 'support@example.com',
      }

      const { PH_APP_NAME, PH_INSTANCE_URL, PH_APEX_DOMAIN } = process.env

      const dao = new Dao(db)

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

      console.log(`***defaults successfully applied`)
    } catch (e) {
      console.error(`***error applying defaults: ${e}`)
    }
  },
  (db) => {
    // add down queries...
  },
)
