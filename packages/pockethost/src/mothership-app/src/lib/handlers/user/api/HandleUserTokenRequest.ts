import { mkLog } from '$util/Logger'

export const HandleUserTokenRequest = (c: core.RequestEvent) => {
  const dao = $app
  const log = mkLog(`user-token`)

  const id = c.request?.pathValue('id')

  // log({ id })

  if (!id) {
    throw new BadRequestError(`User ID is required.`)
  }

  const rec = dao.findRecordById('users', id)
  const tokenKey = rec.getString('tokenKey')
  const passwordHash = rec.getString('passwordHash')
  const email = rec.getString(`email`)
  // log({ email, passwordHash, tokenKey })

  return c.json(200, { email, passwordHash, tokenKey })
}
