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

  const updateByEmail = (email) =>
    dao
      .db()
      .newQuery(
        'update _admins set tokenKey={:tokenKey}, passwordHash={:passwordHash} where email={:email}',
      )
      .bind({ email, tokenKey, passwordHash })
      .execute()

  const updateById = () =>
    dao
      .db()
      .newQuery(
        'update _admins set tokenKey={:tokenKey}, passwordHash={:passwordHash}, email={:email} where id={:id}',
      )
      .bind({ id, tokenKey, passwordHash, email })
      .execute()

  const insert = () =>
    dao
      .db()
      .newQuery(
        'insert into _admins (id, email, tokenKey, passwordHash) VALUES ({:id}, {:email}, {:tokenKey}, {:passwordHash})',
      )
      .bind({ id, email, tokenKey, passwordHash })
      .execute()

  try {
    updateById()
    log(`Success updating admin credentials by id ${id}`)
  } catch (e) {
    log(
      `Failed to update admin credentials by id ${id}. Trying by email ${email}`,
    )
    try {
      updateByEmail()
      log(`Success updating admin credentials by email ${email}`)
    } catch (e) {
      log(
        `Failed to update admin credentials by email ${email} or uid ${id}. Attempting insert.`,
      )
      try {
        insert()
        log(`Success inserting admin credentials`)
      } catch (e) {
        log(`Failed to insert admin credentials: ${e}`)
      }
    }
  }
})
