/// <reference path="../types/types.d.ts" />

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
    console.log(`***TOP OF DELETE`)
    let data = new DynamicModel({
      id: '',
    })

    c.bind(data)
    console.log(`***After bind`)

    // This is necessary for destructuring to work correctly
    data = JSON.parse(JSON.stringify(data))

    const id = c.pathParam('id')

    console.log(
      `***vars`,
      JSON.stringify({
        id,
      }),
    )

    const authRecord = c.get('authRecord') // empty if not authenticated as regular auth record
    console.log(`***authRecord`, JSON.stringify(authRecord))

    if (!authRecord) {
      throw new BadRequestError(`Expected authRecord here`)
    }

    const record = $app.dao().findRecordById('instances', id)
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
    console.log(`***path ${path}`)
    const res = $os.removeAll(path)
    console.log(`***res`, res)

    $app.dao().deleteRecord(record)

    return c.json(200, { status: 'ok' })
  },
  $apis.requireRecordAuth(),
)
