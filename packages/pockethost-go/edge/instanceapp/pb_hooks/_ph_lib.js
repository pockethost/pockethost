/** @type {Lib['mkLog']} */
const mkLog =
  (namespace) =>
  /**
   * @param {...any} s
   * @returns
   */
  (...s) =>
    console.log(
      `[${namespace}]`,
      ...s.map((p) => {
        if (typeof p === 'object') return JSON.stringify(p, null, 2)
        return p
      })
    )

/**
 * Admin Sync: upserts the superuser from `ADMIN_SYNC` so it matches the owner's PocketHost login. 0.23+ writes
 * `_superusers.password`. 0.17–0.22 (`legacy`) write `_admins.passwordHash`.
 *
 * @type {Lib['adminSync']}
 */
const adminSync = (app, legacy) => {
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

  const sql = legacy
    ? `insert or replace into _admins (id, email, tokenKey, passwordHash) values ({:id}, {:email}, {:tokenKey}, {:passwordHash})`
    : `insert or replace into _superusers (id, email, tokenKey, password) values ({:id}, {:email}, {:tokenKey}, {:passwordHash})`
  const db = legacy ? app.dao().db() : app.db()

  try {
    db.newQuery(sql).bind({ id, email, tokenKey, passwordHash }).execute()
    log(`Success updating admin credentials ${email}`)
  } catch (e) {
    log(`Failed to update admin credentials ${email}: ${e}`)
  }
}

module.exports = {
  mkLog,
  adminSync,
}
