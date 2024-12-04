onBootstrap((e) => {
  e.next()
  const { mkLog } = /** @type {Lib} */ (require(`${__hooks}/_ph_lib.js`))

  const log = mkLog(`admin-sync`)

  const { id, email, tokenKey, passwordHash } = (() => {
    try {
      return /** @type{{id:string, email:string, tokenKey:string,passwordHash:string}} */ (
        JSON.parse(process.env.ADMIN_SYNC)
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
    e.app
      .db()
      .newQuery(
        `
        insert or replace into _superusers (id, email, tokenKey, password) values ({:id}, {:email}, {:tokenKey}, {:passwordHash})
          `,
      )
      .bind({ id, email, tokenKey, passwordHash })
      .execute()

  try {
    update()
    log(`Success updating admin credentials ${email}`)
  } catch (e) {
    log(`Failed to update admin credentials ${email}: ${e}`)
  }
})
