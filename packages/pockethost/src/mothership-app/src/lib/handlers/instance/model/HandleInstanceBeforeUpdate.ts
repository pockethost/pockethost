import { mkLog } from '$util/Logger'
import { versions } from '$util/versions'

export const HandleInstanceBeforeUpdate = (e: core.ModelEvent) => {
  const dao = e.dao || $app.dao()

  const log = mkLog(`instances-validate-before-update`)

  const version = e.model.get('version')
  if (!versions.includes(version)) {
    throw new BadRequestError(
      `Invalid version '${version}'. Version must be one of: ${versions.join(
        ', ',
      )}`,
    )
  }

  const id = e.model.getId()
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
      throw new BadRequestError(`Custom domain already in use.`)
    }
  }
}
