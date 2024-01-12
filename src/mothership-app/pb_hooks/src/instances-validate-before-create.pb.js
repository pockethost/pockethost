/// <reference path="../types/types.d.ts" />

/** Validate instance version */
onModelBeforeCreate((e) => {
  const dao = e.dao || $app.dao()
  const { versions } = require(`${__hooks}/versions.js`)

  const version = e.model.get('version')
  if (!versions.includes(version)) {
    throw new BadRequestError(
      `Invalid version ${version}. Version must be one of: ${versions.join(
        ', ',
      )}`,
    )
  }
}, 'instances')
