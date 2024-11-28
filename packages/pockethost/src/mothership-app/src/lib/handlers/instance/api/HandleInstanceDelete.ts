import { mkLog } from '$util/Logger'

export const HandleInstanceDelete = (c: echo.Context) => {
  const dao = $app.dao()

  const log = mkLog(`DELETE:instance`)

  log(`TOP OF DELETE`)
  let data = new DynamicModel({
    id: '',
  })

  c.bind(data)
  log(`After bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const id = c.pathParam('id')

  log(
    `vars`,
    JSON.stringify({
      id,
    }),
  )

  const authRecord = c.get('authRecord') as models.Record | undefined // empty if not authenticated as regular auth record
  log(`authRecord`, JSON.stringify(authRecord))

  if (!authRecord) {
    throw new BadRequestError(`Expected authRecord here`)
  }

  const record = dao.findRecordById('instances', id)
  if (!record) {
    throw new BadRequestError(`Instance ${id} not found.`)
  }
  if (record.get('uid') !== authRecord.id) {
    throw new BadRequestError(`Not authorized`)
  }

  if (record.getString('status').toLowerCase() !== 'idle') {
    throw new BadRequestError(`Instance must be shut down first.`)
  }

  const url = `http://localhost:3000/_api/instance/${id}`
  log(`Sending to ${url}`)
  const res = $http.send({
    url,
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    timeout: 120, // in seconds
  })
  log(`res`, res)

  dao.deleteRecord(record)

  return c.json(200, { status: 'ok' })
}
