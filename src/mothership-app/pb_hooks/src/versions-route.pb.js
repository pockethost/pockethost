/// <reference path="../types/types.d.ts" />

/**
 * Return a list of available PocketBase versions
 */
routerAdd(
  'GET',
  '/api/versions',
  (c) => {
    const { versions } = require(`${__hooks}/versions.js`)

    return c.json(200, { versions })
  } /* optional middlewares */,
)
