/// <reference path="../types/types.d.ts" />

/*
{
  "subdomain": "foo"
}
*/
routerAdd(
  'POST',
  '/api/instance',
  (c) => {
    const authRecord = c.get('authRecord') // empty if not authenticated as regular auth record
    console.log(`***authRecord`, JSON.stringify(authRecord))

    if (!authRecord) {
      throw new Error(`Expected authRecord here`)
    }

    console.log(`***TOP OF POST`)
    let data = new DynamicModel({
      subdomain: '',
    })

    console.log(`***before bind`)

    c.bind(data)

    console.log(`***after bind`)

    // This is necessary for destructuring to work correctly
    data = JSON.parse(JSON.stringify(data))

    const { subdomain } = data

    console.log(`***vars`, JSON.stringify({ subdomain }))

    if (!subdomain) {
      throw new BadRequestError(
        `Subdomain is required when creating an instance.`,
      )
    }

    const { versions } = require(`${__hooks}/versions.js`)

    const collection = $app.dao().findCollectionByNameOrId('instances')
    const record = new Record(collection)
    record.set('uid', authRecord.id)
    record.set('subdomain', subdomain)
    record.set('status', 'idle')
    record.set('version', versions[0])
    record.set('syncAdmin', true)
    record.set('notifyMaintenanceMode', true)

    const form = new RecordUpsertForm($app, record)
    form.submit()

    return c.json(200, { instance: record })
  },
  $apis.requireRecordAuth(),
)
