import { mkLog } from '$util/Logger'

export const HandleInstanceDelete = (c: core.RequestEvent) => {
  const dao = $app

  const log = mkLog(`DELETE:instance`)

  log(`TOP OF DELETE`)
  let data = new DynamicModel({
    id: '',
  })

  c.bindBody(data)
  log(`After bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const id = c.request?.pathValue('id')

  if(!id) {
    throw new BadRequestError(`Instance ID is required.`)
  }

  log(
    `vars`,
    JSON.stringify({
      id,
    })
  )

  const authRecord = c.auth // empty if not authenticated as regular auth record
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

  const path = [$os.getenv('DATA_ROOT'), id].join('/')
  log(`path ${path}`)
  const res = $os.removeAll(path)
  log(`res`, res)

  dao.delete(record)

  return c.json(200, { status: 'ok' })
}
