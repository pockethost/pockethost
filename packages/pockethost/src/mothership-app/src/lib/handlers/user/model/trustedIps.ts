import { normalizeTrustedIpList, validateTrustedIpListForSubscription } from '$common/trustedIps'
import { mkLog } from '$util/Logger'

const log = mkLog(`trusted-ips`)

const describeValue = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return `${value}`
  }
}

const clientErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return `${error}`
}

/** Read a JSON array field from a record in Goja — see pocketbase-jsvm/constraints.md § toString. */
export const readTrustedIpsFromRecord = (record: models.Record): unknown => {
  try {
    const raw = record.get(`trusted_ips`)
    if (raw == null) return null

    const roundTripped = JSON.parse(JSON.stringify(raw)) as unknown
    if (Array.isArray(roundTripped) && roundTripped.length > 0 && typeof roundTripped[0] === 'string') {
      return roundTripped
    }
    if (Array.isArray(roundTripped) && roundTripped.length === 0) {
      return roundTripped
    }

    return JSON.parse(toString(raw))
  } catch {
    return null
  }
}

const validateTrustedIpsForSubscription = (raw: unknown, subscription: string | undefined) => {
  try {
    return validateTrustedIpListForSubscription(raw, subscription)
  } catch (error) {
    throw new BadRequestError(clientErrorMessage(error))
  }
}

const bindTrustedIpsBody = (e: core.RequestEvent): { trusted_ips: unknown } => {
  const contentType = e.request.header.get(`Content-Type`) || `(none)`
  const rawBody = readerToString(e.request.body)
  log(`bindBody: content-type=${contentType} rawBody=${rawBody}`)

  let data = new DynamicModel({
    trusted_ips: [],
  }) as { trusted_ips: unknown }

  e.bindBody(data)
  log(`bindBody: after bind trusted_ips=${describeValue(data.trusted_ips)} typeof=${typeof data.trusted_ips}`)

  data = JSON.parse(JSON.stringify(data))
  log(`bindBody: after round-trip trusted_ips=${describeValue(data.trusted_ips)}`)

  const requestInfoBody = e.requestInfo().body
  log(`bindBody: requestInfo().body=${describeValue(requestInfoBody)}`)

  if (!(`trusted_ips` in data)) {
    throw new BadRequestError(`trusted_ips is required`)
  }

  return data
}

export const validateUserTrustedIps = (record: models.Record) => {
  const subscription = record.getString(`subscription`)
  const raw = readTrustedIpsFromRecord(record)
  log(`validateUserTrustedIps: user=${record.id} subscription=${subscription} raw=${describeValue(raw)}`)

  const normalized = validateTrustedIpsForSubscription(raw, subscription)
  log(`validateUserTrustedIps: normalized=${describeValue(normalized)}`)

  record.set(`trusted_ips`, normalized.length > 0 ? normalized : null)
}

export const HandleUserTrustedIpsUpdate = (e: core.RequestEvent) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new UnauthorizedError(`Authentication required`)
  }

  log(`PATCH: user=${authRecord.id} subscription=${authRecord.getString(`subscription`)}`)

  const { trusted_ips: rawTrustedIps } = bindTrustedIpsBody(e)
  log(`PATCH: rawTrustedIps=${describeValue(rawTrustedIps)}`)

  const subscription = authRecord.getString(`subscription`)
  const normalized = validateTrustedIpsForSubscription(rawTrustedIps, subscription)
  log(`PATCH: normalized=${describeValue(normalized)}`)

  const user = $app.findRecordById(`users`, authRecord.id)
  const before = readTrustedIpsFromRecord(user)
  log(`PATCH: before save stored=${describeValue(before)}`)

  user.set(`trusted_ips`, normalized.length > 0 ? normalized : null)
  $app.save(user)

  const after = readTrustedIpsFromRecord(user)
  log(`PATCH: after save stored=${describeValue(after)}`)

  return e.json(200, { trusted_ips: normalized })
}

export const HandleUserTrustedIpsGet = (e: core.RequestEvent) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new UnauthorizedError(`Authentication required`)
  }

  const user = $app.findRecordById(`users`, authRecord.id)
  const raw = readTrustedIpsFromRecord(user)
  log(`GET: user=${authRecord.id} raw=${describeValue(raw)}`)

  let trusted_ips
  try {
    trusted_ips = normalizeTrustedIpList(raw)
  } catch (error) {
    throw new BadRequestError(clientErrorMessage(error))
  }
  log(`GET: normalized=${describeValue(trusted_ips)}`)

  return e.json(200, { trusted_ips })
}
