import { authEdge } from '$util/edgeAuth'
import { mkLog } from '$util/Logger'

export const HandleUserTokenRequest = (e: core.RequestEvent) => {
  const log = mkLog(`user-token`)

  const id = e.request.pathValue('id')

  // log({ id })

  if (!id) {
    throw new BadRequestError(`User ID is required.`)
  }

  // An edge gets the login only of users who own an instance on it (it syncs them as that instance's superuser).
  const edge = authEdge(e)
  if (edge) {
    const owns = $app.findRecordsByFilter('instances', 'uid = {:uid} && edge = {:edge}', '', 1, 0, {
      uid: id,
      edge: edge.id,
    })
    if (owns.length === 0) throw new ForbiddenError(`No instance of this user runs on this edge.`)
  }

  const rec = $app.findRecordById('users', id)
  const tokenKey = rec.getString('tokenKey')
  const passwordHash = rec.getString('password:hash')
  const email = rec.getString(`email`)
  // log({ email, passwordHash, tokenKey })

  return e.json(200, { email, passwordHash, tokenKey })
}
