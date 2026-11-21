import { mkLog } from '$util/Logger'
import { listSelectableVersions } from '$util/versions'
import { isAvailable } from '../../signup/isAvailable'
import { duplicateSourceError } from '../lib/duplicatePolicy'
import { findOwnedInstance, resolveInstanceCaller } from '../lib/instanceCaller'
import { assertCanCreateInstance } from '../lib/instanceLimits'
import { addOwner, syncLoginOf } from '../lib/instanceOwners'
import { instanceNameError } from '../lib/instancePolicy'

/**
 * POST /api/instance/{id}/duplicate `{ subdomain }`. Makes a new, powered-off instance on the source's edge, on the
 * latest PocketBase version, with the source's settings. The edge then copies the source's files into it
 * (`duplicateStatus` goes from `copying` to `ready` or `failed`). The source must be off, so the copy is consistent and
 * its hooks never run in two places. Dashboard (JWT) or a token with write access to every instance.
 */
export const HandleInstanceDuplicate = (e: core.RequestEvent) => {
  const log = mkLog(`POST:instance/duplicate`)
  const sourceId = e.request.pathValue('id')
  const caller = resolveInstanceCaller(e)
  const source = findOwnedInstance(caller, sourceId)

  let data = new DynamicModel({ subdomain: '' }) as { subdomain?: string }
  e.bindBody(data)
  data = JSON.parse(JSON.stringify(data))
  const subdomain = String(data.subdomain || '')
    .trim()
    .toLowerCase()

  const sourceError = duplicateSourceError({
    power: source.getBool('power'),
    status: source.getString('status'),
    suspension: source.getString('suspension'),
    duplicateStatus: source.getString('duplicateStatus'),
    edge: source.getString('edge'),
  })
  if (sourceError) throw new BadRequestError(sourceError)

  if (!subdomain) throw new BadRequestError(`Choose a name for the copy.`)
  const nameError = instanceNameError(subdomain)
  if (nameError) throw new BadRequestError(nameError)
  if (!isAvailable(subdomain)) throw new BadRequestError(`Instance name ${subdomain} is not available.`)

  assertCanCreateInstance(caller.userId)

  const version = listSelectableVersions()[0]
  if (!version) throw new BadRequestError(`No PocketBase version is available right now.`)

  const record = new Record($app.findCollectionByNameOrId('instances'))
  record.set('subdomain', subdomain)
  record.set('power', false)
  record.set('status', 'idle')
  record.set('version', version)
  // Same edge: the copy reads the source's files from that edge's disk.
  record.set('edge', source.getString('edge'))
  record.set('dev', source.getBool('dev'))
  record.set('autoVacuum', source.getBool('autoVacuum'))
  // Secrets carry PB_ENCRYPTION_KEY, without which the copy can't read the source's encrypted settings.
  record.set('secrets', source.get('secrets'))
  record.set('webhooks', source.get('webhooks'))
  record.set('firewall', source.get('firewall'))
  record.set('duplicateOf', source.id)
  record.set('duplicateStatus', 'copying')
  record.set('duplicateError', '')
  const syncLogin = syncLoginOf($app, source.id)
  $app.runInTransaction((txApp) => {
    txApp.save(record)
    addOwner(txApp, record.id, caller.userId, syncLogin)
  })

  log(`duplicated`, JSON.stringify({ source: source.id, copy: record.id, subdomain, version }))
  return e.json(200, { instance: record })
}
