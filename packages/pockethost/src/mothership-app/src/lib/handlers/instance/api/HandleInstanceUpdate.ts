import { type InstanceWebhookCollection } from '$common'
import { ensureCustomHostname } from '$util/cloudflare'
import { mkLog, StringKvLookup } from '$util/Logger'
import { removeEmptyKeys } from '$util/removeEmptyKeys'
import { isAvailable } from '../../signup/isAvailable'
import { findOwnedInstance, resolveInstanceCaller } from '../lib/instanceCaller'
import { applySecretsPatch, instanceNameError, invalidSecretKey } from '../lib/instancePolicy'

/**
 * PUT /api/instance/{id}. Called by the dashboard (JWT) and by the CLI with a personal access token that has write
 * access to the instance. Besides the full `secrets` map, accepts `secretsPatch` (`{ KEY: value | null }`) so a token
 * can change one secret without reading the others.
 */
export const HandleInstanceUpdate = (e: core.RequestEvent) => {
  const log = mkLog(`PUT:instance`)

  log(`TOP OF PUT`)
  const id = e.request.pathValue('id')
  const caller = resolveInstanceCaller(e, { kind: 'instance', instanceId: id })

  let data = new DynamicModel({
    id: '',
    fields: {
      subdomain: null,
      power: null,
      version: null,
      secrets: null,
      secretsPatch: null,
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
      secretsPatch: Record<string, string | null> | null
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

  const {
    fields: { subdomain, power, version, secretsPatch, webhooks, syncAdmin, autoVacuum, dev, cname },
  } = data
  let { secrets } = data.fields

  log(
    `vars`,
    JSON.stringify({
      id,
      subdomain,
      power,
      version,
      // Names only: never log secret values.
      secrets: secrets === null ? null : Object.keys(secrets),
      secretsPatch: secretsPatch === null ? null : Object.keys(secretsPatch),
      webhooks,
      syncAdmin,
      autoVacuum,
      dev,
      cname,
    })
  )

  const record = findOwnedInstance(caller, id)
  log(`caller`, JSON.stringify(caller))

  if (secretsPatch !== null) {
    if (secrets !== null) throw new BadRequestError(`Send either secrets or secretsPatch, not both.`)
    const current = (JSON.parse(record.getString('secrets') || 'null') ?? {}) as Record<string, string>
    secrets = applySecretsPatch(current, secretsPatch)
  }
  if (secrets !== null) {
    const bad = invalidSecretKey(Object.keys(secrets))
    if (bad !== null) {
      throw new BadRequestError(`Invalid secret name ${bad}: use A-Z, 0-9 and _, starting with a letter.`)
    }
  }

  if (subdomain !== null && subdomain !== record.getString('subdomain')) {
    const nameError = instanceNameError(subdomain)
    if (nameError) throw new BadRequestError(nameError)
    if (!isAvailable(subdomain)) throw new BadRequestError(`Instance name ${subdomain} is not available.`)
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
