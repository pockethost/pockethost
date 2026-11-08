/// Admin Sync. Works on PocketBase 0.17+: 0.23+ has `onBootstrap`, older versions use `$app.onBeforeServe()`.
/// Handlers run in their own context, so the shared code comes in through require().

if (typeof onBootstrap === 'function') {
  onBootstrap((e) => {
    e.next()
    const { adminSync } = /** @type {Lib} */ (require(`${__hooks}/_ph_lib.js`))
    adminSync(e.app, false)
  })
} else {
  $app.onBeforeServe().add(() => {
    const { adminSync } = /** @type {Lib} */ (require(`${__hooks}/_ph_lib.js`))
    adminSync($app, true)
  })
}
