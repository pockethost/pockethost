import { mkLog } from '$util/Logger'

export const BeforeUpdate_cname = (e: core.RecordUpdateEvent) => {
  const log = mkLog(`BeforeUpdate_cname`)
  const record = e.record
  if (!record) return

  const id = record.id
  const newCname = record.get('cname').trim()

  // Only check if cname is already in use locally
  if (newCname.length > 0) {
    const result = new DynamicModel({
      id: '',
    })

    const inUse = (() => {
      try {
        $app.db().newQuery(`select id from instances where cname='${newCname}' and id <> '${id}'`).one(result)
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
    log(`CNAME validation passed for: "${newCname}"`)
  }
}
