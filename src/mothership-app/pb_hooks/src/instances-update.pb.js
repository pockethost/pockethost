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
  'PUT',
  '/api/instance/:id',
  (c) => {
    console.log(`***TOP OF PUT`)
    let data = new DynamicModel({
      id: '',
      fields: {
        maintenance: null,
        name: null,
        version: null,
        secrets: null,
        syncAdmin: null,
      },
    })

    c.bind(data)
    console.log(`***After bind`)

    // This is necessary for destructuring to work correctly
    data = JSON.parse(JSON.stringify(data))

    const id = c.pathParam('id')
    const {
      fields: { maintenance, name, version, secrets, syncAdmin },
    } = data

    console.log(
      `***vars`,
      JSON.stringify({
        id,
        maintenance,
        name,
        version,
        secrets,
        syncAdmin,
      }),
    )

    const record = $app.dao().findRecordById('instances', id)
    const authRecord = c.get('authRecord') // empty if not authenticated as regular auth record
    console.log(`***authRecord`, JSON.stringify(authRecord))

    if (!authRecord) {
      throw new Error(`Expected authRecord here`)
    }
    if (record.get('uid') !== authRecord.id) {
      throw new BadRequestError(`Not authorized`)
    }

    function cleanObject(obj) {
      console.log(`***original`, JSON.stringify(obj))
      const sanitized = Object.entries(obj).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          acc[key] = value
        }
        return acc
      }, {})
      console.log(`***sanitized`, JSON.stringify(sanitized))
      return sanitized
    }

    const sanitized = cleanObject({
      subdomain: name,
      version,
      maintenance,
      secrets,
      syncAdmin,
    })

    const form = new RecordUpsertForm($app, record)
    form.loadData(sanitized)
    form.submit()

    return c.json(200, { status: 'ok' })
  },
  $apis.requireRecordAuth(),
)
