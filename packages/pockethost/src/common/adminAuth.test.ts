import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminAuthWithPassword, createFirstAdmin } from './adminAuth'
import { ClientResponseError, PocketBase } from './pocketbase'

describe('adminAuth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses SDK _superusers auth when available', async () => {
    const client = new PocketBase('http://localhost:8090')
    const authWithPassword = vi.fn().mockResolvedValue({ token: 'sdk-token', record: { id: '1' } })
    client.admins.authWithPassword = authWithPassword

    const result = await adminAuthWithPassword(client, 'admin@example.com', 'secret')

    expect(authWithPassword).toHaveBeenCalledWith('admin@example.com', 'secret')
    expect(result.token).toBe('sdk-token')
  })

  it('falls back to legacy /api/admins on 404', async () => {
    const client = new PocketBase('http://localhost:8090')
    client.admins.authWithPassword = vi
      .fn()
      .mockRejectedValue(new ClientResponseError({ status: 404, message: 'missing' }))
    client.admins.create = vi.fn()

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      url: 'http://localhost:8090/api/admins/auth-with-password',
      json: async () => ({ token: 'legacy-token', admin: { id: 'a1', email: 'admin@example.com' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await adminAuthWithPassword(client, 'admin@example.com', 'secret')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8090/api/admins/auth-with-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identity: 'admin@example.com', password: 'secret' }),
      })
    )
    expect(result.token).toBe('legacy-token')
    expect(client.authStore.token).toBe('legacy-token')
  })

  it('createFirstAdmin falls back to legacy /api/admins on 404', async () => {
    const client = new PocketBase('http://localhost:8090')
    client.admins.create = vi.fn().mockRejectedValue(new ClientResponseError({ status: 404, message: 'missing' }))

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      url: 'http://localhost:8090/api/admins',
      json: async () => ({ id: 'a1', email: 'admin@example.com' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await createFirstAdmin(client, 'admin@example.com', 'secret')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8090/api/admins',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'secret', passwordConfirm: 'secret' }),
      })
    )
    expect(result.email).toBe('admin@example.com')
  })

  it('rethrows non-404 SDK errors', async () => {
    const client = new PocketBase('http://localhost:8090')
    const err = new ClientResponseError({ status: 400, message: 'bad creds' })
    client.admins.authWithPassword = vi.fn().mockRejectedValue(err)

    await expect(adminAuthWithPassword(client, 'admin@example.com', 'wrong')).rejects.toBe(err)
  })
})
