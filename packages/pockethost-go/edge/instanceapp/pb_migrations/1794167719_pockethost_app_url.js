/// Sets the app URL on 0.23+ instances that still have PocketBase's placeholder.
/// The defaults migration used the wrong setting name on 0.23+ until 9741fa34, so their app URL stayed
/// `http://localhost:8090`, which breaks links in verification and password-reset emails.
/// Only replaces the exact placeholder, so a URL the owner set is never touched. Does nothing before 0.23.
migrate(
  (appOrDb) => {
    try {
      if (typeof appOrDb.settings !== 'function') return // 0.17–0.22: the defaults migration already set it

      const { PH_INSTANCE_URL } = process.env
      const settings = appOrDb.settings()
      if (!PH_INSTANCE_URL || settings.meta.appURL !== 'http://localhost:8090') return

      settings.meta.appURL = PH_INSTANCE_URL
      appOrDb.save(settings)
      console.log(`***app URL set to ${PH_INSTANCE_URL}`)
    } catch (e) {
      console.error(`***error setting app URL: ${e}`)
    }
  },
  () => {
    // no down migration
  }
)
