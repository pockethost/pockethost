import { mkLog } from '$util/Logger'

export const HandleUserTokenRequest = (e: core.RequestEvent) => {
  const log = mkLog(`user-token`)

  const id = e.request.pathValue('id')

  // log({ id })

  if (!id) {
    throw new BadRequestError(`User ID is required.`)
  }

  const rec = $app.findRecordById('users', id)
  const tokenKey = rec.getString('tokenKey')
  const passwordHash = rec.getString('password:hash')
  const email = rec.getString(`email`)
  // log({ email, passwordHash, tokenKey })

  return e.json(200, { email, passwordHash, tokenKey })
}
