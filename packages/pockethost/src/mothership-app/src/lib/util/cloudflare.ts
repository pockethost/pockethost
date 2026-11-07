import { Logger } from './Logger'

/** A Cloudflare for SaaS custom hostname (only the fields we use). */
export type CustomHostname = {
  id: string
  hostname: string
  status: string
  created_at: string
  ssl?: { status?: string }
}

export const DEAD_STATUSES = ['moved', 'blocked', 'pending_blocked', 'deleted']
export const DEAD_SSL_STATUSES = ['expired', 'deleted']
export const isDeadHostname = (h: CustomHostname) => {
  const ssl = h.ssl?.status || ''
  return DEAD_STATUSES.includes(h.status) || DEAD_SSL_STATUSES.includes(ssl) || ssl.endsWith('_timed_out')
}

type CfResponse = { statusCode: number; json: any }

const cfCall = (path: string, method: string, body?: any, log?: Logger): CfResponse | null => {
  const apiToken = $os.getenv('MOTHERSHIP_CLOUDFLARE_API_TOKEN')
  const zoneId = $os.getenv('MOTHERSHIP_CLOUDFLARE_ZONE_ID')

  if (!apiToken || !zoneId) {
    log?.('Cloudflare API credentials not configured - skipping Cloudflare operations')
    return null
  }

  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/${path}`
  try {
    const res = $http.send({
      url,
      method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : '',
      timeout: 30,
    })
    if (res.statusCode < 200 || res.statusCode >= 300) {
      log?.(`Cloudflare ${method} ${path} failed: ${res.statusCode}`, res.json)
    }
    return { statusCode: res.statusCode, json: res.json }
  } catch (error) {
    log?.(`Cloudflare ${method} ${path} error:`, `${error}`)
    return null
  }
}

const ok = (res: CfResponse | null) => !!res && res.statusCode >= 200 && res.statusCode < 300

export const createCustomHostname = (hostname: string, log?: Logger) =>
  ok(cfCall('custom_hostnames', 'POST', { hostname, ssl: { method: 'http', type: 'dv' } }, log))

export const deleteCustomHostnameById = (id: string, log?: Logger) =>
  ok(cfCall(`custom_hostnames/${id}`, 'DELETE', undefined, log))

/** All custom hostnames on the zone. Returns null if any page fails, so callers never act on a partial list. */
export const listCustomHostnames = (log?: Logger): CustomHostname[] | null => {
  const all: CustomHostname[] = []
  for (let page = 1; ; page++) {
    const res = cfCall(`custom_hostnames?per_page=50&page=${page}`, 'GET', undefined, log)
    if (!ok(res) || !res!.json?.success) return null
    const result = (res!.json.result || []) as CustomHostname[]
    all.push(...result)
    const totalPages = res!.json.result_info?.total_pages || 1
    if (page >= totalPages || result.length === 0) break
  }
  return all
}

export const findCustomHostname = (hostname: string, log?: Logger): CustomHostname | null => {
  const res = cfCall(`custom_hostnames?hostname=${encodeURIComponent(hostname)}`, 'GET', undefined, log)
  if (!ok(res)) return null
  const match = ((res!.json?.result || []) as CustomHostname[]).find(
    (h) => h.hostname.toLowerCase() === hostname.toLowerCase()
  )
  return match || null
}

/**
 * Make sure Cloudflare has a working entry for this hostname. Leaves an active or still-validating entry alone;
 * replaces a dead one (expired/deleted cert, moved, blocked, timed out) with a fresh one.
 */
export const ensureCustomHostname = (hostname: string, log?: Logger) => {
  const existing = findCustomHostname(hostname, log)
  if (existing) {
    if (!isDeadHostname(existing)) return true
    log?.(`Replacing dead Cloudflare hostname ${hostname} (${existing.status}/${existing.ssl?.status})`)
    deleteCustomHostnameById(existing.id, log)
  }
  return createCustomHostname(hostname, log)
}
