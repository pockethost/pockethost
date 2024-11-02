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

  const update = () =>
    dao
      .db()
      .newQuery(
        `
        insert into _admins (id, email, tokenKey, passwordHash) values ({:id}, {:email}, {:tokenKey}, {:passwordHash})
        ON CONFLICT(email) DO UPDATE SET
          id=excluded.id,
          tokenKey=excluded.tokenKey,
          passwordHash=excluded.passwordHash
        ON CONFLICT(id) DO UPDATE SET
          email=excluded.email,
          tokenKey=excluded.tokenKey,
          passwordHash=excluded.passwordHash
          `,
      )
      .bind({ id, email, tokenKey, passwordHash })
      .execute()

  try {
    update()
    log(`Success updating admin credentials ${email}`)
  } catch (e) {
    log(`Failed to update admin credentials ${email}`)
  }
})
