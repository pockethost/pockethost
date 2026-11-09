import { DAEMON_PORT, mkInternalUrl } from '@'

const VACUUM_BASE = () => `${mkInternalUrl(DAEMON_PORT())}/_api/daemon/vacuum`
const HEALTH_URL = () => `${mkInternalUrl(DAEMON_PORT())}/_api/daemon/health`

const secretHeaders = (): Record<string, string> => {
  const secret = process.env.PH_SECRET
  if (!secret) {
    throw new Error(`PH_SECRET is not set`)
  }
  return {
    'content-type': `application/json`,
    'x-pockethost-secret': secret,
  }
}

export const assertEdgeReady = async (): Promise<boolean> => {
  try {
    const res = await fetch(HEALTH_URL(), { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

export const assertVacuumClientReady = async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
  if (!process.env.PH_SECRET) {
    return { ok: false, reason: `PH_SECRET is not set` }
  }
  if (!(await assertEdgeReady())) {
    return { ok: false, reason: `edge daemon unreachable` }
  }
  return { ok: true }
}

type LockResponse = {
  granted: Array<{ instanceId: string; token: string }>
  denied: Array<{ instanceId: string; reason: string }>
}

export const lockInstance = async (
  instanceId: string
): Promise<{ granted: true; token: string } | { granted: false; reason: string }> => {
  const res = await fetch(`${VACUUM_BASE()}/lock`, {
    method: `POST`,
    headers: secretHeaders(),
    body: JSON.stringify({ instanceIds: [instanceId] }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`lock failed: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as LockResponse
  const grant = data.granted.find((entry) => entry.instanceId === instanceId)
  if (grant) {
    return { granted: true, token: grant.token }
  }

  const denial = data.denied.find((entry) => entry.instanceId === instanceId)
  return { granted: false, reason: denial?.reason ?? `denied` }
}

export const unlockInstance = async (instanceId: string, token: string): Promise<void> => {
  const res = await fetch(`${VACUUM_BASE()}/unlock`, {
    method: `POST`,
    headers: secretHeaders(),
    body: JSON.stringify({ locks: [{ instanceId, token }] }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`unlock failed: ${res.status} ${res.statusText}`)
  }
}
