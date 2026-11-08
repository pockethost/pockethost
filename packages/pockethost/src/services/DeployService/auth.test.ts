import { describe, expect, it, vi } from 'vitest'
import { createDeployAuthResolver, DeployAuthError } from './auth'

const pat = `ph_pat_abcdefghij12345_${'A'.repeat(43)}`

describe('createDeployAuthResolver', () => {
  it('verifies PATs and caches for the TTL', async () => {
    let t = 0
    const verifyPat = vi.fn(async () => ({
      tokenId: 'abcdefghij12345',
      userId: 'u1',
      label: 'CI',
      scopes: ['read', 'write'] as ('read' | 'write')[],
      instanceIds: ['i1'],
    }))
    const r = createDeployAuthResolver({ verifyPat, verifyJwt: vi.fn(), now: () => t, ttlMs: 1000 })
    const a = await r.resolve(`Bearer ${pat}`)
    expect(a).toMatchObject({ userId: 'u1', via: 'pat', instanceIds: ['i1'], tokenLabel: 'CI' })
    await r.resolve(`Bearer ${pat}`)
    expect(verifyPat).toHaveBeenCalledTimes(1)
    t = 1001
    await r.resolve(`Bearer ${pat}`)
    expect(verifyPat).toHaveBeenCalledTimes(2)
  })

  it('caches auth failures but not infrastructure errors', async () => {
    const verifyPat = vi.fn(async () => {
      throw new DeployAuthError(401, 'bad')
    })
    const r = createDeployAuthResolver({ verifyPat, verifyJwt: vi.fn() })
    await expect(r.resolve(`Bearer ${pat}`)).rejects.toMatchObject({ status: 401 })
    await expect(r.resolve(`Bearer ${pat}`)).rejects.toMatchObject({ status: 401 })
    expect(verifyPat).toHaveBeenCalledTimes(1)

    const flaky = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const r2 = createDeployAuthResolver({ verifyPat: flaky, verifyJwt: vi.fn() })
    await expect(r2.resolve(`Bearer ${pat}`)).rejects.toThrow('ECONNREFUSED')
    await expect(r2.resolve(`Bearer ${pat}`)).rejects.toThrow('ECONNREFUSED')
    expect(flaky).toHaveBeenCalledTimes(2)
  })

  it('routes non-PAT bearers to JWT verification', async () => {
    const verifyJwt = vi.fn(async () => ({ userId: 'u2' }))
    const r = createDeployAuthResolver({ verifyPat: vi.fn(), verifyJwt })
    expect(await r.resolve('Bearer eyJhbGciOi.x.y')).toMatchObject({ userId: 'u2', via: 'jwt', instanceIds: null })
  })

  it('requires a token', async () => {
    const r = createDeployAuthResolver({ verifyPat: vi.fn(), verifyJwt: vi.fn() })
    await expect(r.resolve(undefined)).rejects.toMatchObject({ status: 401 })
  })
})
