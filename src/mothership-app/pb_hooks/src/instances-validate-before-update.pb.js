/// <reference path="../types/types.d.ts" />

/**
 * Validate instance version
 */
onModelBeforeUpdate((e) => {
  const { versions } = require(`${__hooks}/versions.js`)

  const version = e.model.get('version')
  if (!versions.includes(version)) {
    throw new BadRequestError(
      `Invalid version ${version}. Version must be one of: ${versions.join(
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
        $app
          .dao()
          .db()
          .newQuery(
            `select id from instances where cname='${cname}' and id <> '${id}'`,
          )
          .one(result)
      } catch (e) {
        console.log(`*** cname OK ${cname}`)
        return false
      }
      return true
    })()

    if (inUse) {
      throw new BadRequestError(`Custom domain already in use.`)
    }
  }
}, 'instances')
