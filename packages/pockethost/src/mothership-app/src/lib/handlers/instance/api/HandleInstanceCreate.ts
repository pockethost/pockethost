import { mkLog } from '$util/Logger'
import { listVersions } from '$util/versions'

export const HandleInstanceCreate = (e: core.RequestEvent) => {
  const log = mkLog(`POST:instance`)
  const authRecord = e.auth
  log(`authRecord`, JSON.stringify(authRecord))

  if (!authRecord) {
    throw new Error(`Expected authRecord here`)
  }

  log(`TOP OF POST`)
  let data = new DynamicModel({
    subdomain: '',
    version: listVersions()[0],
  }) as { subdomain?: string; version?: string }

  log(`before bind`)

  e.bindBody(data)

  log(`after bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const { subdomain, version } = data

  log(`vars`, JSON.stringify({ subdomain }))

  if (!subdomain) {
    throw new BadRequestError(`Subdomain is required when creating an instance.`)
  }

  const collection = $app.findCollectionByNameOrId('instances')
  const record = new Record(collection)
  record.set('uid', authRecord.id)
  record.set('subdomain', subdomain)
  record.set('power', true)
  record.set('status', 'idle')
  record.set('version', version)
  record.set('dev', true)
  record.set('syncAdmin', true)

  $app.save(record)

  return e.json(200, { instance: record })
}
