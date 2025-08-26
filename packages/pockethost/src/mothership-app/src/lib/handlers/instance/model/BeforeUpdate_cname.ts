import { mkLog } from '$util/Logger'

export const BeforeUpdate_cname = (e: core.RecordEvent) => {
  const dao = $app
  const log = mkLog(`BeforeUpdate_cname`)
  const id = e.record?.get('id')
  const newCname = e.record?.get('cname').trim()

  // Only check if cname is already in use locally
  if (newCname.length > 0) {
    const result = new DynamicModel({
      id: '',
    })

    const inUse = (() => {
      try {
        dao.db().newQuery(`select id from instances where cname='${newCname}' and id <> '${id}'`).one(result)
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
  e.next()
}
