import { mkLog } from '$util/Logger'

export const BeforeUpdate_cname = (e: core.RecordUpdateEvent) => {
  const log = mkLog(`BeforeUpdate_cname`)
  const record = e.record
  if (!record) return

  const id = record.id
  const newCname = record.get('cname').trim()
  // Only a changed custom domain is checked: other saves (the mothership writing owner fields, a status) must not fail
  // on instances that already share a domain from before this check existed.
  if (newCname === `${record.original().get('cname')}`.trim()) return

  // Hostnames are stored lowercase (the update API lowercases them); any other write path must too.
  if (newCname !== newCname.toLowerCase()) {
    const msg = `[ERROR] [${id}] Custom domain ${newCname} must be lowercase.`
    log(`${msg}`)
    throw new BadRequestError(`Custom domain must be lowercase.`)
  }

  // Only check if cname is already in use locally (case-insensitively: older rows may still be mixed case)
  if (newCname.length > 0) {
    const result = new DynamicModel({
      id: '',
    })

    const inUse = (() => {
      try {
        $app
          .db()
          .newQuery(`select id from instances where lower(trim(cname)) = {:cname} and id <> {:id}`)
          .bind({ cname: newCname, id })
          .one(result)
      } catch (e) {
        return false
      }
      return true
    })()

    if (inUse) {
      const msg = `[ERROR] [${id}] Custom domain ${newCname} already in use.`
      log(`${msg}`)
      throw new BadRequestError(msg)
    }
  }
}
