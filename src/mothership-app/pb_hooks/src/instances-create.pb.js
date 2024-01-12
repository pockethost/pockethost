/*
{
  "subdomain": "foo"
}
*/
routerAdd(
  'POST',
  '/api/instance',
  (c) => {
    const dao = $app.dao()
    const { audit, mkLog } = /** @type {Lib} */ (require(`${__hooks}/lib.js`))

    const log = mkLog(`POST:instance`)

    const authRecord = /** @type {models.Record} */ (c.get('authRecord')) // empty if not authenticated as regular auth record
    log(`***authRecord`, JSON.stringify(authRecord))

    if (!authRecord) {
      throw new Error(`Expected authRecord here`)
    }

    log(`***TOP OF POST`)
    let data = /** @type{ {subdomain?: string} } */ (
      new DynamicModel({
        subdomain: '',
      })
    )

    log(`***before bind`)

    c.bind(data)

    log(`***after bind`)

    // This is necessary for destructuring to work correctly
    data = JSON.parse(JSON.stringify(data))

    const { subdomain } = data

    log(`***vars`, JSON.stringify({ subdomain }))

    if (!subdomain) {
      throw new BadRequestError(
        `Subdomain is required when creating an instance.`,
      )
    }

    const { versions } = require(`${__hooks}/versions.js`)

    const collection = dao.findCollectionByNameOrId('instances')
    const record = new Record(collection)
    record.set('uid', authRecord.getId())
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
