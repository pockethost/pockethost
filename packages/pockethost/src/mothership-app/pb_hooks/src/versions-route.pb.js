/// <reference path="../types/types.d.ts" />

/** Return a list of available PocketBase versions */
routerAdd(
  'GET',
  '/api/versions',
  (c) => {
    const { versions } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))

    return c.json(200, { versions })
  } /* optional middlewares */,
)
