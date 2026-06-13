import { mkLog } from '$util/Logger'

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

  const authRecord = e.auth
  log(`authRecord`, JSON.stringify(authRecord))

  if (!authRecord) {
    throw new BadRequestError(`Expected authRecord here`)
  }

  const record = $app.findRecordById('instances', id)
  if (!record) {
    throw new BadRequestError(`Instance ${id} not found.`)
  }
  if (record.get('uid') !== authRecord.id) {
    throw new BadRequestError(`Not authorized`)
  }

  if (record.getString('status').toLowerCase() !== 'idle') {
    throw new BadRequestError(`Instance must be shut down first.`)
  }

  $app.delete(record)

  return e.json(200, { status: 'ok' })
}
