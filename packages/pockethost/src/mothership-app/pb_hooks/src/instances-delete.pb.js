/*
{
  "id": "kz4ngg77eaw1ho0",
  "fields": {
    "maintenance": true
    "name": '',
    "version": ''
  }
}
*/
routerAdd(
  'DELETE',
  '/api/instance/:id',
  (c) => {
    const dao = $app.dao()
    const { audit, mkLog } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))

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

    const authRecord = /** @type {models.Record} */ (c.get('authRecord')) // empty if not authenticated as regular auth record
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

    dao.deleteRecord(record)

    return c.json(200, { status: 'ok' })
  },
  $apis.requireRecordAuth(),
)
