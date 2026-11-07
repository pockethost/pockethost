import { type InstanceWebhookCollection } from '$common'
import { ensureCustomHostname } from '$util/cloudflare'
import { mkLog, StringKvLookup } from '$util/Logger'
import { removeEmptyKeys } from '$util/removeEmptyKeys'

export const HandleInstanceUpdate = (e: core.RequestEvent) => {
  const log = mkLog(`PUT:instance`)

  log(`TOP OF PUT`)

  let data = new DynamicModel({
    id: '',
    fields: {
      subdomain: null,
      power: null,
      version: null,
      secrets: null,
      webhooks: null,
      syncAdmin: null,
      autoVacuum: null,
      dev: null,
      cname: null,
    },
  }) as {
    id: string
    fields: {
      subdomain: string | null
      power: boolean | null
      version: string | null
      secrets: StringKvLookup | null
      webhooks: InstanceWebhookCollection | null
      syncAdmin: boolean | null
      autoVacuum: boolean | null
      dev: boolean | null
      cname: string | null
    }
  }

  e.bindBody(data)
  log(`After bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const id = e.request.pathValue('id')
  const {
    fields: { subdomain, power, version, secrets, webhooks, syncAdmin, autoVacuum, dev, cname },
  } = data

  log(
    `vars`,
    JSON.stringify({
      id,
      subdomain,
      power,
      version,
      secrets,
      webhooks,
      syncAdmin,
      autoVacuum,
      dev,
      cname,
    })
  )

  const record = $app.findRecordById('instances', id)
  const authRecord = e.auth
  log(`authRecord`, JSON.stringify(authRecord))

  if (!authRecord) {
    throw new Error(`Expected authRecord here`)
  }
  if (record.get('uid') !== authRecord.id) {
    throw new BadRequestError(`Not authorized`)
  }

  // Check if CNAME changed and handle Cloudflare
  const oldCname = record.getString('cname').trim()
  const newCname = cname !== null ? cname.trim() : null
  const cnameChanged = newCname !== null && oldCname !== newCname

  // Register whenever the domain is saved, even unchanged: saving again re-adds a hostname the daily
  // sweep removed (expired cert, moved DNS). A working entry is left alone. The old hostname
  // (if the domain changed) is removed by the sweep once no instance uses it.
  if (newCname !== null && newCname.length > 0) {
    log(`CNAME saved ("${oldCname}" -> "${newCname}") - registering with Cloudflare`)

    if (ensureCustomHostname(newCname, log)) {
      log(`Cloudflare custom hostname ready for "${newCname}" - frontend will poll for health`)
    }
  }

  const recordAutoVacuum = record.getBool('autoVacuum')
  const advancedFieldChanging =
    (subdomain !== null && subdomain !== record.getString('subdomain')) ||
    (version !== null && version !== record.getString('version')) ||
    (syncAdmin !== null && syncAdmin !== record.getBool('syncAdmin')) ||
    (autoVacuum !== null && autoVacuum !== recordAutoVacuum) ||
    (dev !== null && dev !== record.getBool('dev')) ||
    cnameChanged

  if (advancedFieldChanging) {
    if (record.getBool('power') || record.getString('status').toLowerCase() !== 'idle') {
      throw new BadRequestError(`Instance must be powered off first.`)
    }
  }

  const sanitized = removeEmptyKeys({
    subdomain,
    version,
    power,
    secrets,
    webhooks,
    syncAdmin,
    autoVacuum,
    dev,
    cname,
  })

  for (const [key, value] of Object.entries(sanitized)) {
    record.set(key, value)
  }
  $app.save(record)

  return e.json(200, { status: 'ok' })
}
