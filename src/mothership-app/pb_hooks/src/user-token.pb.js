/// <reference path="../types/types.d.ts" />

/*
{
  "id": "user-id"
}
*/
routerAdd(
  'GET',
  '/api/userToken/:id',
  (c) => {
    const { mkLog } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))
    const log = mkLog(`user-token`)

    const id = c.pathParam('id')

    log({ id })

    if (!id) {
      throw new BadRequestError(`User ID is required.`)
    }

    const rec = $app.dao().findRecordById('users', id)
    const tokenKey = rec.getString('tokenKey')
    const passwordHash = rec.getString('passwordHash')
    const email = rec.getString(`email`)
    log({ email, passwordHash, tokenKey })

    return c.json(200, { email, passwordHash, tokenKey })
  },
  $apis.requireAdminAuth(),
)
