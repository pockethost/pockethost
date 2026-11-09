import { bearerToken } from '$common/pat'
import { verifyPat } from '../lib/verifyPat'

const parseJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw || 'null') as T | null
  } catch {
    return null
  }
}

/**
 * GET /api/pat/instances with `Authorization: Bearer ph_pat_…`. Lists the token owner's instances that the token can
 * reach, for `pockethost list`, `link` and `show`.
 */
export const HandlePatInstances = (e: core.RequestEvent) => {
  const outcome = verifyPat(bearerToken(e.request?.header.get('Authorization')), e.realIP())
  if (!outcome.ok) {
    return e.json(outcome.status, { status: outcome.status, message: outcome.message })
  }
  const { result, user } = outcome
  const allowed = result.instanceIds === null ? null : new Set(result.instanceIds)
  const instances = $app
    .findRecordsByFilter('instances', 'uid = {:uid}', 'subdomain', 0, 0, { uid: user.id })
    .filter((r) => !!r && (allowed === null || allowed.has(r.id)))
    .map((r) => ({
      id: r!.id,
      subdomain: r!.getString('subdomain'),
      cname: r!.getString('cname'),
      status: r!.getString('status'),
      power: r!.getBool('power'),
      version: r!.getString('version'),
      region: r!.getString('region'),
      dev: r!.getBool('dev'),
      syncAdmin: r!.getBool('syncAdmin'),
      autoVacuum: r!.getBool('autoVacuum'),
      // Names only: a token can set secrets but never read their values back.
      secretNames: Object.keys(parseJson<Record<string, string>>(r!.getString('secrets')) ?? {}).sort(),
      webhooks: (parseJson<{ endpoint: string; value: string }[]>(r!.getString('webhooks')) ?? []).map((w) => ({
        endpoint: w.endpoint,
        value: w.value,
      })),
    }))
  return e.json(200, { instances })
}
