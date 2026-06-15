import { ClientResponseError, PocketBase, type AuthModel } from './pocketbase'

const isNotFound = (e: unknown) => e instanceof ClientResponseError && e.status === 404

type LegacyAdminResponse = {
  token: string
  admin?: AuthModel
  record?: AuthModel
  id?: string
  email?: string
}

const adminBaseUrl = (client: PocketBase) => client.baseURL.replace(/\/$/, '')

const legacyAdminFetch = async (client: PocketBase, path: string, body: Record<string, string>) => {
  const res = await fetch(`${adminBaseUrl(client)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json().catch(() => ({}))) as LegacyAdminResponse | Record<string, never>

  if (!res.ok) {
    throw new ClientResponseError({ url: res.url, status: res.status, data })
  }

  return data as LegacyAdminResponse
}

/** Authenticate as mothership admin. SDK `_superusers` first, legacy `/api/admins` on 404. */
export async function adminAuthWithPassword(client: PocketBase, email: string, password: string) {
  try {
    return await client.admins.authWithPassword(email, password)
  } catch (e) {
    if (!isNotFound(e)) throw e

    const data = await legacyAdminFetch(client, '/api/admins/auth-with-password', {
      identity: email,
      password,
    })

    client.authStore.save(data.token, data.admin ?? data.record)
    return data
  }
}

/** Create the first mothership admin when none exist. */
export async function createFirstAdmin(client: PocketBase, email: string, password: string) {
  try {
    return await client.admins.create({ email, password, passwordConfirm: password })
  } catch (e) {
    if (!isNotFound(e)) throw e

    return legacyAdminFetch(client, '/api/admins', {
      email,
      password,
      passwordConfirm: password,
    })
  }
}
