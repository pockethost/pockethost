/// <reference path="../types/types.d.ts" />

/**
 * Validate instance version
 */
onModelBeforeCreate((e) => {
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
