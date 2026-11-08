import { mkLog } from '$util/Logger'
import { findOwnedInstance, resolveInstanceCaller } from '../lib/instanceCaller'

/** DELETE /api/instance/{id}. Dashboard (JWT) or a personal access token with write access to the instance. */
export const HandleInstanceDelete = (e: core.RequestEvent) => {
  const log = mkLog(`DELETE:instance`)

  log(`TOP OF DELETE`)
  let data = new DynamicModel({
    id: '',
  })

  e.bindBody(data)
  log(`After bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const id = e.request.pathValue('id')

  log(
    `vars`,
    JSON.stringify({
      id,
    })
  )

  const caller = resolveInstanceCaller(e, { kind: 'instance', instanceId: id })
  const record = findOwnedInstance(caller, id)
  log(`caller`, JSON.stringify(caller))

  if (record.getString('status').toLowerCase() !== 'idle') {
    throw new BadRequestError(`Instance must be shut down first.`)
  }

  $app.delete(record)

  return e.json(200, { status: 'ok' })
}
