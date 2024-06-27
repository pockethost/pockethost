/// <reference path="../types/types.d.ts" />

/** Validate instance version */
onModelBeforeCreate((e) => {
  const { versions } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))

  const dao = e.dao || $app.dao()

  const version = e.model.get('version')
  if (!versions.includes(version)) {
    throw new BadRequestError(
      `Invalid version ${version}. Version must be one of: ${versions.join(
        ', ',
      )}`,
    )
  }
}, 'instances')
