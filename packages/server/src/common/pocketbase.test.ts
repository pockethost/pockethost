import { describe, expect, it } from 'vitest'
import { BaseAuthStore, ClientResponseError, PocketBase } from './pocketbase'

describe('pocketbase re-exports', () => {
  it('exports SDK client and error types', () => {
    expect(PocketBase).toBeTypeOf('function')
    expect(ClientResponseError).toBeTypeOf('function')
    expect(BaseAuthStore).toBeTypeOf('function')
  })

  it('ClientResponseError carries status', () => {
    const err = new ClientResponseError({ status: 404, message: 'Not found' })
    expect(err.status).toBe(404)
    expect(err.isAbort).toBe(false)
  })
})
