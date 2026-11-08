import { mkLog } from '$util/Logger'
import { listVersions } from '$util/versions'
import { isAvailable } from '../../signup/isAvailable'
import { resolveInstanceCaller } from '../lib/instanceCaller'
import { assertCanCreateInstance } from '../lib/instanceLimits'
import { instanceNameError } from '../lib/instancePolicy'

/** POST /api/instance. Dashboard (JWT) or a personal access token for all instances with write access. */
export const HandleInstanceCreate = (e: core.RequestEvent) => {
  const log = mkLog(`POST:instance`)
  const caller = resolveInstanceCaller(e, { kind: 'create' })
  log(`caller`, JSON.stringify(caller))

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
  const nameError = instanceNameError(subdomain)
  if (nameError) throw new BadRequestError(nameError)
  if (!isAvailable(subdomain)) throw new BadRequestError(`Instance name ${subdomain} is not available.`)

  assertCanCreateInstance(caller.userId)

  const collection = $app.findCollectionByNameOrId('instances')
  const record = new Record(collection)
  record.set('uid', caller.userId)
  record.set('subdomain', subdomain)
  record.set('power', true)
  record.set('status', 'idle')
  record.set('version', version)
  record.set('dev', true)
  record.set('syncAdmin', true)
  record.set('autoVacuum', true)

  $app.save(record)

  return e.json(200, { instance: record })
}
