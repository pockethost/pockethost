/// <reference path="../types/types.d.ts" />

/*
{
  "instanceId": "kz4ngg77eaw1ho0",
  "fields": {
    "maintenance": true
    "name": '',
    "version": ''
  }
}
*/
routerAdd(
  'PUT',
  '/api/instance',
  (c) => {
    console.log(`***TOP OF PUt`)
    let data = new DynamicModel({
      // describe the shape of the fields to read (used also as initial values)
      instanceId: '',
      fields: {
        maintenance: null,
        name: null,
        version: null,
        secrets: null,
      },
    })

    c.bind(data)

    // This is necessary for destructuring to work correctly
    data = JSON.parse(JSON.stringify(data))

    const {
      instanceId,
      fields: { maintenance, name, version, secrets },
    } = data

    console.log(
      `***vars`,
      JSON.stringify({ instanceId, maintenance, name, version, secrets }),
    )

    const record = $app.dao().findRecordById('instances', instanceId)
    const authRecord = c.get('authRecord') // empty if not authenticated as regular auth record
    console.log(`***authRecord`, JSON.stringify(authRecord))

    if (!authRecord) {
      throw new Error(`Expected authRecord here`)
    }
    if (record.get('uid') !== authRecord.id) {
      throw new BadRequestError(`Not authorized`)
    }

    function cleanObject(obj) {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          acc[key] = value
        }
        return acc
      }, {})
    }

    console.log(`***original`, JSON.stringify(data))
    const sanitized = cleanObject({
      subdomain: name,
      version,
      maintenance,
      secrets,
    })
    console.log(`***sanitized`, JSON.stringify(sanitized))

    const form = new RecordUpsertForm($app, record)
    form.loadData(sanitized)
    form.submit()

    return c.json(200, { status: 'ok' })
  },
  $apis.requireRecordAuth(),
)
