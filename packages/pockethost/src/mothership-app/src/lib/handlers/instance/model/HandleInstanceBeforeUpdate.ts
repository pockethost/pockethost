import { mkLog } from '$util/Logger'
import { versions } from '$util/versions'

export const HandleInstanceBeforeUpdate = (e: core.ModelEvent) => {
  const dao = e.dao || $app.dao()

  const log = mkLog(`instances-validate-before-update`)

  const id = e.model.getId()

  const version = e.model.get('version')
  if (!versions.includes(version)) {
    const msg = `[ERROR] Invalid version '${version}' for [${id}]. Version must be one of: ${versions.join(
      ', ',
    )}`
    log(`${msg}`)
    throw new BadRequestError(msg)
  }

  const cname = e.model.get('cname')
  if (cname.length > 0) {
    const result = new DynamicModel({
      id: '',
    })

    const inUse = (() => {
      try {
        dao
          .db()
          .newQuery(
            `select id from instances where cname='${cname}' and id <> '${id}'`,
          )
          .one(result)
      } catch (e) {
        // log(`*** cname OK ${cname}`)
        return false
      }
      return true
    })()

    if (inUse) {
      const msg = `[ERROR] [${id}] Custom domain ${cname} already in use.`
      log(`${msg}`)
      throw new BadRequestError(msg)
    }
  }
}
