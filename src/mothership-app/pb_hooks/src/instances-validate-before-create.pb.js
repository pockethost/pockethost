/// <reference path="../types/types.d.ts" />

/**
 * Validate instance version
 */
onModelBeforeCreate((e) => {
  const { versions } = require(`${__hooks}/versions.pb.js`)

  if (!versions.includes(e.model.get('version'))) {
    throw new BadRequestError(
      `'version' must be one of: ${versions.join(', ')}`,
    )
  }
}, 'instances')
