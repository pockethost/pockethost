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

/** Read a JSON array field from a record in Goja — see pocketbase-jsvm/quirks.md § toString. */
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
  log(`bindBody: content-type=${contentType}`)

  let data = new DynamicModel({
    trusted_ips: [],
  }) as { trusted_ips: unknown }

  // Don't read e.request.body before this (e.g. readerToString for logging): it drains the stream and
  // bindBody then fails with EOF, so every save returned a generic 400.
  try {
    e.bindBody(data)
  } catch (error) {
    throw new BadRequestError(`Could not read trusted_ips from the request: ${clientErrorMessage(error)}`)
  }

  data = JSON.parse(JSON.stringify(data))
  log(`bindBody: trusted_ips=${describeValue(data.trusted_ips)}`)

  if (!(`trusted_ips` in data)) {
    throw new BadRequestError(`trusted_ips is required`)
  }

  return data
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
