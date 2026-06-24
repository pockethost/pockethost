import { normalizeTrustedIpList, validateTrustedIpListForSubscription } from '$common/trustedIps'

const readTrustedIps = (record: models.Record): unknown => {
  try {
    return record.get(`trusted_ips`)
  } catch {
    return null
  }
}

export const validateUserTrustedIps = (record: models.Record) => {
  const subscription = record.getString(`subscription`)
  const normalized = validateTrustedIpListForSubscription(readTrustedIps(record), subscription)
  record.set(`trusted_ips`, normalized.length > 0 ? normalized : null)
}

export const HandleUserTrustedIpsUpdate = (e: core.RequestEvent) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new UnauthorizedError(`Authentication required`)
  }

  const parsed = (() => {
    try {
      return JSON.parse(readerToString(e.request.body))
    } catch {
      throw new BadRequestError(`Invalid JSON body`)
    }
  })()

  if (!(`trusted_ips` in parsed)) {
    throw new BadRequestError(`trusted_ips is required`)
  }

  const subscription = authRecord.getString(`subscription`)
  const normalized = validateTrustedIpListForSubscription(parsed.trusted_ips, subscription)

  const user = $app.findRecordById(`users`, authRecord.id)
  user.set(`trusted_ips`, normalized.length > 0 ? normalized : null)
  validateUserTrustedIps(user)
  $app.save(user)

  return e.json(200, { trusted_ips: normalized })
}

export const HandleUserTrustedIpsGet = (e: core.RequestEvent) => {
  const authRecord = e.auth
  if (!authRecord) {
    throw new UnauthorizedError(`Authentication required`)
  }

  const user = $app.findRecordById(`users`, authRecord.id)
  const trusted_ips = normalizeTrustedIpList(readTrustedIps(user))

  return e.json(200, { trusted_ips })
}
