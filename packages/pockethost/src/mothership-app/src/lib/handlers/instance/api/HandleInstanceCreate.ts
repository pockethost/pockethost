import { mkLog } from '$util/Logger'
import { versions } from '$util/versions'

export const HandleInstanceCreate = (c: echo.Context) => {
  const dao = $app.dao()

  const log = mkLog(`POST:instance`)
  const authRecord = c.get('authRecord') as models.Record | undefined // empty if not authenticated as regular auth record
  log(`***authRecord`, JSON.stringify(authRecord))

  if (!authRecord) {
    throw new Error(`Expected authRecord here`)
  }

  log(`***TOP OF POST`)
  let data = new DynamicModel({
    subdomain: '',
    region: 'sfo-2',
  }) as { subdomain?: string; region?: string }

  log(`***before bind`)

  c.bind(data)

  log(`***after bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const { subdomain, region } = data

  log(`***vars`, JSON.stringify({ subdomain, region }))

  if (!subdomain) {
    throw new BadRequestError(
      `Subdomain is required when creating an instance.`,
    )
  }

  const collection = dao.findCollectionByNameOrId('instances')
  const record = new Record(collection)
  record.set('uid', authRecord.getId())
  record.set('region', region || `sfo-1`)
  record.set('subdomain', subdomain)
  record.set('status', 'idle')
  record.set('version', versions[0])
  record.set('dev', true)
  record.set('syncAdmin', true)
  record.set('notifyMaintenanceMode', true)

  const form = new RecordUpsertForm($app, record)
  form.submit()

  return c.json(200, { instance: record })
}
