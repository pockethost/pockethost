$app.onBeforeServe().add((e) => {
  const dao = $app.dao()
  const { mkLog } = /** @type {Lib} */ (require(`${__hooks}/_ph_lib.js`))

  const log = mkLog(`admin-sync`)

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
